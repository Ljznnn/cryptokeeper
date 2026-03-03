import * as crypto from 'crypto'

export interface EncryptionResult {
  encrypted: string // Base64编码的加密数据
  iv: string // Base64编码的IV
}

export interface PasswordStrengthResult {
  score: number // 0-4分
  isValid: boolean
  feedback: {
    suggestions: string[]
    warning: string | null
  }
  details: {
    length: number
    hasUppercase: boolean
    hasLowercase: boolean
    hasNumbers: boolean
    hasSymbols: boolean
    isCommonPassword: boolean
  }
}

// Security logging interface (currently unused but kept for future implementation)
// interface SecurityLogEntry {
//   timestamp: string;
//   eventType: 'ENCRYPTION' | 'DECRYPTION' | 'KEY_DERIVATION' | 'AUTH_ATTEMPT' | 'SECURITY_VIOLATION';
//   success: boolean;
//   details?: any;
//   userId?: string;
// }

export class PasswordCrypto {
  private static instance: PasswordCrypto
  private masterKey: Buffer | null = null // 主密钥
  private encryptionKey: Buffer | null = null // 专用加密密钥
  private authenticationKey: Buffer | null = null // 专用认证密钥
  private salt: string = ''
  private keyDerivationIterations: number = 150000 // 增加迭代次数

  // 私有构造函数，防止外部实例化
  private constructor() {}

  // 获取单例实例
  public static getInstance(): PasswordCrypto {
    if (!PasswordCrypto.instance) {
      PasswordCrypto.instance = new PasswordCrypto()
    }
    return PasswordCrypto.instance
  }

  /**
   * 生成随机盐值
   */
  generateSalt(): string {
    return crypto.randomBytes(32).toString('base64')
  }

