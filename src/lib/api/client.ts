/**
 * API 客户端基础封装
 */

// API 基础地址
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787'

// 请求配置
interface RequestConfig extends RequestInit {
  params?: Record<string, string>
}

// API 错误类
export class ApiError extends Error {
  constructor(
    public status: number,
    public statusText: string,
    public data?: { error?: string; details?: string }
  ) {
    super(data?.error || statusText)
    this.name = 'ApiError'
  }
}

/**
 * 获取存储的 token
 */
export function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('token')
}

/**
 * 设置 token
 */
export function setToken(token: string): void {
  if (typeof window === 'undefined') return
  localStorage.setItem('token', token)
}

/**
 * 清除 token
 */
export function clearToken(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem('token')
}

/**
 * 获取存储的用户信息
 */
export function getStoredUser<T>(): T | null {
  if (typeof window === 'undefined') return null
  const userStr = localStorage.getItem('user')
  if (!userStr) return null
  try {
    return JSON.parse(userStr)
  } catch {
    return null
  }
}

/**
 * 设置用户信息
 */
export function setStoredUser<T>(user: T): void {
  if (typeof window === 'undefined') return
  localStorage.setItem('user', JSON.stringify(user))
  // 触发自定义事件通知其他组件
  window.dispatchEvent(new Event('user-login'))
}

/**
 * 清除用户信息
 */
export function clearStoredUser(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem('user')
  window.dispatchEvent(new Event('user-logout'))
}

/**
 * 构建请求头
 */
function buildHeaders(customHeaders?: HeadersInit): Headers {
  const headers = new Headers(customHeaders)

  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  const token = getToken()
  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  return headers
}

/**
 * 构建完整 URL
 */
function buildUrl(endpoint: string, params?: Record<string, string>): string {
  const url = new URL(endpoint, API_BASE_URL)

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.append(key, value)
      }
    })
  }

  return url.toString()
}

/**
 * 通用请求方法
 */
async function request<T>(endpoint: string, config: RequestConfig = {}): Promise<T> {
  const { params, headers: customHeaders, ...fetchConfig } = config

  const url = buildUrl(endpoint, params)
  const headers = buildHeaders(customHeaders)

  const response = await fetch(url, {
    ...fetchConfig,
    headers,
  })

  const data = await response.json() as T & { error?: string; details?: string }

  if (!response.ok) {
    throw new ApiError(response.status, response.statusText, data)
  }

  return data
}

/**
 * GET 请求
 */
export async function get<T>(endpoint: string, params?: Record<string, string>): Promise<T> {
  return request<T>(endpoint, { method: 'GET', params })
}

/**
 * POST 请求
 */
export async function post<T>(endpoint: string, body?: unknown): Promise<T> {
  return request<T>(endpoint, {
    method: 'POST',
    body: body ? JSON.stringify(body) : undefined,
  })
}

/**
 * PUT 请求
 */
export async function put<T>(endpoint: string, body?: unknown): Promise<T> {
  return request<T>(endpoint, {
    method: 'PUT',
    body: body ? JSON.stringify(body) : undefined,
  })
}

/**
 * DELETE 请求
 */
export async function del<T>(endpoint: string): Promise<T> {
  return request<T>(endpoint, { method: 'DELETE' })
}

// 导出 API 客户端
export const apiClient = {
  get,
  post,
  put,
  delete: del,
}
