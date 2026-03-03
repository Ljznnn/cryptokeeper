// API 类型定义
interface Window {
  api: {
    // 主密码相关
    hasMasterPassword: () => Promise<boolean>
    verifyMasterPassword: (password: string) => Promise<any>
    setMasterPassword: (password: string) => Promise<{ success: boolean; message?: string }>
    changeMasterPassword: (oldPassword: string, newPassword: string) => Promise<{ success: boolean; message?: string; reencryptedCount?: number }>

    // 空间相关
    getSpaces: () => Promise<any[]>
    getSpace: () => Promise<any>
    createSpace: (name: string, desc?: string) => Promise<{ success: boolean; message?: string; space?: any }>
    switchSpace: (spaceId: string) => Promise<{ success: boolean; message?: string }>
    deleteSpace: (spaceId: string) => Promise<{ success: boolean; message?: string }>

    // 密码本相关
    getPasswordBooks: (spaceId: string) => Promise<{ success: boolean; message?: string; data?: any[] }>
    createPasswordBook: (name: string, spaceId: string, desc?: string) => Promise<{ success: boolean; message?: string; data?: any }>
    updatePasswordBook: (bookId: string, name: string, desc?: string) => Promise<{ success: boolean; message?: string }>
    deletePasswordBook: (spaceId: string, bookId: string) => Promise<{ success: boolean; message?: string }>

    // 密码相关
    getPasswords: (spaceId: string, bookId: string) => Promise<{ success: boolean; message?: string; data?: any[] }>
    createPassword: (passwordData: any, spaceId: string, bookId: string) => Promise<{ success: boolean; message?: string; data?: any }>
    updatePassword: (spaceId: string, bookId: string, passwordData: any) => Promise<{ success: boolean; message?: string }>
    deletePassword: (spaceId: string, bookId: string, id: string) => Promise<{ success: boolean; message?: string }>
    updatePasswordSort: (spaceId: string, bookId: string, passwordId: string, newSortOrder: number) => Promise<{ success: boolean; message?: string }>
    batchUpdatePasswordSort: (spaceId: string, bookId: string, sortOrders: any[]) => Promise<{ success: boolean; message?: string }>
    decryptPassword: (password: string, iv: string) => Promise<{ success: boolean; password?: string; message?: string }>
    openExternal: (url: string) => Promise<void>

    // 回收站相关
    getDeletedItems: () => Promise<{ success: boolean; message?: string; data?: any[] }>
    restoreItem: (id: string) => Promise<{ success: boolean; message?: string }>
    permanentDelete: (id: string) => Promise<{ success: boolean; message?: string }>

    // 设置相关
    getSettings: () => Promise<any>
    saveSettings: (settings: any) => Promise<{ success: boolean; message?: string }>

    // 统计数据相关
    getStats: () => Promise<{ success: boolean; message?: string; data?: any }>
  }

  electron: {
    process: {
      versions: {
        [key: string]: string
      }
    }
  }
}