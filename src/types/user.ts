/**
 * 用户相关类型定义
 */

// 用户基础信息（公开信息，不含密码）
export interface User {
  id: number
  username: string
  email: string
  avatar: string | null
  wechat: string | null
  qq: string | null
  yy: string | null
  created_at?: string | null
}

// 登录表单数据
export interface LoginFormData {
  email: string
  password: string
}

// 注册表单数据
export interface RegisterFormData {
  username: string
  email: string
  password: string
  wechat?: string
  qq?: string
  yy?: string
}

// 用户资料更新数据
export interface UserProfileUpdate {
  wechat?: string | null
  qq?: string | null
  yy?: string | null
}
