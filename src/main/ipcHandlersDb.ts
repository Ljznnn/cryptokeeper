import { ipcMain, shell } from 'electron'
import { dbManager } from './data/DatabaseManager'
import * as Types from '../renderer/src/models/types'
import { PasswordCrypto } from '../renderer/src/utils/cryptoUtils'

// 初始化数据
export async function initializeData() {
  try {
    console.log('Initializing database...')
    await dbManager.initialize()
    console.log('Database initialized successfully')
  } catch (error) {
    console.error('Failed to initialize database:', error)
    throw error
  }
}

// 设置IPC处理程序
export function setupIPCHandlers() {
  console.log('Setting up IPC handlers...')

  // 主密码相关
  ipcMain.handle('has-master-password', async () => {
    return await dbManager.hasMasterPassword()
  })

  ipcMain.handle('verify-master-password', async (_event, password) => {
    const result = await verifyMasterPassword(password)
    return result.success
  })

  ipcMain.handle('set-master-password', async (_event, password) => {
    return await setMasterPassword(password)
  })

  ipcMain.handle('change-master-password', async (_event, oldPassword, newPassword) => {
    return await changeMasterPassword(oldPassword, newPassword)
  })

  ipcMain.handle('reencrypt-all-passwords', async () => {
    return await reencryptAllPasswords()
  })

  // 空间相关
  ipcMain.handle('get-spaces', async () => {
    return await getSpaces()
  })

  ipcMain.handle('create-space', async (_event, name, desc) => {
    return await createSpace(name, desc)
  })

  ipcMain.handle('delete-space', async (_event, spaceId) => {
    return await deleteSpace(spaceId)
  })

  // 密码本相关
  ipcMain.handle('get-password-book', async (_event, spaceId) => {
    return await getPasswordBooks(spaceId)
  })

  ipcMain.handle('create-password-book', async (_event, name, spaceId, desc) => {
    return await createPasswordBook(name, spaceId, desc)
  })

  ipcMain.handle('update-password-book', async (_event, bookId, name, desc) => {
    return await updatePasswordBook(bookId, name, desc)
  })

  ipcMain.handle('delete-password-book', async (_event, spaceId, bookId) => {
    return await deletePasswordBook(spaceId, bookId)
  })

  // 密码相关
  ipcMain.handle('get-passwords', async (_event, spaceId, bookId) => {
    return await getPasswords(spaceId, bookId)
  })

  ipcMain.handle('create-password', async (_event, passwordData, spaceId, bookId) => {
    return await createPassword(passwordData, spaceId, bookId)
  })

  ipcMain.handle('update-password', async (_event, spaceId, bookId, passwordData) => {
    return await updatePassword(spaceId, bookId, passwordData)
  })

  ipcMain.handle('delete-password', async (_event, spaceId, bookId, id) => {
    return await deletePassword(spaceId, bookId, id)
  })

  ipcMain.handle(
    'update-password-sort',
    async (_event, spaceId, bookId, passwordId, newSortOrder) => {
      return await updatePasswordSortOrder(spaceId, bookId, passwordId, newSortOrder)
    }
  )

  ipcMain.handle('batch-update-password-sort', async (_event, spaceId, bookId, sortOrders) => {
    return await batchUpdatePasswordSortOrder(spaceId, bookId, sortOrders)
  })

  ipcMain.handle('open-external', (_event, url) => {
    return openExternal(url)
  })

  ipcMain.handle('decrypt-password', (_event, password, iv) => {
    return decryptPassword(password, iv)
  })

  // 设置相关
  ipcMain.handle('get-settings', async () => {
    return await getSettings()
  })

  ipcMain.handle('save-settings', async (_event, settings) => {
    return await saveSettings(settings)
  })

  ipcMain.handle('get-stats', async () => {
    return await getStats()
  })
}

