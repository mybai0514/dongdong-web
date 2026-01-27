/**
 * 用户相关 API
 */

import { get, put } from './client'
import type {
  User,
  Team,
  UserProfileUpdate,
  SuccessResponse,
} from '@/types'

/**
 * 用户信誉统计
 */
export interface UserReputation {
  totalReviews: number
  averageRating: number
  tagStats: Record<string, number>
}

/**
 * 获取用户信息
 */
export async function getUser(id: number): Promise<User> {
  return get<User>(`/api/users/${id}`)
}

/**
 * 获取用户发起的队伍
 */
export async function getUserTeams(userId: number): Promise<Team[]> {
  return get<Team[]>(`/api/users/${userId}/teams`)
}

/**
 * 获取当前用户加入的队伍
 */
export async function getJoinedTeams(): Promise<Team[]> {
  return get<Team[]>('/api/users/me/joined-teams')
}

/**
 * 更新用户信息
 */
export async function updateUser(
  userId: number,
  data: UserProfileUpdate
): Promise<SuccessResponse> {
  return put<SuccessResponse>(`/api/users/${userId}`, data)
}

/**
 * 获取用户信誉统计
 */
export async function getUserReputation(userId: number): Promise<UserReputation> {
  return get<UserReputation>(`/api/users/${userId}/reputation`)
}
