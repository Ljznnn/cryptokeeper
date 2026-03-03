import { defineStore } from 'pinia'
import { Ref, ref } from 'vue'
import * as Types from '../models/types'

/**
 * 配置数据管理
 */
export const useSettingsStore = defineStore('settings', () => {
  const settings: Ref<Types.Settings> = ref({ defaultSpaceId: '' })

  const initSettings = async () => {
    await loadSettings()
  }

  /**
   * 加载设置
   */
  const loadSettings = async (): Promise<Types.Settings> => {
    try {
      settings.value = await window.api.getSettings()
      return settings.value
    } catch (error) {
      console.warn('加载设置失败:', error)
      return settings.value
    }
  }

  /**
   * 保存设置
   */
  const saveSettings = async (newSettings: Partial<Types.Settings>): Promise<boolean> => {
    try {
      const updatedSettings = { ...settings.value, ...newSettings }
      const result = await window.api.saveSettings(updatedSettings)

      if (result.success) {
        settings.value = updatedSettings
        return true
      } else {
        console.error('保存设置失败:', result.message)
        return false
      }
    } catch (error) {
      console.error('保存设置时发生错误:', error)
      return false
    }
  }

  /**
   * 更新特定设置项
   */
  const updateSetting = async <K extends keyof Types.Settings>(
    key: K,
    value: Types.Settings[K]
  ): Promise<boolean> => {
    return await saveSettings({ [key]: value })
  }

  /**
   * 获取特定设置项的值
   */
  const getSetting = <K extends keyof Types.Settings>(key: K): Types.Settings[K] => {
    return settings?.value[key]
  }

  return {
    settings,
    initSettings,
    loadSettings,
    saveSettings,
    updateSetting,
    getSetting
  }
})