// 验证主密码
async function verifyMasterPassword(password: string) {
  try {
    const masterPasswordData = await dbManager.getMasterPassword()

    // 如果还没有设置主密码
    if (!masterPasswordData) {
      return { success: false, hasMasterPassword: false }
    }
    // 初始化加密工具（使用用户输入的密码和存储的盐值）
    await PasswordCrypto.getInstance().initialize(password, masterPasswordData.salt)
    // 验证密码
    const success = await PasswordCrypto.getInstance().verifyMasterPassword(
      password,
      masterPasswordData.hash,
      masterPasswordData.salt
    )

    return { success, hasMasterPassword: true }
  } catch (error) {
    console.error('Error verifying master password:', error)
    return { success: false, message: '验证主密码时发生错误' }
  }
}

// 设置主密码
async function setMasterPassword(password: string) {
  if (!password) {
    return { success: false, message: '密码不能为空' }
  }

  try {
    const crypto = PasswordCrypto.getInstance()
    // 生成盐值
    const salt = crypto.generateSalt()
    // 计算主密码的hash
    const hash = await crypto.hashMasterPassword(password, salt)

    // 保存到数据库
    await dbManager.saveMasterPassword(hash, salt)
    // 初始化加密工具（使用用户输入的密码和新生成的盐值）
    await PasswordCrypto.getInstance().initialize(password, salt)

    return { success: true, message: '主密码设置成功' }
  } catch (error) {
    console.error('Error setting master password:', error)
    return { success: false, message: '设置主密码失败' }
  }
}

// 重新加密所有密码数据
async function reencryptAllPasswords(decryptedPasswords?: Array<{
  id: string
  book_id: string
  username: string
  password: string
  url: string
  description: string
}>): Promise<{ success: boolean; message: string; reencryptedCount?: number }> {
  try {
    // 如果提供了解密后的密码数据，直接使用
    // 否则从数据库获取并解密
    let passwordsToReencrypt: Array<{
      id: string
      book_id: string
      username: string
      password: string
      url: string
      description: string
    }> = []

    const crypto = PasswordCrypto.getInstance()

    if (decryptedPasswords && decryptedPasswords.length > 0) {
      passwordsToReencrypt = decryptedPasswords
    } else {
      // 从数据库获取所有密码数据
      const allPasswords = await dbManager.getAllPasswordsForReencryption()
      
      // 解密所有密码（使用当前已初始化的密钥）
      for (const passwordData of allPasswords) {
        try {
          const decryptedPassword = crypto.decrypt(passwordData.password_encrypted, passwordData.iv)
          passwordsToReencrypt.push({
            id: passwordData.id,
            book_id: passwordData.book_id,
            username: passwordData.username,
            password: decryptedPassword,
            url: passwordData.url,
            description: passwordData.description
          })
        } catch (error) {
          console.error(`Failed to decrypt password ${passwordData.id}:`, error)
          return { success: false, message: `解密密码数据失败: ${passwordData.id}` }
        }
      }
    }

    // 重新加密（使用当前已初始化的密钥）
    const reencryptedData: Array<{
      id: string
      password_encrypted: string
      iv: string
      masked_password: string
    }> = []

    for (const decryptedData of passwordsToReencrypt) {
      try {
        const reencrypted = crypto.encrypt(decryptedData.password)
        const newMasked = crypto.maskPassword(decryptedData.password)

        reencryptedData.push({
          id: decryptedData.id,
          password_encrypted: reencrypted.encrypted,
          iv: reencrypted.iv,
          masked_password: newMasked
        })
      } catch (error) {
        console.error(`Failed to reencrypt password ${decryptedData.id}:`, error)
        return { success: false, message: `重新加密密码失败: ${decryptedData.id}` }
      }
    }

    // 批量更新数据库
    const updateResult = await dbManager.batchUpdatePasswordEncryption(reencryptedData)
    if (!updateResult) {
      return { success: false, message: '数据库更新失败' }
    }

    return { 
      success: true, 
      message: `所有密码重新加密成功，共 ${passwordsToReencrypt.length} 个`,
      reencryptedCount: passwordsToReencrypt.length
    }
  } catch (error) {
    console.error('Error reencrypting all passwords:', error)
    return { success: false, message: '重新加密所有密码失败' }
  }
}

