import {defineStore} from 'pinia'
import {Ref, ref} from 'vue'
import {useRouter, Router} from "vue-router";
import { passwordCrypto } from '@renderer/utils/cryptoUtils';

/**
 * 管理主密码状态、验证和路由跳转
 * 集成安全增强功能
 */
export const useAuthStore = defineStore('auth', () => {
  const isSettingUpMasterPassword: Ref<boolean> = ref(false)
  const isMasterPasswordVerified: Ref<boolean> = ref(false)
  const masterPassword: Ref<string> = ref('')
  const errorMessage: Ref<string> = ref('')
  const failedAttempts: Ref<number> = ref(0)
  const maxFailedAttempts: Ref<number> = ref(5)
  const lockoutUntil: Ref<number | null> = ref(null)
  const router: Router = useRouter()

  /**
   * 检查是否被锁定
   */
  const isLockedOut = (): boolean => {
    if (!lockoutUntil.value) return false;
    const now = Date.now();
    if (now >= lockoutUntil.value) {
      // 锁定期结束，重置状态
      lockoutUntil.value = null;
      failedAttempts.value = 0;
      return false;
    }
    return true;
  };

  /**
   * 获取剩余锁定时间（秒）
   */
  const getLockoutRemainingTime = (): number => {
    if (!lockoutUntil.value) return 0;
    const remaining = Math.ceil((lockoutUntil.value - Date.now()) / 1000);
    return Math.max(0, remaining);
  };
  /**
   * 检查主密码状态
   */
  const checkMasterPasswordStatus = async () => {
    try {
      const result = await window.api.hasMasterPassword()
      isSettingUpMasterPassword.value = !result
      // 根据状态跳转到相应页面
      if (isSettingUpMasterPassword.value) {
        await router.replace('/setup')
      } else {
        await router.replace('/login')
      }
    } catch (error) {
      console.error('检查主密码状态失败:', error)
    }
  }

  /**
   * 验证主密码
   */
  const verifyMasterPassword = async (password) => {
    // 检查是否被锁定
    if (isLockedOut()) {
      const remainingTime = getLockoutRemainingTime();
      errorMessage.value = `账户已被锁定，请在 ${remainingTime} 秒后重试`;
      return false;
    }

    if (!password) {
      errorMessage.value = '请输入密码';
      return false;
    }

    try {
      const result = await window.api.verifyMasterPassword(password);

      if (result.success) {
        isMasterPasswordVerified.value = true;
        errorMessage.value = '';
        failedAttempts.value = 0; // 重置失败次数
        return true;
      } else {
        // 验证失败，增加失败次数
        failedAttempts.value++;

        // 实施递增锁定策略
        if (failedAttempts.value >= maxFailedAttempts.value) {
          // 永久锁定
          lockoutUntil.value = Date.now() + 30 * 60 * 1000; // 30分钟
          errorMessage.value = '密码错误次数过多，账户已被锁定30分钟';
        } else if (failedAttempts.value >= 3) {
          // 临时锁定
          const lockoutMinutes = Math.pow(2, failedAttempts.value - 3) * 5; // 5, 10, 20分钟
          lockoutUntil.value = Date.now() + lockoutMinutes * 60 * 1000;
          errorMessage.value = `密码错误，账户已被锁定${lockoutMinutes}分钟`;
        } else {
          errorMessage.value = `密码错误，请重试 (${failedAttempts.value}/${maxFailedAttempts.value})`;
        }

        return false;
      }
    } catch (error) {
      errorMessage.value = '验证过程出错，请重试';
      console.log(error);
      return false;
    }
  }

  /**
   * 设置主密码
   */
  const setMasterPassword = async (newPassword, confirmPassword) => {
    if (!newPassword) {
      errorMessage.value = '请输入密码';
      return false;
    }

    if (newPassword !== confirmPassword) {
      errorMessage.value = '两次输入的密码不一致';
      return false;
    }

    try {
      const result = await window.api.setMasterPassword(newPassword);
      if (result.success) {
        isSettingUpMasterPassword.value = false;
        isMasterPasswordVerified.value = true;
        errorMessage.value = '';
        failedAttempts.value = 0; // 重置失败计数
        return true;
      } else {
        errorMessage.value = result.message || '设置主密码失败';
        return false;
      }
    } catch (error) {
      errorMessage.value = '设置过程出错，请重试';
      return false;
    }
  }

  /**
   * 清除认证状态
   */
  const clearAuthState = () => {
    isMasterPasswordVerified.value = false;
    masterPassword.value = '';
    errorMessage.value = '';
    // 不清除失败尝试次数，保持安全限制
  };

  /**
   * 重置安全状态
   */
  const resetSecurityState = () => {
    failedAttempts.value = 0;
    lockoutUntil.value = null;
    errorMessage.value = '';
  };

  return {
    // 状态
    isSettingUpMasterPassword,
    isMasterPasswordVerified,
    masterPassword,
    errorMessage,
    failedAttempts,
    maxFailedAttempts,
    lockoutUntil,

    // 方法
    checkMasterPasswordStatus,
    verifyMasterPassword,
    setMasterPassword,
    isLockedOut,
    getLockoutRemainingTime,
    clearAuthState,
    resetSecurityState
  }
})
