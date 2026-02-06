import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {
  // 主密码相关
  hasMasterPassword: () => ipcRenderer.invoke('has-master-password'),
  verifyMasterPassword: (password) => ipcRenderer.invoke('verify-master-password', password),
  setMasterPassword: (password) => ipcRenderer.invoke('set-master-password', password),
  changeMasterPassword: (oldPassword, newPassword) => ipcRenderer.invoke('change-master-password', oldPassword, newPassword),

  // 空间相关
  getSpaces: () => ipcRenderer.invoke('get-spaces'),
  getSpace: () => ipcRenderer.invoke('get-space'),
  createSpace: (name) => ipcRenderer.invoke('create-space', name),
  switchSpace: (spaceId) => ipcRenderer.invoke('switch-space', spaceId),
  deleteSpace: (spaceId) => ipcRenderer.invoke('delete-space', spaceId),

  // 密码本相关
  getPasswordBooks: (spaceId) => ipcRenderer.invoke('get-password-book', spaceId),
  createPasswordBook: (name, spaceId, desc) => ipcRenderer.invoke('create-password-book', name, spaceId, desc),
  updatePasswordBook: (bookId, name, desc) => ipcRenderer.invoke('update-password-book', bookId, name, desc),
  deletePasswordBook: (spaceId, bookId) => ipcRenderer.invoke('delete-password-book', spaceId, bookId),

  // 密码相关
  getPasswords: (spaceId, bookId) => ipcRenderer.invoke('get-passwords', spaceId, bookId),
  createPassword: (passwordData, spaceId, bookId) => ipcRenderer.invoke('create-password', passwordData, spaceId, bookId),
  updatePassword: (spaceId, bookId, passwordData) => ipcRenderer.invoke('update-password', spaceId, bookId, passwordData),
  deletePassword: (spaceId, bookId, id) => ipcRenderer.invoke('delete-password', spaceId, bookId, id),
  updatePasswordSort: (spaceId, bookId, passwordId, newSortOrder) => ipcRenderer.invoke('update-password-sort', spaceId, bookId, passwordId, newSortOrder),
  batchUpdatePasswordSort: (spaceId, bookId, sortOrders) => ipcRenderer.invoke('batch-update-password-sort', spaceId, bookId, sortOrders),
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  decryptPassword: (password, iv) => ipcRenderer.invoke('decrypt-password', password, iv),

  // 回收站相关
  getDeletedItems: () => ipcRenderer.invoke('get-deleted-items'),
  restoreItem: (id) => ipcRenderer.invoke('restore-item', id),
  permanentDelete: (id) => ipcRenderer.invoke('permanent-delete', id),

  // 设置相关
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings),
  
  // 统计数据相关
  getStats: () => ipcRenderer.invoke('get-stats')
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
