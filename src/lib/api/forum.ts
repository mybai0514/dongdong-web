/**
 * 论坛相关 API
 */

import { get, post, del, getToken } from './client'
import type {
  ForumCategory,
  ForumPost,
  PaginatedPostsResponse,
  CreatePostFormData,
  ForumComment,
  CreateCommentFormData,
  LikeResponse,
  DislikeResponse,
} from '@/types'

/**
 * 获取所有论坛分类
 */
export async function getForumCategories(): Promise<{ categories: ForumCategory[] }> {
  return get<{ categories: ForumCategory[] }>('/api/forum/categories')
}

/**
 * 获取特定分类信息
 */
export async function getForumCategory(slug: string): Promise<{ category: ForumCategory }> {
  return get<{ category: ForumCategory }>(`/api/forum/categories/${slug}`)
}

/**
 * 获取分类下的帖子列表（支持分页、搜索、排序）
 */
export async function getForumPosts(
  categorySlug: string,
  params?: {
    page?: number
    limit?: number
    sort?: 'latest' | 'views' | 'likes'
    search?: string
  }
): Promise<PaginatedPostsResponse> {
  const queryParams: Record<string, string> = {}

  if (params?.page) {
    queryParams.page = params.page.toString()
  }
  if (params?.limit) {
    queryParams.limit = params.limit.toString()
  }
  if (params?.sort) {
    queryParams.sort = params.sort
  }
  if (params?.search) {
    queryParams.search = params.search
  }

  return get<PaginatedPostsResponse>(`/api/forum/${categorySlug}/posts`, queryParams)
}

/**
 * 获取帖子详情
 */
export async function getForumPost(postId: number): Promise<{ post: ForumPost }> {
  return get<{ post: ForumPost }>(`/api/forum/posts/${postId}`)
}

/**
 * 创建新帖子（需认证）
 */
export async function createForumPost(
  categorySlug: string,
  data: CreatePostFormData
): Promise<{ post: ForumPost }> {
  return post<{ post: ForumPost }>(`/api/forum/${categorySlug}/posts`, data)
}

/**
 * 点赞帖子（需认证）
 */
export async function likeForumPost(postId: number): Promise<LikeResponse> {
  return post<LikeResponse>(`/api/forum/posts/${postId}/like`)
}

/**
 * 取消点赞帖子（需认证）
 */
export async function unlikeForumPost(postId: number): Promise<LikeResponse> {
  return del<LikeResponse>(`/api/forum/posts/${postId}/like`)
}

/**
 * 获取帖子评论列表
 */
export async function getForumComments(postId: number): Promise<{ comments: ForumComment[] }> {
  return get<{ comments: ForumComment[] }>(`/api/forum/posts/${postId}/comments`)
}

/**
 * 创建评论（需认证）
 */
export async function createForumComment(
  postId: number,
  data: CreateCommentFormData
): Promise<{ comment: ForumComment }> {
  return post<{ comment: ForumComment }>(`/api/forum/posts/${postId}/comments`, data)
}

/**
 * 点赞评论（需认证）
 */
export async function likeForumComment(commentId: number): Promise<LikeResponse> {
  return post<LikeResponse>(`/api/forum/comments/${commentId}/like`)
}

/**
 * 取消点赞评论（需认证）
 */
export async function unlikeForumComment(commentId: number): Promise<LikeResponse> {
  return del<LikeResponse>(`/api/forum/comments/${commentId}/like`)
}

/**
 * 反赞帖子（需认证）
 */
export async function dislikeForumPost(postId: number): Promise<DislikeResponse> {
  return post<DislikeResponse>(`/api/forum/posts/${postId}/dislike`)
}

/**
 * 取消反赞帖子（需认证）
 */
export async function undislikeForumPost(postId: number): Promise<DislikeResponse> {
  return del<DislikeResponse>(`/api/forum/posts/${postId}/dislike`)
}

/**
 * 反赞评论（需认证）
 */
export async function dislikeForumComment(commentId: number): Promise<DislikeResponse> {
  return post<DislikeResponse>(`/api/forum/comments/${commentId}/dislike`)
}

/**
 * 取消反赞评论（需认证）
 */
export async function undislikeForumComment(commentId: number): Promise<DislikeResponse> {
  return del<DislikeResponse>(`/api/forum/comments/${commentId}/dislike`)
}

/**
 * 上传图片到 R2
 */
export async function uploadImage(file: File): Promise<{ url: string; filename: string }> {
  const token = getToken()

  if (!token) {
    throw new Error('请先登录')
  }

  const formData = new FormData()
  formData.append('file', file)

  const apiBaseUrl = typeof window !== 'undefined'
    ? process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787'
    : process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787'

  const response = await fetch(`${apiBaseUrl}/api/upload/image`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    body: formData,
  })

  if (!response.ok) {
    const error = await response.json() as { error?: string }

    // 如果是认证错误，清除本地存储的认证信息
    if (response.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        window.dispatchEvent(new Event('user-logout'))
      }
      throw new Error('登录已过期，请重新登录')
    }

    throw new Error(error.error || '上传失败')
  }

  const data = await response.json() as { url: string; filename: string }
  return { url: data.url, filename: data.filename }
}

/**
 * 删除上传的图片
 */
export async function deleteImage(filename: string): Promise<void> {
  const token = getToken()

  if (!token) {
    throw new Error('请先登录')
  }

  const apiBaseUrl = typeof window !== 'undefined'
    ? process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787'
    : process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787'

  // 直接拼接文件名，不使用 encodeURIComponent，因为后端使用通配符路由
  const response = await fetch(`${apiBaseUrl}/api/upload/image/${filename}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  })

  if (!response.ok) {
    const error = await response.json() as { error?: string }

    // 如果是认证错误，清除本地存储的认证信息
    if (response.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        window.dispatchEvent(new Event('user-logout'))
      }
      throw new Error('登录已过期，请重新登录')
    }

    throw new Error(error.error || '删除失败')
  }
}
