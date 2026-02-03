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
  getUserJoinedTeams,
  updateUser,
  getUserReputation,
} from './users'

export type { UserReputation } from './users'

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
  getTeamRatingStatusBatch,
  getMyTeamRatings,
} from './ratings'

export type { RatingTag, TeamMemberRating, RatingDetail } from './ratings'

// 论坛 API
export {
  getForumCategories,
  getForumCategory,
  getForumPosts,
  getForumPost,
  createForumPost,
  likeForumPost,
  unlikeForumPost,
  dislikeForumPost,
  undislikeForumPost,
  getForumComments,
  createForumComment,
  likeForumComment,
  unlikeForumComment,
  dislikeForumComment,
  undislikeForumComment,
} from './forum'
