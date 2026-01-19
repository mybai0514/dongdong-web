/**
 * 反馈相关 API
 */

import { get, post } from './client'
import type {
  Feedback,
  CreateFeedbackFormData,
  CreateFeedbackResponse,
} from '@/types'

/**
 * 提交反馈
 */
export async function createFeedback(
  data: CreateFeedbackFormData & { user_id: number }
): Promise<CreateFeedbackResponse> {
  return post<CreateFeedbackResponse>('/api/feedback', data)
}

/**
 * 获取用户的反馈历史
 */
export async function getUserFeedback(userId: number): Promise<Feedback[]> {
  return get<Feedback[]>(`/api/feedback/user/${userId}`)
}

/**
 * 获取某个月的所有反馈
 */
export async function getMonthFeedback(month: string): Promise<Feedback[]> {
  return get<Feedback[]>(`/api/feedback/month/${month}`)
}
