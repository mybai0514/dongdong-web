/**
 * 论坛相关类型定义
 */

// 论坛分类
export interface ForumCategory {
  id: number
  slug: string
  name: string
  description: string | null
  icon: string | null
  color: string | null
  post_count: number
  created_at: string | null
}

// 帖子状态
export type PostStatus = 'published' | 'draft' | 'deleted'

// 论坛帖子
export interface ForumPost {
  id: number
  category_id: number
  author_id: number
  title: string
  content: string
  views_count: number
  comments_count: number
  likes_count: number
  dislikes_count: number
  is_pinned: boolean
  status: PostStatus
  created_at: string | null
  updated_at: string | null
  // 关联数据
  author_username?: string
  author_avatar?: string | null
  category_name?: string
  category_slug?: string
  // 用户状态
  isLiked?: boolean
  isDisliked?: boolean
  isAuthor?: boolean
}

// 分页帖子响应
export interface PaginatedPostsResponse {
  posts: ForumPost[]
  total: number
  page: number
  limit: number
  totalPages: number
  category?: ForumCategory
}

// 创建帖子表单数据
export interface CreatePostFormData {
  title: string
  content: string
}

// 评论状态
export type CommentStatus = 'published' | 'deleted'

// 论坛评论
export interface ForumComment {
  id: number
  post_id: number
  author_id: number
  parent_comment_id: number | null
  content: string
  likes_count: number
  dislikes_count: number
  status: CommentStatus
  created_at: string | null
  updated_at: string | null
  // 关联数据
  author_username?: string
  author_avatar?: string | null
  // 用户状态
  isLiked?: boolean
  isDisliked?: boolean
  isAuthor?: boolean
  // 子评论
  replies?: ForumComment[]
}

// 创建评论表单数据
export interface CreateCommentFormData {
  content: string
  parent_comment_id?: number
}

// 点赞响应
export interface LikeResponse {
  success: boolean
  likes_count: number
}

// 反赞响应
export interface DislikeResponse {
  success: boolean
  dislikes_count: number
}
