/**
 * 评分相关 API
 */

import { post, get } from './client'
import type { SuccessResponse } from '@/types'

/**
 * 评分标签类型
 */
export type RatingTag = '素质队友' | '操作怪' | '意识好' | '嘴硬' | '迟到' | '口臭佬'

/**
 * 队友评分数据
 */
export interface TeamMemberRating {
  userId: number
  rating: number // 1-5星
  tags: RatingTag[]
}

/**
 * 评分详情（包含用户名）
 */
export interface RatingDetail {
  id: number
  reviewee_id: number
  username: string
  rating: number
  tags: RatingTag[]
  comment: string | null
  created_at: string
}

/**
 * 提交队伍评分
 */
export async function submitTeamRatings(
  teamId: number,
  ratings: TeamMemberRating[]
): Promise<SuccessResponse> {
  return post<SuccessResponse>(`/api/teams/${teamId}/ratings`, { ratings })
}

/**
 * 获取队伍评分状态（是否已评分）
 */
export async function getTeamRatingStatus(teamId: number): Promise<{ hasRated: boolean }> {
  return get<{ hasRated: boolean }>(`/api/teams/${teamId}/ratings/status`)
}

/**
 * 获取用户对队伍的评分详情
 */
export async function getMyTeamRatings(teamId: number): Promise<RatingDetail[]> {
  return get<RatingDetail[]>(`/api/teams/${teamId}/ratings/my`)
}

/**
 * 批量获取队伍评分状态（是否已评分）
 */
export async function getTeamRatingStatusBatch(
  teamIds: number[]
): Promise<Record<number, boolean>> {
  return post<Record<number, boolean>>('/api/teams/ratings/status/batch', { teamIds })
}
