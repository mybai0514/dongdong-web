/**
 * API 统一导出
 */

// 客户端工具
export {
  ApiError,
  getToken,
  setToken,
  clearToken,
  getStoredUser,
  setStoredUser,
  clearStoredUser,
  apiClient,
} from './client'

// 认证 API
export {
  login,
  register,
  logout,
  getCurrentUser,
  isAuthenticated,
} from './auth'

// 队伍 API
export {
  getTeams,
  getTeam,
  createTeam,
  updateTeam,
  deleteTeam,
  joinTeam,
  leaveTeam,
  checkMembership,
  getTeamMembers,
  kickMember,
} from './teams'

// 用户 API
export {
  getUser,
  getUserTeams,
  getJoinedTeams,
  updateUser,
} from './users'

// 反馈 API
export {
  createFeedback,
  getUserFeedback,
  getMonthFeedback,
} from './feedback'

// 评分 API
export {
  submitTeamRatings,
  getTeamRatingStatus,
  getMyTeamRatings,
} from './ratings'

export type { RatingTag, TeamMemberRating, RatingDetail } from './ratings'
