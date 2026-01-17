/**
 * API 响应类型定义
 */

import type { User } from './user'
import type { Team, TeamMember, MembershipStatus, Feedback, ContactMethod } from './team'

// 通用 API 响应
export interface ApiResponse<T = unknown> {
  success?: boolean
  message?: string
  error?: string
  data?: T
}

// 认证响应
export interface AuthResponse {
  success: boolean
  message: string
  token: string
  user: User
}

// 登录响应
export type LoginResponse = AuthResponse

// 注册响应
export type RegisterResponse = AuthResponse

// 获取当前用户响应
export interface MeResponse {
  success: boolean
  user: User
}

// 创建队伍响应
export interface CreateTeamResponse {
  success: boolean
  teamId: number
  message: string
}

// 加入队伍响应
export interface JoinTeamResponse {
  success: boolean
  message: string
  contact: {
    method: ContactMethod
    value: string
  }
}

// 队伍列表响应
export type TeamsListResponse = Team[]

// 队伍详情响应
export type TeamDetailResponse = Team

// 队伍成员列表响应
export type TeamMembersResponse = TeamMember[]

// 成员身份检查响应
export type CheckMembershipResponse = MembershipStatus

// 反馈列表响应
export type FeedbackListResponse = Feedback[]

// 创建反馈响应
export interface CreateFeedbackResponse {
  success: boolean
  feedbackId: number
  message: string
}

// 通用成功响应
export interface SuccessResponse {
  success: boolean
  message: string
}

// 错误响应
export interface ErrorResponse {
  error: string
  details?: string
}
