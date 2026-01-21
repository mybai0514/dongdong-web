/**
 * 队伍相关类型定义
 */

// 队伍状态
export type TeamStatus = 'open' | 'closed' | 'full'

// 联系方式类型
export type ContactMethod = 'wechat' | 'qq' | 'yy' | 'other'

// 队伍信息
export interface Team {
  id: number
  game: string
  title: string
  description: string | null
  rank_requirement: string | null
  start_time: string
  end_time: string
  contact_method: ContactMethod
  contact_value: string
  creator_id: number
  status: TeamStatus
  member_count: number
  max_members: number
  created_at: string | null
  updated_at: string | null
  isMember?: boolean
  isCreator?: boolean
}

// 创建队伍表单数据
export interface CreateTeamFormData {
  game: string
  title: string
  description?: string
  rank_requirement?: string
  start_time: string
  end_time: string
  contact_method: ContactMethod
  contact_value: string
  max_members?: number
}

// 队伍成员
export interface TeamMember {
  id: number
  user_id: number
  username: string
  joined_at: string | null
}

// 队伍成员身份检查结果
export interface MembershipStatus {
  isMember: boolean
  isCreator: boolean
  contact?: {
    method: ContactMethod
    value: string
  }
}

// 反馈心情
export type FeedbackMood = 'happy' | 'neutral' | 'sad'

// 反馈信息
export interface Feedback {
  id: number
  user_id: number
  content: string
  month: string // 格式: 2025-01
  game: string | null
  mood: FeedbackMood | null
  created_at: string | null
}

// 创建反馈表单数据
export interface CreateFeedbackFormData {
  content: string
  month: string
  game?: string
  mood?: FeedbackMood
}