// 修改主密码
async function changeMasterPassword(oldPassword: string, newPassword: string) {
  if (!oldPassword || !newPassword) {
    return { success: false, message: '旧密码和新密码都不能为空' }
  }

  try {
    // 验证旧密码（这会使用旧密码初始化加密工具）
    const verificationResult = await verifyMasterPassword(oldPassword)
    if (!verificationResult.success) {
      return { success: false, message: '旧密码验证失败' }
    }

    // 第一步：使用旧密钥解密所有密码并保存
    // 我们需要先获取所有密码数据并解密，以便在新密钥设置后重新加密
    const allPasswords = await dbManager.getAllPasswordsForReencryption()
    const decryptedPasswords: Array<{
      id: string
      book_id: string
      username: string
      password: string
      url: string
      description: string
    }> = []

    const oldCrypto = PasswordCrypto.getInstance()
    for (const passwordData of allPasswords) {
      try {
        const decryptedPassword = oldCrypto.decrypt(passwordData.password_encrypted, passwordData.iv)
        decryptedPasswords.push({
          id: passwordData.id,
          book_id: passwordData.book_id,
          username: passwordData.username,
          password: decryptedPassword,
          url: passwordData.url,
          description: passwordData.description
        })
      } catch (error) {
        console.error(`Failed to decrypt password ${passwordData.id}:`, error)
        return { success: false, message: `解密密码数据失败: ${passwordData.id}` }
      }
    }

    // 第二步：设置新密码（这会使用新密码初始化加密工具）
    const setPasswordResult = await setMasterPassword(newPassword)
    if (!setPasswordResult.success) {
      return setPasswordResult
    }

    // 第三步：使用新密钥重新加密所有密码
    // 现在调用 reencryptAllPasswords 方法来完成重新加密
    // 注意：reencryptAllPasswords 会使用当前已初始化的新密钥
    const reencryptionResult = await reencryptAllPasswords(decryptedPasswords)
    if (!reencryptionResult.success) {
      return reencryptionResult
    }

    return { 
      success: true, 
      message: `主密码修改成功，所有 ${reencryptionResult.reencryptedCount || 0} 个密码已重新加密`,
      reencryptedCount: reencryptionResult.reencryptedCount
    }
  } catch (error) {
    console.error('Error changing master password:', error)
    return { success: false, message: '修改主密码失败' }
  }
}

// 获取空间列表
async function getSpaces() {
  try {
    const spaces = await dbManager.getSpaces()
    return spaces.map((space) => ({
      id: space.id,
      name: space.name,
      desc: space.desc
    }))
  } catch (error) {
    console.error('Error getting spaces:', error)
    return []
  }
}

// 创建空间
async function createSpace(name: string, desc: string) {
  if (!name) {
    return { success: false, message: '空间名称不能为空' }
  }

  try {
    const newSpace = await dbManager.createSpace(name, desc || '')
    return { success: true, space: newSpace }
  } catch (error) {
    console.error('Error creating space:', error)
    return { success: false, message: '创建空间失败' }
  }
}

// 删除空间
async function deleteSpace(spaceId: string) {
  try {
    const success = await dbManager.deleteSpace(spaceId)
    if (success) {
      return { success: true, message: '空间已删除' }
    } else {
      return { success: false, message: '空间不存在' }
    }
  } catch (error) {
    console.error('Error deleting space:', error)
    return { success: false, message: '删除空间失败' }
  }
}

// 获取空间下的所有密码本
async function getPasswordBooks(spaceId: string) {
  try {
    const spaces = await dbManager.getSpaces()
    const space = spaces.find((s) => s.id === spaceId)

    if (!space) {
      return { success: false, message: '空间不存在' }
    }

    const books = space.pwBooks || []
    return {
      success: true,
      data: books.map((book) => ({ id: book.id, name: book.name, desc: book.desc }))
    }
  } catch (error) {
    console.error('Error getting password books:', error)
    return { success: false, message: '获取密码本失败' }
  }
}

