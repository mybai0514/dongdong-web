/**
 * 队伍相关 API
 */

import { get, post, put, del } from './client'
import type {
  Team,
  CreateTeamFormData,
  TeamMember,
  MembershipStatus,
  CreateTeamResponse,
  JoinTeamResponse,
  SuccessResponse,
} from '@/types'

/**
 * 获取队伍列表
 */
export async function getTeams(params?: {
  game?: string
  status?: string
}): Promise<Team[]> {
  const queryParams: Record<string, string> = {}

  if (params?.game && params.game !== '全部') {
    queryParams.game = params.game
  }
  if (params?.status) {
    queryParams.status = params.status
  }

  return get<Team[]>('/api/teams', queryParams)
}

/**
 * 获取队伍详情
 */
export async function getTeam(id: number): Promise<Team> {
  return get<Team>(`/api/teams/${id}`)
}

/**
 * 创建队伍
 */
export async function createTeam(
  data: CreateTeamFormData & { creator_id: number }
): Promise<CreateTeamResponse> {
  return post<CreateTeamResponse>('/api/teams', data)
}

/**
 * 更新队伍信息
 */
export async function updateTeam(
  id: number,
  data: Partial<Team>
): Promise<SuccessResponse> {
  return put<SuccessResponse>(`/api/teams/${id}`, data)
}

/**
 * 删除队伍
 */
export async function deleteTeam(id: number): Promise<SuccessResponse> {
  return del<SuccessResponse>(`/api/teams/${id}`)
}

/**
 * 加入队伍
 */
export async function joinTeam(teamId: number): Promise<JoinTeamResponse> {
  return post<JoinTeamResponse>(`/api/teams/${teamId}/join`)
}

/**
 * 退出队伍
 */
export async function leaveTeam(teamId: number): Promise<SuccessResponse> {
  return post<SuccessResponse>(`/api/teams/${teamId}/leave`)
}

/**
 * 检查成员身份
 */
export async function checkMembership(teamId: number): Promise<MembershipStatus> {
  return get<MembershipStatus>(`/api/teams/${teamId}/check-membership`)
}

/**
 * 获取队伍成员列表（仅队长可用）
 */
export async function getTeamMembers(teamId: number): Promise<TeamMember[]> {
  return get<TeamMember[]>(`/api/teams/${teamId}/members`)
}

/**
 * 踢出成员（仅队长可用）
 */
export async function kickMember(
  teamId: number,
  userId: number
): Promise<SuccessResponse> {
  return del<SuccessResponse>(`/api/teams/${teamId}/members/${userId}`)
}
