import { defineStore } from 'pinia'
import {Ref,ref} from 'vue'
import * as Types from '../models/types'
import {ElMessage} from "element-plus";
import {useSettingsStore} from './settingsStore'

/**
 * 命名空间、密码本相关数据管理
 */
export const useWorkspaceStore = defineStore('workspace', () => {
  const spaces: Ref<Types.Space[]> = ref([])
  const currentSpaceId: Ref<string> = ref('')
  const currentSpace: Ref<Types.Space | null> = ref(null)
  const passwordBooks: Ref<Types.PasswordBook[]> = ref([])
  const currentBook: Ref<Types.PasswordBook | null> = ref(null)
  const passwords: Ref<Types.Password[]> = ref([])
  const settingsStore = useSettingsStore()

  const initWorkspace = async () => {
    await settingsStore.initSettings()
    currentSpaceId.value = settingsStore.getSetting('defaultSpaceId') ?? ''
    await loadSpaces()
    await switchSpace(currentSpaceId.value)
  }

  /**
   * 获取所有空间
   */
  const loadSpaces = async (): Promise<Types.Space[]> => {
    try {
      spaces.value = await window.api.getSpaces()
      return spaces.value || []
    } catch (error) {
      console.error('获取空间列表失败:', error)
      return []
    }
  }

  /**
   * 创建新空间
   */
  const createSpace = async (name: string, desc?: string): Promise<Types.Space> => {
    try {
      const result = await window.api.createSpace(name, desc)
      if (result.success) {
        if (spaces.value) {
          spaces.value.push(result.space)
        }
        return result.space
      } else {
        throw new Error(result.message)
      }
    } catch (error) {
      console.error('创建空间失败:', error)
      throw error
    }
  }

  /**
   * 切换空间
   */
  const switchSpace = async (spaceId: string): Promise<void> => {
    try {
      if (spaceId == '') {
        return
      }
      currentSpace.value = spaces.value.find(space => space.id === spaceId) ?? null
      currentSpaceId.value = currentSpace.value?.id??''
      // 加载该空间下的密码本
      loadPasswordBooks(spaceId)
      currentBook.value = null
    } catch (error) {
      console.error('切换空间失败:', error)
      throw error
    }
  }

  /**
   * 删除空间
   */
  const deleteSpace = async (spaceId: string): Promise<boolean> => {
    try {
      if ((settingsStore.getSetting('defaultSpaceId') ?? '') === spaceId) {
        throw new Error('无法删除默认空间')
      }
      const result = await window.api.deleteSpace(spaceId)
      if (result.success) {
        spaces.value = spaces.value.filter(space => space.id !== spaceId)
        currentSpaceId.value = ''
        currentSpace.value = null
        passwordBooks.value = []
        return true
      } else {
        throw new Error(result.message)
      }
    } catch (error) {
      console.error('删除空间失败:', error)
      throw error
    }
  }

  /**
   * 获取密码本列表
   */
  const loadPasswordBooks = async (spaceId: string): Promise<Types.PasswordBook[]> => {
    try {
      const {success, message, data} = await window.api.getPasswordBooks(spaceId)
      if (!success) {
        throw new Error(message)
      }
      passwordBooks.value = data
      if (passwordBooks.value?.length ?? 0 > 0) {
        switchPasswordBook(passwordBooks.value[0].id)
      }
      return passwordBooks.value ?? []
    } catch (error) {
      console.error('获取密码本列表失败:', error)
      return []
    }
  }

  /**
   * 切换密码本
   */
  const switchPasswordBook = async (bookId: string): Promise<Types.Space> => {
    try {
      currentBook.value = passwordBooks.value.find(book => book.id === bookId) ?? null
      // 加载密码
      if (currentSpace.value?.id) {
        loadPasswords(currentSpace.value.id, bookId);
      }
    } catch (error) {
      console.error('切换空间失败:', error)
      throw error
    }
  }

  /**
   * 加载密码列表
   */
  const loadPasswords = async (spaceId: string, bookId: string): Promise<Types.Password[]> => {
    try {
      const {success, message, data} = await window.api.getPasswords(spaceId, bookId)
      if (!success) {
        throw new Error(message)
      }
      return passwords.value = data
    } catch (error) {
      console.error('获取密码列表失败:', error)
      return []
    }
  }

  /**
   * 创建密码本
   */
  const createPasswordBook = async (name: string, spaceId: string, desc?: string): Promise<Types.PasswordBook> => {
    try {
      const result = await window.api.createPasswordBook(name, spaceId, desc)
      if (result.success) {
        passwordBooks.value.push(result.book)
        return result.book
      } else {
        throw new Error(result.message)
      }
    } catch (error) {
      console.error('创建密码本失败:', error)
      throw error
    }
  }

  /**
   * 删除密码本
   */
  const deletePasswordBook = async (spaceId: string, bookId: string): Promise<boolean> => {
    try {
      const result = await window.api.deletePasswordBook(spaceId, bookId)
      if (result.success) {
        passwordBooks.value = passwordBooks.value.filter(book => book.id !== bookId)
        return true
      } else {
        throw new Error(result.message)
      }
    } catch (error) {
      console.error('删除密码本失败:', error)
      throw error
    }
  }

  /**
   * 更新密码本
   */
  const updatePasswordBook = async (bookId: string, name: string, desc?: string): Promise<Types.PasswordBook> => {
    try {
      const result = await window.api.updatePasswordBook(bookId, name, desc)
      if (result.success) {
        const index = passwordBooks.value.findIndex(book => book.id === bookId)
        if (index !== -1) {
          passwordBooks.value[index] = result.book
          // 如果是当前选中的密码本，也需要更新
          if (currentBook.value?.id === bookId) {
            currentBook.value = result.book
          }
        }
        return result.book
      } else {
        throw new Error(result.message)
      }
    } catch (error) {
      console.error('更新密码本失败:', error)
      throw error
    }
  }

  /**
   * 创建密码
   */
  const createPassword = async (passwordData: Omit<Types.Password, 'status' | 'iv' | 'id' | 'mask' | 'createTime'>, spaceId: string, bookId: string): Promise<Types.Password> => {
    try {
      const result = await window.api.createPassword(passwordData, spaceId, bookId)
      if (result.success) {
        currentBook.value?.pws?.push(result.password);
        passwords.value.push(result.password)
        return result.password
      } else {
        throw new Error(result.message)
      }
    } catch (error) {
      console.error('创建密码失败:', error)
      throw error
    }
  }

  /**
   * 更新密码
   */
  const updatePassword = async (spaceId: string, bookId: string, passwordData: Partial<Types.Password>): Promise<Types.Password> => {
    try {
      const result = await window.api.updatePassword(spaceId, bookId, passwordData)
      if (result.success) {
        const index = passwords.value.findIndex(p => p.id === passwordData.id)
        if (index !== -1) {
          passwords.value[index] = result.password
        }
        return result.password
      } else {
        throw new Error(result.message)
      }
    } catch (error) {
      console.error('更新密码失败:', error)
      throw error
    }
  }

  /**
   * 删除密码
   */
  const deletePassword = async (spaceId: string, bookId: string, id: string): Promise<boolean> => {
    try {
      const result = await window.api.deletePassword(spaceId, bookId, id)
      if (result.success) {
        passwords.value = passwords.value.filter(password => password.id !== id)
        return true
      } else {
        throw new Error(result.message)
      }
    } catch (error) {
      console.error('删除密码失败:', error)
      throw error
    }
  }

  /**
   * 解码密码
   */
  const decryptPassword = async (password: string, iv: string): Promise<string> => {
    try {
      const result = await window.api.decryptPassword(password, iv)
      if (result.success) {
        return result.password
      } else {
        throw new Error(result.message)
      }
    } catch (error) {
      console.error('解码密码失败:', error)
      throw error
    }
  }

  /**
   * 跳转地址
   * @param url
   */
  const openExternal = async (url: string): Promise<void> => {
    const result = await window.api.openExternal(url)
    if (!result.success) {
      ElMessage.error(result.message)
    }
  }

  return {
    initWorkspace,
    // 数据
    spaces,
    currentSpace,
    currentSpaceId,
    passwordBooks,
    currentBook,
    passwords,

    // 方法
    loadSpaces,
    createSpace,
    switchSpace,
    deleteSpace,
    switchPasswordBook,
    loadPasswordBooks,
    createPasswordBook,
    updatePasswordBook,
    deletePasswordBook,
    createPassword,
    updatePassword,
    deletePassword,
    decryptPassword,
    openExternal
  }
})
