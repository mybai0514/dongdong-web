'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { createPortal } from 'react-dom'
import {
  ArrowLeft,
  Eye,
  ThumbsUp,
  ThumbsDown,
  MessageSquare,
  Clock,
  Loader2,
  Pin,
  ZoomIn,
  X,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'
import { formatTimeForDisplay } from '@/lib/time'
import { useUser } from '@/hooks'
import { getForumPost, likeForumPost, unlikeForumPost, dislikeForumPost, undislikeForumPost } from '@/lib/api'
import type { ForumPost } from '@/types'

export default function PostDetailPage() {
  const params = useParams()
  const router = useRouter()
  const user = useUser()
  const postId = parseInt(params.postId as string)
  const categorySlug = params.slug as string

  const [post, setPost] = useState<ForumPost | null>(null)
  const [loading, setLoading] = useState(true)
  const [likePending, setLikePending] = useState(false)
  const [dislikePending, setDislikePending] = useState(false)
  const [imagePreviewOpen, setImagePreviewOpen] = useState(false)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [images, setImages] = useState<string[]>([])
  // const lastFetchedPostId = useRef<number | null>(null)

  useEffect(() => {
    // 防止 React Strict Mode 下重复调用
    // if (lastFetchedPostId.current === postId) return
    // lastFetchedPostId.current = postId

    fetchPost()
  }, [postId])

  const fetchPost = async () => {
    setLoading(true)
    try {
      const data = await getForumPost(postId)
      setPost(data.post)

      // 解析图片数据
      if (data.post.images) {
        try {
          const parsedImages = JSON.parse(data.post.images)
          if (Array.isArray(parsedImages)) {
            setImages(parsedImages)
          }
        } catch (e) {
          console.error('解析图片数据失败:', e)
        }
      }
    } catch (error) {
      console.error('获取帖子详情失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleImageClick = (index: number) => {
    setCurrentImageIndex(index)
    setImagePreviewOpen(true)
  }

  const handleLike = async () => {
    if (!user) {
      router.push(`/login?redirect=/forum/${categorySlug}/${postId}`)
      return
    }

    if (likePending) return

    setLikePending(true)
    try {
      if (post?.isLiked) {
        const data = await unlikeForumPost(postId)
        setPost(prev => prev ? { ...prev, isLiked: false, likes_count: data.likes_count } : null)
      } else {
        const data = await likeForumPost(postId)
        setPost(prev => prev ? { ...prev, isLiked: true, likes_count: data.likes_count } : null)
      }
    } catch (error) {
      console.error('点赞操作失败:', error)
      toast.error('操作失败，请重试')
    } finally {
      setLikePending(false)
    }
  }

  const handleDislike = async () => {
    if (!user) {
      router.push(`/login?redirect=/forum/${categorySlug}/${postId}`)
      return
    }

    if (dislikePending) return

    setDislikePending(true)
    try {
      if (post?.isDisliked) {
        const data = await undislikeForumPost(postId)
        setPost(prev => prev ? { ...prev, isDisliked: false, dislikes_count: data.dislikes_count } : null)
      } else {
        const data = await dislikeForumPost(postId)
        setPost(prev => prev ? { ...prev, isDisliked: true, dislikes_count: data.dislikes_count } : null)
      }
    } catch (error) {
      console.error('反赞操作失败:', error)
      toast.error('操作失败，请重试')
    } finally {
      setDislikePending(false)
    }
  }

  const getCategoryColor = (slug: string) => {
    if (slug === 'lusty') {
      return {
        badge: 'bg-orange-100 text-orange-700 border-orange-200'
      }
    } else if (slug === 'fishy') {
      return {
        badge: 'bg-blue-100 text-blue-700 border-blue-200'
      }
    }
    return {
      badge: 'bg-gray-100 text-gray-700 border-gray-200'
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex items-center justify-center min-h-100">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">加载中...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!post) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="text-center py-12">
          <h3 className="text-xl font-semibold mb-2">帖子不存在</h3>
          <Link href="/forum">
            <Button>返回论坛首页</Button>
          </Link>
        </div>
      </div>
    )
  }

  const colors = getCategoryColor(post.category_slug || '')

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* 返回按钮 */}
      <div className="mb-6">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          返回 {post?.category_name}
        </Button>
      </div>

      {/* 帖子内容卡片 */}
      <Card className="mb-6">
        <CardHeader>
          <div className="space-y-4">
            {/* 标题和分类 */}
            <div>
              <div className="flex items-start gap-3 mb-3">
                {post.is_pinned && (
                  <Pin className="h-5 w-5 text-orange-500 shrink-0 mt-1" />
                )}
                <h1 className="text-3xl font-bold flex-1">{post.title}</h1>
              </div>
              <Badge variant="outline" className={colors.badge}>
                {post.category_name}
              </Badge>
            </div>

            {/* 作者信息和统计 */}
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarImage src={post.author_avatar || undefined} />
                  <AvatarFallback>{post.author_username?.[0] || 'U'}</AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-medium">{post.author_username}</div>
                  <div className="text-sm text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {post.created_at ? formatTimeForDisplay(post.created_at) : '-'}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Eye className="h-4 w-4" />
                  {post.views_count}
                </span>
                <span className="flex items-center gap-1">
                  <MessageSquare className="h-4 w-4" />
                  {post.comments_count}
                </span>
                <span className="flex items-center gap-1">
                  <ThumbsUp className="h-4 w-4" />
                  {post.likes_count}
                </span>
                <span className="flex items-center gap-1">
                  <ThumbsDown className="h-4 w-4" />
                  {post.dislikes_count}
                </span>
              </div>
            </div>
          </div>
        </CardHeader>

        <Separator />

        <CardContent className="pt-6">
          {/* 帖子内容 */}
          <div className="prose prose-slate max-w-none">
            <div className="whitespace-pre-wrap wrap-break-word">
              {post.content}
            </div>
          </div>

          {/* 帖子图片 */}
          {images.length > 0 && (
            <div className="mt-6">
              <div className="grid grid-cols-5 gap-3">
                {images.map((image: string, index: number) => (
                  <div
                    key={index}
                    className="relative group rounded-lg overflow-hidden border border-muted-foreground/20 cursor-pointer transition-colors"
                    onClick={() => handleImageClick(index)}
                  >
                    <img
                      src={image}
                      alt={`图片 ${index + 1}`}
                      className="w-full h-full object-cover aspect-square"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                    {/* 放大镜图标 */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                      <ZoomIn className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 点赞和反赞按钮 */}
          <div className="mt-8 pt-6 border-t flex gap-3">
            <Button
              variant={post.isLiked ? "default" : "outline"}
              size="lg"
              onClick={handleLike}
              disabled={likePending}
              className="flex-1 sm:flex-none"
            >
              {likePending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <ThumbsUp className={`h-4 w-4 mr-2 ${post.isLiked ? 'fill-current' : ''}`} />
              )}
              {post.isLiked ? '已点赞' : '点赞'} ({post.likes_count})
            </Button>
            <Button
              variant={post.isDisliked ? "destructive" : "outline"}
              size="lg"
              onClick={handleDislike}
              disabled={dislikePending}
              className="flex-1 sm:flex-none"
            >
              {dislikePending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <ThumbsDown className={`h-4 w-4 mr-2 ${post.isDisliked ? 'fill-current' : ''}`} />
              )}
              {post.isDisliked ? '已反赞' : '反赞'} ({post.dislikes_count})
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 图片预览 */}
      {imagePreviewOpen && createPortal(
        <div className="fixed inset-0 z-100 bg-black/80 flex items-center justify-center"
          onClick={() => setImagePreviewOpen(false)}
        >
          {/* 左上角图片计数 */}
          <div className="absolute top-4 left-4 text-white text-base font-medium z-10">
            {currentImageIndex + 1} / {images.length}
          </div>

          {/* 右上角关闭按钮 */}
          <button
            onClick={() => setImagePreviewOpen(false)}
            className="absolute top-3 right-3 z-10 w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10 text-white/80 hover:text-white transition-colors"
          >
            <X className="h-6 w-6" />
          </button>

          {/* 图片 */}
          <img
            src={images[currentImageIndex]}
            alt={`图片 ${currentImageIndex + 1}`}
            className="max-w-full max-h-full object-contain select-none"
            onClick={(e) => e.stopPropagation()}
            draggable={false}
          />

          {/* 左切换按钮 */}
          {images.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length)
              }}
              className="absolute left-3 top-1/2 -translate-y-1/2 z-10 w-10 h-10 flex items-center justify-center rounded-full bg-white/15 hover:bg-white/25 text-white transition-colors"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
          )}

          {/* 右切换按钮 */}
          {images.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                setCurrentImageIndex((prev) => (prev + 1) % images.length)
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 z-10 w-10 h-10 flex items-center justify-center rounded-full bg-white/15 hover:bg-white/25 text-white transition-colors"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          )}

          {/* 底部圆点指示器 */}
          {images.length > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
              {images.map((_, index) => (
                <button
                  key={index}
                  onClick={(e) => {
                    e.stopPropagation()
                    setCurrentImageIndex(index)
                  }}
                  className={`h-2 rounded-full transition-all ${
                    index === currentImageIndex
                      ? 'bg-white w-5'
                      : 'bg-white/40 hover:bg-white/60 w-2'
                  }`}
                />
              ))}
            </div>
          )}
        </div>,
        document.body
      )}

      {/* 评论区域 - 暂时显示占位符 */}
      <Card>
        <CardHeader>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            评论 ({post.comments_count})
          </h2>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>评论功能即将上线</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
