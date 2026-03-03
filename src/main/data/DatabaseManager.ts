import { app } from 'electron'
import * as path from 'path'
import * as Types from '../../renderer/src/models/types'
import { PasswordStatus } from '../../renderer/src/constants/enums'
import { PasswordCrypto } from '../../renderer/src/utils/cryptoUtils'
import { randomUUID } from 'crypto'

export class DatabaseManager {
  private db: any = null // 使用 any 类型直到 better-sqlite3 安装
  private readonly dbPath: string

  constructor() {
    // 使用应用用户数据目录
    const userDataPath = path.join(app.getPath('userData'), 'data')
    this.dbPath = path.join(userDataPath, import.meta.env.VITE_DB_FILE_NAME)
  }

  /**
   * 初始化数据库连接和表结构
   */
  public async initialize(): Promise<void> {
    try {
      // 动态导入 better-sqlite3 - 注意：这将在安装依赖后生效
      const sqlite3 = await import('better-sqlite3')
      this.db = new sqlite3.default(this.dbPath)

      // 启用外键约束
      this.db.exec('PRAGMA foreign_keys = ON;')

      // 创建表结构
      await this.createTables()

      console.log('Database initialized successfully at:', this.dbPath)
    } catch (error) {
      console.error('Failed to initialize database:', error)
      throw error
    }
  }