// 创建密码本
async function createPasswordBook(name: string, spaceId: string, desc: string) {
  if (!name) {
    return { success: false, message: '密码本名称不能为空' }
  }

  try {
    // 检查空间是否存在
    const space = await dbManager.getSpaceById(spaceId)
    if (!space) {
      return { success: false, message: '空间不存在' }
    }

    const newBook = await dbManager.createPasswordBook(name, spaceId, desc || '')
    return { success: true, book: newBook }
  } catch (error) {
    console.error('Error creating password book:', error)
    return { success: false, message: '创建密码本失败' }
  }
}

// 删除密码本
async function deletePasswordBook(spaceId: string, bookId: string) {
  try {
    // 检查空间是否存在
    const space = await dbManager.getSpaceById(spaceId)
    if (!space) {
      return { success: false, message: '空间不存在' }
    }

    // 检查密码本是否存在
    const books = space.pwBooks || []
    const book = books.find((b) => b.id === bookId)
    if (!book) {
      return { success: false, message: '密码本不存在' }
    }

    const success = await dbManager.deletePasswordBook(bookId)
    if (success) {
      return { success: true, message: '密码本已删除' }
    } else {
      return { success: false, message: '删除密码本失败' }
    }
  } catch (error) {
    console.error('Error deleting password book:', error)
    return { success: false, message: '删除密码本失败' }
  }
}

// 更新密码本
async function updatePasswordBook(bookId: string, name: string, desc: string) {
  if (!name) {
    return { success: false, message: '密码本名称不能为空' }
  }

  try {
    const updatedBook = await dbManager.updatePasswordBook(bookId, name, desc || '')
    return { success: true, book: updatedBook }
  } catch (error) {
    console.error('Error updating password book:', error)
    return { success: false, message: '更新密码本失败' }
  }
}

// 获取密码列表
async function getPasswords(spaceId: string, bookId: string) {
  try {
    // 检查空间是否存在
    const space = await dbManager.getSpaceById(spaceId)
    if (!space) {
      return { success: false, message: '空间不存在' }
    }

    // 检查密码本是否存在
    const books = space.pwBooks || []
    const book = books.find((b) => b.id === bookId)
    if (!book) {
      return { success: false, message: '密码本不存在' }
    }

    // 获取密码列表
    const passwords = dbManager.getPasswordsByBookId(bookId)
    return { success: true, data: passwords }
  } catch (error) {
    console.error('Error getting passwords:', error)
    return { success: false, message: '获取密码失败' }
  }
}

// 创建密码
async function createPassword(passwordData: Types.Password, spaceId: string, bookId: string) {
  const { username, password, url, desc } = passwordData

  try {
    // 检查空间是否存在
    const space = await dbManager.getSpaceById(spaceId)
    if (!space) {
      return { success: false, message: '空间不存在' }
    }

    // 检查密码本是否存在
    const books = space.pwBooks || []
    const book = books.find((b) => b.id === bookId)
    if (!book) {
      return { success: false, message: '密码本不存在' }
    }

    const newPassword = await dbManager.createPassword(
      username || '',
      password,
      bookId,
      url || '',
      desc || ''
    )

    return { success: true, password: newPassword }
  } catch (error) {
    console.error('Error creating password:', error)
    return { success: false, message: '创建密码失败' }
  }
}

// 更新密码
async function updatePassword(spaceId: string, bookId: string, passwordData: Types.Password) {
  const { id, username, password, url, desc } = passwordData

  try {
    // 检查空间是否存在
    const space = await dbManager.getSpaceById(spaceId)
    if (!space) {
      return { success: false, message: '空间不存在' }
    }

    // 检查密码本是否存在
    const books = space.pwBooks || []
    const book = books.find((b) => b.id === bookId)
    if (!book) {
      return { success: false, message: '密码本不存在' }
    }

    const updatedPassword = await dbManager.updatePassword(
      id,
      username || '',
      password,
      url || '',
      desc || ''
    )

    return { success: true, password: updatedPassword }
  } catch (error) {
    console.error('Error updating password:', error)
    return { success: false, message: '更新密码失败' }
  }
}