  /**
   * 从主密码派生主密钥（HKDF第一阶段）
   * @param masterPassword 用户主密码
   * @param salt 盐值（Base64编码）
   * @param iterations PBKDF2迭代次数
   */
  async deriveMasterKey(
    masterPassword: string,
    salt: string,
    iterations: number = 150000
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      crypto.pbkdf2(
        masterPassword,
        Buffer.from(salt, 'base64'),
        iterations,
        32, // 32字节主密钥
        'sha256',
        (err, derivedKey) => {
          if (err) reject(err)
          else resolve(derivedKey)
        }
      )
    })
  }

  /**
   * 使用HKDF从主密钥派生专用密钥
   * @param masterKey 主密钥
   * @param purpose 用途标识
   * @param length 密钥长度
   */
  private deriveSpecializedKey(masterKey: Buffer, purpose: string, length: number = 32): Buffer {
    return Buffer.from(crypto.hkdfSync('sha256', masterKey, '', purpose, length))
  }

  /**
   * 派生所有专用密钥
   * @param masterKey 主密钥
   */
  private deriveAllKeys(masterKey: Buffer): void {
    this.encryptionKey = this.deriveSpecializedKey(masterKey, 'encryption-key', 32)
    this.authenticationKey = this.deriveSpecializedKey(masterKey, 'authentication-key', 32)
    this.masterKey = masterKey
  }

  /**
   * 计算主密码的认证hash（使用专用认证密钥）
   * @param masterPassword 主密码
   * @param salt 盐值（Base64编码）
   * @param iterations 迭代次数
   */
  async hashMasterPassword(
    masterPassword: string,
    salt: string,
    iterations: number = 150000
  ): Promise<string> {
    try {
      const masterKey = await this.deriveMasterKey(masterPassword, salt, iterations)
      const authKey = this.deriveSpecializedKey(masterKey, 'password-hash-key', 32)

      // 使用认证密钥进行二次哈希
      const hmac = crypto.createHmac('sha256', authKey)
      hmac.update(masterPassword)
      return hmac.digest('base64')
    } catch (error) {
      throw new Error(`密码哈希计算失败: ${error}`)
    }
  }

  /**
   * 初始化整个密钥系统（需要先调用）
   * @param masterPassword 主密码
   * @param salt 盐值（Base64编码）
   */
  async initialize(masterPassword: string, salt: string): Promise<void> {
    try {
      this.salt = salt
      const masterKey = await this.deriveMasterKey(
        masterPassword,
        salt,
        this.keyDerivationIterations
      )
      this.deriveAllKeys(masterKey)
    } catch (error) {
      throw error
    }
  }

  /**
   * 加密文本（使用AES-256-GCM）
   * @param plaintext 明文
   * @returns 加密结果，包含加密数据和IV
   */
  encrypt(plaintext: string): EncryptionResult {
    if (!this.encryptionKey) {
      throw new Error('加密密钥未初始化')
    }

    try {
      // 生成随机IV（初始化向量），GCM推荐使用12字节
      const iv = crypto.randomBytes(12)

      // 使用AES-256-GCM创建加密器
      const cipher = crypto.createCipheriv('aes-256-gcm', this.encryptionKey, iv)

      // 加密数据
      let encrypted = cipher.update(plaintext, 'utf8', 'base64')
      encrypted += cipher.final('base64')

      // 获取认证标签（用于完整性验证）
      const authTag = cipher.getAuthTag()

      // 将IV和认证标签组合存储（IV在前，authTag在后）
      const ivWithAuthTag = Buffer.concat([iv, authTag])

      return {
        encrypted,
        iv: ivWithAuthTag.toString('base64')
      }
    } catch (error) {
      throw new Error(`加密失败: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * 解密文本
   * @param encryptedData Base64编码的加密数据
   * @param ivWithAuthTag Base64编码的IV和认证标签组合
   * @returns 解密后的明文
   */
  decrypt(encryptedData: string, ivWithAuthTag: string): string {
    if (!this.encryptionKey) {
      throw new Error('解密密钥未初始化')
    }

    try {
      // 从Base64解码IV和认证标签
      const ivWithAuthTagBuffer = Buffer.from(ivWithAuthTag, 'base64')

      // 检查长度是否足够（12字节IV + 16字节authTag = 28字节）
      if (ivWithAuthTagBuffer.length < 28) {
        throw new Error('无效的IV和认证标签长度')
      }

      const iv = ivWithAuthTagBuffer.subarray(0, 12) // 前12字节是IV
      const authTag = ivWithAuthTagBuffer.subarray(12) // 剩余的是认证标签

      // 使用AES-256-GCM创建解密器
      const decipher = crypto.createDecipheriv('aes-256-gcm', this.encryptionKey, iv)
      decipher.setAuthTag(authTag)

      // 解密数据
      let decrypted = decipher.update(encryptedData, 'base64', 'utf8')
      decrypted += decipher.final('utf8')

      return decrypted
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`解密失败: ${error.message}`)
      }
      throw new Error('解密失败: 未知错误')
    }
  }

  /**
   * 验证主密码（恒定时间比较，防止时序攻击）
   * @param inputPassword 输入的主密码
   * @param storedHash 存储的hash（Base64编码）
   * @param salt 盐值（Base64编码）
   */
  async verifyMasterPassword(
    inputPassword: string,
    storedHash: string,
    salt: string
  ): Promise<boolean> {
    try {
      const testHash = await this.hashMasterPassword(inputPassword, salt)

      // 使用恒定时间比较，防止时序攻击
      const isValid = crypto.timingSafeEqual(
        Buffer.from(testHash, 'base64'),
        Buffer.from(storedHash, 'base64')
      )

      return isValid
    } catch (error) {
      return false
    }
  }

  /**
   * 生成强随机密码
   * @param length 密码长度
   * @param options 生成选项
   */
  generateRandomPassword(
    length: number = 16,
    options: {
      includeNumbers?: boolean
      includeSymbols?: boolean
      includeUppercase?: boolean
      includeLowercase?: boolean
    } = {}
  ): string {
    const {
      includeNumbers = true,
      includeSymbols = true,
      includeUppercase = true,
      includeLowercase = true
    } = options

    const numbers = '0123456789'
    const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?'
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
    const lowercase = 'abcdefghijklmnopqrstuvwxyz'

    let charset = ''
    if (includeNumbers) charset += numbers
    if (includeSymbols) charset += symbols
    if (includeUppercase) charset += uppercase
    if (includeLowercase) charset += lowercase

    if (charset.length === 0) {
      throw new Error('至少选择一个字符集')
    }

    let password = ''
    for (let i = 0; i < length; i++) {
      const randomIndex = crypto.randomInt(0, charset.length)
      password += charset[randomIndex]
    }

    return password
  }

  /**
   * 评估密码强度
   * @param password 待评估的密码
   */
  evaluatePasswordStrength(password: string): PasswordStrengthResult {
    const result: PasswordStrengthResult = {
      score: 0,
      isValid: false,
      feedback: {
        suggestions: [],
        warning: null
      },
      details: {
        length: password.length,
        hasUppercase: /[A-Z]/.test(password),
        hasLowercase: /[a-z]/.test(password),
        hasNumbers: /\d/.test(password),
        hasSymbols: /[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password),
        isCommonPassword: this.isCommonPassword(password)
      }
    }

    // 长度检查
    if (password.length < 8) {
      result.feedback.warning = '密码长度至少8位'
    } else if (password.length >= 16) {
      result.score += 2
    } else if (password.length >= 12) {
      result.score += 1
    }

    // 字符类型多样性
    const charTypes = [
      result.details.hasUppercase,
      result.details.hasLowercase,
      result.details.hasNumbers,
      result.details.hasSymbols
    ]

    const diversityScore = charTypes.filter(Boolean).length
    result.score += Math.min(diversityScore - 1, 2) // 最多加2分

    // 常见密码检查
    if (result.details.isCommonPassword) {
      result.feedback.warning = '这是一个常见的弱密码'
      result.score = Math.max(0, result.score - 2)
    }

    // 连续字符检查
    if (/(.)\1{2,}/.test(password)) {
      result.feedback.suggestions.push('避免使用连续重复字符')
      result.score = Math.max(0, result.score - 1)
    }

    // 键盘序列检查
    const keyboardPatterns = ['qwerty', 'asdf', '1234', 'abcd']
    for (const pattern of keyboardPatterns) {
      if (password.toLowerCase().includes(pattern)) {
        result.feedback.suggestions.push('避免使用键盘序列')
        result.score = Math.max(0, result.score - 1)
        break
      }
    }
    // 评分转换为等级
    result.isValid = result.score >= 3

    // 提供改进建议
    if (!result.details.hasUppercase) {
      result.feedback.suggestions.push('添加大写字母')
    }
    if (!result.details.hasLowercase) {
      result.feedback.suggestions.push('添加小写字母')
    }
    if (!result.details.hasNumbers) {
      result.feedback.suggestions.push('添加数字')
    }
    if (!result.details.hasSymbols) {
      result.feedback.suggestions.push('添加特殊符号')
    }
    if (password.length < 12) {
      result.feedback.suggestions.push('增加密码长度至12位以上')
    }

    return result
  }

  /**
   * 检查是否为常见弱密码
   * @param password 密码
   */
  private isCommonPassword(password: string): boolean {
    const commonPasswords = [
      '123456',
      'password',
      '123456789',
      '12345678',
      '12345',
      '1234567',
      '1234567890',
      'qwerty',
      'abc123',
      '111111',
      'admin',
      'letmein',
      'welcome',
      'monkey',
      'dragon',
      'passw0rd',
      'master',
      'hello',
      'login',
      'princess'
    ]

    return commonPasswords.includes(password.toLowerCase())
  }

  /**
   * 清除内存中的密钥
   */
  clear(): void {
    try {
      // 安全地清除所有密钥
      const keysToClear = [this.masterKey, this.encryptionKey, this.authenticationKey]

      for (const key of keysToClear) {
        if (key) {
          this.secureClearBuffer(key)
        }
      }

      this.masterKey = null
      this.encryptionKey = null
      this.authenticationKey = null
      this.salt = ''
    } catch (error) {}
  }

  /**
   * 安全清除Buffer内容
   * @param buffer 要清除的Buffer
   */
  private secureClearBuffer(buffer: Buffer): void {
    if (buffer && buffer.length > 0) {
      buffer.fill(0)
      // 尝试强制垃圾回收
      if (typeof global !== 'undefined' && global.gc) {
        global.gc()
      }
    }
  }

  /**
   * 获取密钥状态
   */
  getStatus(): {
    initialized: boolean
    hasSalt: boolean
    hasMasterKey: boolean
    hasEncryptionKey: boolean
    hasAuthenticationKey: boolean
    keyDerivationIterations: number
  } {
    return {
      initialized: this.encryptionKey !== null,
      hasSalt: this.salt.length > 0,
      hasMasterKey: this.masterKey !== null,
      hasEncryptionKey: this.encryptionKey !== null,
      hasAuthenticationKey: this.authenticationKey !== null,
      keyDerivationIterations: this.keyDerivationIterations
    }
  }

  /**
   * 将字符串格式化为中间部分用星号隐藏的格式
   * @param str 原始字符串
   * @param visiblePrefix 开头可见字符数（默认2个）
   * @param visibleSuffix 结尾可见字符数（默认2个）
   * @returns 格式化后的字符串，如 "a121****123"
   */
  maskPassword(str: string, visiblePrefix: number = 2, visibleSuffix: number = 2): string {
    // 如果字符串为空或太短，直接返回原字符串或全隐藏
    if (!str || str.length === 0) return str

    const totalLength = str.length

    // 如果字符串太短，无法按指定长度隐藏
    if (totalLength <= visiblePrefix + visibleSuffix) {
      // 可以根据需求调整这里的行为
      // 例如：只显示第一位，其余隐藏
      const firstChar = str.charAt(0)
      const maskedPart = '*'.repeat(Math.max(totalLength - 1, 1))
      return firstChar + maskedPart
    }

    // 提取开头和结尾的可见部分
    const prefix = str.substring(0, visiblePrefix)
    const suffix = str.substring(totalLength - visibleSuffix)

    // 计算中间需要隐藏的部分长度
    //const hiddenLength = totalLength - visiblePrefix - visibleSuffix;
    //const maskedPart = '*'.repeat(hiddenLength);
    const maskedPart = '****'

    return prefix + maskedPart + suffix
  }
}

export const passwordCrypto = PasswordCrypto.getInstance()

// 示例：完整的加解密流程
export async function demo() {
  const crypto = PasswordCrypto.getInstance()

  // 1. 生成盐值（只需在首次设置主密码时生成）
  const salt = crypto.generateSalt()
  console.log('生成的盐值:', salt.substring(0, 16) + '...')

  // 2. 用户设置主密码
  const masterPassword = 'MySecureMasterPassword123!'

  // 3. 计算主密码的hash（用于存储和验证）
  const masterKeyHash = await crypto.hashMasterPassword(masterPassword, salt)
  console.log('主密码hash:', masterKeyHash.substring(0, 16) + '...')

  // 4. 初始化加密密钥
  await crypto.initialize(masterPassword, salt)
  console.log('密钥初始化状态:', crypto.getStatus())

  // 5. 加密用户密码
  const userPassword = 'UserPassword123!'
  const encryptedResult: EncryptionResult = crypto.encrypt(userPassword)
  console.log('加密结果:')
  console.log('  密文:', encryptedResult.encrypted.substring(0, 16) + '...')
  console.log('  IV:', encryptedResult.iv.substring(0, 16) + '...')

  // 6. 解密用户密码
  const decryptedPassword = crypto.decrypt(encryptedResult.encrypted, encryptedResult.iv)
  console.log('解密后的密码:', decryptedPassword)
  console.log('密码匹配:', decryptedPassword === userPassword)

  // 7. 验证主密码（用于重新登录）
  const testPassword1 = 'MySecureMasterPassword123!'
  const testPassword2 = 'WrongPassword'

  const verifyResult1 = await crypto.verifyMasterPassword(testPassword1, masterKeyHash, salt)
  const verifyResult2 = await crypto.verifyMasterPassword(testPassword2, masterKeyHash, salt)

  console.log('\n主密码验证结果:')
  console.log('  正确密码验证:', verifyResult1) // true
  console.log('  错误密码验证:', verifyResult2) // false

  // 8. 生成随机密码
  const randomPassword = crypto.generateRandomPassword(20, {
    includeNumbers: true,
    includeSymbols: true,
    includeUppercase: true,
    includeLowercase: true
  })
  console.log('\n生成的随机密码:', randomPassword)

  // 9. 安全清除密钥
  crypto.clear()
  console.log('\n清理后的状态:', crypto.getStatus())
}