  /**
   * 创建数据库表结构
   */
  private async createTables(): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized')
    }

    // 创建 spaces 表
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS spaces (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // 创建 password_books 表
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS password_books (
        id TEXT PRIMARY KEY,
        space_id TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (space_id) REFERENCES spaces(id) ON DELETE CASCADE
      )
    `)

    // 创建 passwords 表
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS passwords (
        id TEXT PRIMARY KEY,
        book_id TEXT NOT NULL,
        username TEXT NOT NULL,
        password_encrypted TEXT NOT NULL,
        iv TEXT NOT NULL,
        masked_password TEXT NOT NULL,
        url TEXT,
        description TEXT,
        sort_order INTEGER DEFAULT 0,
        status INTEGER DEFAULT ${PasswordStatus.ACTIVE},
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (book_id) REFERENCES password_books(id) ON DELETE CASCADE
      )
    `)

    // 创建 settings 表
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT
      )
    `)

    console.log('Database tables created successfully')
  }

  /**
   * 关闭数据库连接
   */
  public async close(): Promise<void> {
    if (this.db) {
      this.db.close()
    }
  }

  /**
   * 获取数据库实例
   */
  public getDatabase(): any {
    if (!this.db) {
      throw new Error('Database not initialized')
    }
    return this.db
  }

  // ==================== 空间相关操作 ====================

  /**
   * 获取所有空间
   */
  public async getSpaces(): Promise<Types.Space[]> {
    if (!this.db) {
      throw new Error('Database not initialized')
    }

    const stmt = this.db.prepare(`
      SELECT id, name, description as "desc", created_at as createTime
      FROM spaces
      ORDER BY created_at ASC
    `)

    const rows = stmt.all()

    // 转换为 Types.Space 格式并包含密码本
    const spaces: Types.Space[] = []
    for (const row of rows) {
      const space: Types.Space = {
        id: row.id,
        name: row.name,
        desc: row.desc,
        createTime: row.createTime,
        pwBooks: await this.getPasswordBooksBySpaceId(row.id)
      }
      spaces.push(space)
    }

    return spaces
  }

  /**
   * 根据ID获取空间
   */
  public async getSpaceById(spaceId: string): Promise<Types.Space | null> {
    if (!this.db) {
      throw new Error('Database not initialized')
    }

    const stmt = this.db.prepare(`
      SELECT id, name, description as "desc", created_at as createTime
      FROM spaces
      WHERE id = ?
    `)

    const row = stmt.get(spaceId)

    if (!row) {
      return null
    }

    return {
      id: row.id,
      name: row.name,
      desc: row.desc,
      createTime: row.createTime,
      pwBooks: await this.getPasswordBooksBySpaceId(row.id)
    }
  }

  /**
   * 创建新空间
   */
  public async createSpace(name: string, description: string): Promise<Types.Space> {
    if (!this.db) {
      throw new Error('Database not initialized')
    }

    const id = randomUUID()
    const stmt = this.db.prepare(`
      INSERT INTO spaces (id, name, description)
      VALUES (?, ?, ?)
    `)

    stmt.run(id, name, description)

    return {
      id,
      name,
      desc: description,
      createTime: new Date().toLocaleString(),
      pwBooks: []
    }
  }

  /**
   * 删除空间
   */
  public async deleteSpace(spaceId: string): Promise<boolean> {
    if (!this.db) {
      throw new Error('Database not initialized')
    }

    const stmt = this.db.prepare(`DELETE FROM spaces WHERE id = ?`)
    const result = stmt.run(spaceId)

    return result.changes > 0
  }

  // ==================== 密码本相关操作 ====================

  /**
   * 根据空间ID获取密码本
   */
  public async getPasswordBooksBySpaceId(spaceId: string): Promise<Types.PasswordBook[]> {
    if (!this.db) {
      throw new Error('Database not initialized')
    }

    const stmt = this.db.prepare(`
      SELECT id, name, description as "desc", created_at as createTime
      FROM password_books
      WHERE space_id = ?
      ORDER BY created_at ASC
    `)

    const rows = stmt.all(spaceId)

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      desc: row.desc,
      createTime: row.createTime,
      pws: this.getPasswordsByBookId(row.id)
    }))
  }

  /**
   * 创建密码本
   */
  public async createPasswordBook(
    name: string,
    spaceId: string,
    description: string
  ): Promise<Types.PasswordBook> {
    if (!this.db) {
      throw new Error('Database not initialized')
    }

    // 验证空间是否存在
    const spaceStmt = this.db.prepare(`SELECT id FROM spaces WHERE id = ?`)
    const space = spaceStmt.get(spaceId)
    if (!space) {
      throw new Error('Space does not exist')
    }

    const id = randomUUID()
    const stmt = this.db.prepare(`
      INSERT INTO password_books (id, space_id, name, description)
      VALUES (?, ?, ?, ?)
    `)

    stmt.run(id, spaceId, name, description)

    return {
      id,
      name,
      desc: description,
      createTime: new Date().toLocaleString(),
      pws: []
    }
  }

  /**
   * 删除密码本
   */
  public async deletePasswordBook(bookId: string): Promise<boolean> {
    if (!this.db) {
      throw new Error('Database not initialized')
    }

    const stmt = this.db.prepare(`DELETE FROM password_books WHERE id = ?`)
    const result = stmt.run(bookId)

    return result.changes > 0
  }

  /**
   * 更新密码本
   */
  public async updatePasswordBook(
    bookId: string,
    name: string,
    description: string
  ): Promise<Types.PasswordBook> {
    if (!this.db) {
      throw new Error('Database not initialized')
    }

    // 验证密码本是否存在
    const bookStmt = this.db.prepare(`SELECT id, created_at FROM password_books WHERE id = ?`)
    const book = bookStmt.get(bookId)
    if (!book) {
      throw new Error('Password book does not exist')
    }

    const stmt = this.db.prepare(`
      UPDATE password_books
      SET name = ?, description = ?
      WHERE id = ?
    `)

    stmt.run(name, description, bookId)

    return {
      id: bookId,
      name,
      desc: description,
      createTime: book.created_at,
      pws: this.getPasswordsByBookId(bookId)
    }
  }

  // ==================== 密码相关操作 ====================

  /**
   * 根据密码本ID获取密码
   */
  public getPasswordsByBookId(bookId: string): Types.Password[] {
    if (!this.db) {
      throw new Error('Database not initialized')
    }

    const stmt = this.db.prepare(`
      SELECT id, username, password_encrypted as password, iv, masked_password as mask,
             url, description as desc, status, created_at as createTime
      FROM passwords
      WHERE book_id = ?
      ORDER BY sort_order, created_at ASC
    `)

    return stmt.all(bookId) as Types.Password[]
  }

  /**
   * 创建密码
   */
  public async createPassword(
    username: string,
    password: string,
    bookId: string,
    url: string,
    description: string
  ): Promise<Types.Password> {
    if (!this.db) {
      throw new Error('Database not initialized')
    }

    // 验证密码本是否存在
    const bookStmt = this.db.prepare(`SELECT id FROM password_books WHERE id = ?`)
    const book = bookStmt.get(bookId)
    if (!book) {
      throw new Error('Password book does not exist')
    }

    const id = randomUUID()
    const crypto = PasswordCrypto.getInstance()
    const encrypted = crypto.encrypt(password)
    const masked = crypto.maskPassword(password)

    // 获取当前最大排序值
    const maxOrderStmt = this.db.prepare(`
      SELECT COALESCE(MAX(sort_order), 0) as max_order
      FROM passwords
      WHERE book_id = ?
    `)
    const maxOrderResult = maxOrderStmt.get(bookId)
    const newSortOrder = (maxOrderResult.max_order || 0) + 1

    const stmt = this.db.prepare(`
      INSERT INTO passwords (id, book_id, username, password_encrypted, iv, masked_password, url, description, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    stmt.run(
      id,
      bookId,
      username,
      encrypted.encrypted,
      encrypted.iv,
      masked,
      url,
      description,
      newSortOrder
    )

    return {
      id,
      username,
      password: encrypted.encrypted,
      iv: encrypted.iv,
      mask: masked,
      url,
      desc: description,
      sortOrder: newSortOrder,
      status: PasswordStatus.ACTIVE,
      createTime: new Date().toLocaleString()
    }
  }

  /**
   * 更新密码
   */
  public async updatePassword(
    id: string,
    username: string,
    password: string,
    url: string,
    description: string
  ): Promise<Types.Password> {
    if (!this.db) {
      throw new Error('Database not initialized')
    }

    // 获取当前密码记录
    const getPasswordStmt = this.db.prepare(`
      SELECT book_id, password_encrypted, iv, masked_password, created_at
      FROM passwords
      WHERE id = ?
    `)
    const currentPassword = getPasswordStmt.get(id)
    if (!currentPassword) {
      throw new Error('Password does not exist')
    }

    // 加密新密码
    const crypto = PasswordCrypto.getInstance()
    const encrypted = crypto.encrypt(password)
    const masked = crypto.maskPassword(password)

    const stmt = this.db.prepare(`
      UPDATE passwords
      SET username = ?, password_encrypted = ?, iv = ?, masked_password = ?, url = ?, description = ?
      WHERE id = ?
    `)

    stmt.run(username, encrypted.encrypted, encrypted.iv, masked, url, description, id)

    return {
      id,
      username,
      password: encrypted.encrypted,
      iv: encrypted.iv,
      mask: masked,
      url,
      desc: description,
      status: PasswordStatus.ACTIVE,
      createTime: currentPassword.created_at
    }
  }

  /**
   * 删除密码
   */
  public async deletePassword(passwordId: string): Promise<boolean> {
    if (!this.db) {
      throw new Error('Database not initialized')
    }

    const stmt = this.db.prepare(`DELETE FROM passwords WHERE id = ?`)
    const result = stmt.run(passwordId)

    return result.changes > 0
  }

  /**
   * 更新密码排序
   */
  public async updatePasswordSortOrder(passwordId: string, newSortOrder: number): Promise<boolean> {
    if (!this.db) {
      throw new Error('Database not initialized')
    }

    const stmt = this.db.prepare(`
      UPDATE passwords
      SET sort_order = ?
      WHERE id = ?
    `)

    const result = stmt.run(newSortOrder, passwordId)
    return result.changes > 0
  }

  /**
   * 批量更新密码排序
   */
  public async batchUpdatePasswordSortOrder(
    sortOrders: { id: string; sortOrder: number }[]
  ): Promise<boolean> {
    if (!this.db) {
      throw new Error('Database not initialized')
    }

    const stmt = this.db.prepare(`
      UPDATE passwords
      SET sort_order = ?
      WHERE id = ?
    `)

    // 开始事务
    const transaction = this.db.transaction((orders: { id: string; sortOrder: number }[]) => {
      for (const order of orders) {
        stmt.run(order.sortOrder, order.id)
      }
    })

    try {
      transaction(sortOrders)
      return true
    } catch (error) {
      console.error('批量更新排序失败:', error)
      return false
    }
  }

  // ==================== 设置相关操作 ====================

  /**
   * 获取设置
   */
  public async getSetting(): Promise<Types.Settings> {
    if (!this.db) {
      throw new Error('Database not initialized')
    }

    const stmt = this.db.prepare(`SELECT key, value FROM settings`)
    const rows = stmt.all()

    return rows.reduce((acc, { key, value }) => {
      acc[key] = value
      return acc
    }, {} as Types.Settings)
  }

  /**
   * 保存设置
   */
  public async saveSetting(key: string, value: any): Promise<boolean> {
    if (!this.db) {
      throw new Error('Database not initialized')
    }

    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO settings (key, value)
      VALUES (?, ?)
    `)

    stmt.run(key, value)

    return true
  }

  /**
   * 获取所有密码数据（用于重新加密）
   */
  public async getAllPasswordsForReencryption(): Promise<Array<{
    id: string
    book_id: string
    username: string
    password_encrypted: string
    iv: string
    masked_password: string
    url: string
    description: string
  }>> {
    if (!this.db) {
      throw new Error('Database not initialized')
    }

    const stmt = this.db.prepare(`
      SELECT id, book_id, username, password_encrypted, iv, masked_password, url, description
      FROM passwords
      ORDER BY created_at ASC
    `)

    return stmt.all()
  }

  /**
   * 批量更新密码加密数据（用于重新加密）
   */
  public async batchUpdatePasswordEncryption(passwords: Array<{
    id: string
    password_encrypted: string
    iv: string
    masked_password: string
  }>): Promise<boolean> {
    if (!this.db) {
      throw new Error('Database not initialized')
    }

    const stmt = this.db.prepare(`
      UPDATE passwords
      SET password_encrypted = ?, iv = ?, masked_password = ?
      WHERE id = ?
    `)

    const updateMany = this.db.transaction((items: typeof passwords) => {
      for (const item of items) {
        stmt.run(item.password_encrypted, item.iv, item.masked_password, item.id)
      }
    })

    try {
      updateMany(passwords)
      return true
    } catch (error) {
      console.error('Batch update failed:', error)
      return false
    }
  }

  /**
   * 获取统计数据
   */
  public async getStats(): Promise<{
    spaceCount: number
    passwordBookCount: number
    passwordCount: number
  }> {
    if (!this.db) {
      throw new Error('Database not initialized')
    }

    // 查询空间数量
    const spaceCountStmt = this.db.prepare('SELECT COUNT(*) as count FROM spaces')
    const spaceCount = spaceCountStmt.get().count

    // 查询密码本数量
    const passwordBookCountStmt = this.db.prepare('SELECT COUNT(*) as count FROM password_books')
    const passwordBookCount = passwordBookCountStmt.get().count

    // 查询密码数量
    const passwordCountStmt = this.db.prepare('SELECT COUNT(*) as count FROM passwords')
    const passwordCount = passwordCountStmt.get().count

    return {
      spaceCount,
      passwordBookCount,
      passwordCount
    }
  }

  // ==================== 主密码相关操作 ====================

  /**
   * 获取主密码哈希和盐值
   */
  public async getMasterPassword(): Promise<{ hash: string; salt: string } | null> {
    if (!this.db) {
      throw new Error('Database not initialized')
    }
    const settings: Types.Settings = await this.getSetting()
    if (!settings.masterPasswordHash || !settings.masterPasswordSalt) {
      return null
    }
    return { hash: settings.masterPasswordHash, salt: settings.masterPasswordSalt }
  }

  /**
   * 保存主密码哈希和盐值
   */
  public async saveMasterPassword(hash: string, salt: string): Promise<boolean> {
    if (!this.db) {
      throw new Error('Database not initialized')
    }

    this.saveSetting('masterPasswordHash', hash)
    this.saveSetting('masterPasswordSalt', salt)

    return true
  }

  /**
   * 检查是否已设置主密码
   */
  public async hasMasterPassword(): Promise<boolean> {
    const masterPassword = await this.getMasterPassword()
    return masterPassword !== null
  }
}

// 创建全局实例
export const dbManager = new DatabaseManager()