// 删除密码
async function deletePassword(spaceId: string, bookId: string, id: string) {
  try {
    // 检查空间是否存在
    const space = await dbManager.getSpaceById(spaceId)
    if (!space) {
      return { success: false, message: '空间不存在' }
    }

    // 检查密码本是否存在
    const books = space.pwBooks || []
    const book = books.find((b) => b.id === bookId)
    if (!book) {
      return { success: false, message: '密码本不存在' }
    }

    const success = await dbManager.deletePassword(id)
    if (success) {
      return { success: true, message: '密码项已删除' }
    } else {
      return { success: false, message: '密码项不存在' }
    }
  } catch (error) {
    console.error('Error deleting password:', error)
    return { success: false, message: '删除密码失败' }
  }
}

// 更新单个密码排序
async function updatePasswordSortOrder(
  spaceId: string,
  bookId: string,
  passwordId: string,
  newSortOrder: number
) {
  try {
    // 检查空间是否存在
    const space = await dbManager.getSpaceById(spaceId)
    if (!space) {
      return { success: false, message: '空间不存在' }
    }

    // 检查密码本是否存在
    const books = space.pwBooks || []
    const book = books.find((b) => b.id === bookId)
    if (!book) {
      return { success: false, message: '密码本不存在' }
    }

    const success = await dbManager.updatePasswordSortOrder(passwordId, newSortOrder)
    if (success) {
      return { success: true, message: '排序更新成功' }
    } else {
      return { success: false, message: '排序更新失败' }
    }
  } catch (error) {
    console.error('Error updating password sort order:', error)
    return { success: false, message: '更新排序失败' }
  }
}

// 批量更新密码排序
async function batchUpdatePasswordSortOrder(
  spaceId: string,
  bookId: string,
  sortOrders: { id: string; sortOrder: number }[]
) {
  try {
    // 检查空间是否存在
    const space = await dbManager.getSpaceById(spaceId)
    if (!space) {
      console.log('space_not_found_', spaceId)
      return { success: false, message: '空间不存在' }
    }

    // 检查密码本是否存在
    const books = space.pwBooks || []
    const book = books.find((b) => b.id === bookId)
    if (!book) {
      return { success: false, message: '密码本不存在' }
    }

    const success = await dbManager.batchUpdatePasswordSortOrder(sortOrders)
    if (success) {
      return { success: true, message: '排序批量更新成功' }
    } else {
      return { success: false, message: '排序批量更新失败' }
    }
  } catch (error) {
    console.error('Error batch updating password sort order:', error)
    return { success: false, message: '批量更新排序失败' }
  }
}

// 打开外部链接
function openExternal(url: string) {
  try {
    if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
      shell.openExternal(url)
      return { success: true }
    } else {
      return { success: false, message: '无效的URL' }
    }
  } catch (error) {
    return { success: false, message: '无法打开链接' }
  }
}

// 解密密码
async function decryptPassword(encryptedPassword: string, iv: string) {
  try {
    const decrypted = PasswordCrypto.getInstance().decrypt(encryptedPassword, iv)
    return { success: true, password: decrypted }
  } catch (err) {
    return { success: false, message: (err as Error).message }
  }
}

// 获取设置
async function getSettings() {
  try {
    const settings = await dbManager.getSetting()
    return settings || {}
  } catch (error) {
    console.error('Error getting settings:', error)
    return {}
  }
}

// 保存设置
async function saveSettings(settings: Types.Settings) {
  try {
    for (const [key, value] of Object.entries(settings)) {
      await dbManager.saveSetting(key, value)
    }

    return { success: true }
  } catch (error) {
    console.error('Error saving settings:', error)
    return { success: false, message: '保存设置失败' }
  }
}

// 获取统计数据
async function getStats() {
  try {
    const stats = await dbManager.getStats()
    return { success: true, data: stats }
  } catch (error) {
    console.error('Error getting stats:', error)
    return { success: false, message: '获取统计数据失败' }
  }
}
