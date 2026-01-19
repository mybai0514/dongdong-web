/**
 * 认证相关 API
 */

import { post, get, setToken, setStoredUser, clearToken, clearStoredUser } from './client'
import type {
  User,
  LoginFormData,
  RegisterFormData,
  LoginResponse,
  RegisterResponse,
  MeResponse,
  SuccessResponse,
} from '@/types'

/**
 * 用户登录
 */
export async function login(data: LoginFormData): Promise<LoginResponse> {
  const response = await post<LoginResponse>('/api/auth/login', data)

  if (response.success && response.token && response.user) {
    setToken(response.token)
    setStoredUser(response.user)
  }

  return response
}

/**
 * 用户注册
 */
export async function register(data: RegisterFormData): Promise<RegisterResponse> {
  const response = await post<RegisterResponse>('/api/auth/register', data)

  if (response.success && response.token && response.user) {
    setToken(response.token)
    setStoredUser(response.user)
  }

  return response
}

/**
 * 获取当前用户信息
 */
export async function getCurrentUser(): Promise<User> {
  const response = await get<MeResponse>('/api/auth/me')
  return response.user
}

/**
 * 用户登出
 */
export async function logout(): Promise<void> {
  try {
    await post<SuccessResponse>('/api/auth/logout')
  } finally {
    // 无论请求是否成功，都清除本地存储
    clearToken()
    clearStoredUser()
  }
}

/**
 * 检查是否已登录
 */
export function isAuthenticated(): boolean {
  if (typeof window === 'undefined') return false
  return !!localStorage.getItem('token')
}
