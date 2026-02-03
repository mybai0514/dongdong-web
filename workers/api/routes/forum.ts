import { Hono } from 'hono'
import { drizzle } from 'drizzle-orm/d1'
import { eq, desc, and, inArray } from 'drizzle-orm'
import { forumCategories, forumPosts, forumComments, forumLikes, forumDislikes, users } from '../../../db/schema'
import { authMiddleware } from '../middleware/auth'
import { extractToken, validateToken } from '../utils/token'
import type { Bindings } from '../types'

const forumRouter = new Hono<{ Bindings: Bindings }>()

// ==================== 分类相关 ====================

// 获取所有分类
forumRouter.get('/categories', async (c) => {
  try {
    const db = drizzle(c.env.DB)

    const categories = await db.select().from(forumCategories).all()

    return c.json({ categories })
  } catch (error) {
    console.error('获取分类列表错误:', error)
    return c.json({ error: '获取分类列表失败' }, 500)
  }
})

// 获取特定分类信息
forumRouter.get('/categories/:slug', async (c) => {
  try {
    const slug = c.req.param('slug')
    const db = drizzle(c.env.DB)

    const category = await db.select()
      .from(forumCategories)
      .where(eq(forumCategories.slug, slug))
      .get()

    if (!category) {
      return c.json({ error: '分类不存在' }, 404)
    }

    return c.json({ category })
  } catch (error) {
    console.error('获取分类信息错误:', error)
    return c.json({ error: '获取分类信息失败' }, 500)
  }
})

// ==================== 帖子列表与详情 ====================

// 获取分类下的帖子列表（支持分页、排序）
forumRouter.get('/:categorySlug/posts', async (c) => {
  try {
    const categorySlug = c.req.param('categorySlug')
    const page = parseInt(c.req.query('page') || '1')
    const limit = parseInt(c.req.query('limit') || '10')
    const sort = c.req.query('sort') || 'latest' // latest, views, likes
    const search = c.req.query('search')
    const token = extractToken(c.req.header('Authorization'))

    const db = drizzle(c.env.DB)

    // 获取分类 ID
    const category = await db.select()
      .from(forumCategories)
      .where(eq(forumCategories.slug, categorySlug))
      .get()

    if (!category) {
      return c.json({ error: '分类不存在' }, 404)
    }

    // 查询帖子
    let query = db.select({
      id: forumPosts.id,
      category_id: forumPosts.category_id,
      author_id: forumPosts.author_id,
      title: forumPosts.title,
      content: forumPosts.content,
      views_count: forumPosts.views_count,
      comments_count: forumPosts.comments_count,
      likes_count: forumPosts.likes_count,
      dislikes_count: forumPosts.dislikes_count,
      is_pinned: forumPosts.is_pinned,
      status: forumPosts.status,
      created_at: forumPosts.created_at,
      updated_at: forumPosts.updated_at,
      author_username: users.username,
      author_avatar: users.avatar
    })
      .from(forumPosts)
      .leftJoin(users, eq(forumPosts.author_id, users.id))
      .where(and(
        eq(forumPosts.category_id, category.id),
        eq(forumPosts.status, 'published')
      ))

    let allPosts = await query.all()

    // 搜索过滤
    if (search) {
      const searchLower = search.toLowerCase()
      allPosts = allPosts.filter(post =>
        post.title.toLowerCase().includes(searchLower) ||
        post.content.toLowerCase().includes(searchLower)
      )
    }

    // 排序
    if (sort === 'views') {
      allPosts.sort((a, b) => (b.views_count || 0) - (a.views_count || 0))
    } else if (sort === 'likes') {
      allPosts.sort((a, b) => (b.likes_count || 0) - (a.likes_count || 0))
    } else {
      // 默认按创建时间排序，置顶帖子在前
      allPosts.sort((a, b) => {
        if (a.is_pinned && !b.is_pinned) return -1
        if (!a.is_pinned && b.is_pinned) return 1
        const bTime = typeof b.created_at === 'string' ? new Date(b.created_at).getTime() : (b.created_at as Date).getTime()
        const aTime = typeof a.created_at === 'string' ? new Date(a.created_at).getTime() : (a.created_at as Date).getTime()
        return bTime - aTime
      })
    }

    // 计算分页
    const total = allPosts.length
    const totalPages = Math.ceil(total / limit)
    const startIndex = (page - 1) * limit
    const endIndex = startIndex + limit
    const paginatedPosts = allPosts.slice(startIndex, endIndex)

    // 如果用户已登录，查询点赞和反赞状态
    let postsWithLikeStatus = paginatedPosts
    if (token) {
      const user = await validateToken(db, token)
      if (user) {
        const postIds = paginatedPosts.map(p => p.id)
        const likes = await db.select()
          .from(forumLikes)
          .where(and(
            eq(forumLikes.user_id, user.id),
            inArray(forumLikes.post_id, postIds)
          ))
          .all()

        const dislikes = await db.select()
          .from(forumDislikes)
          .where(and(
            eq(forumDislikes.user_id, user.id),
            inArray(forumDislikes.post_id, postIds)
          ))
          .all()

        const likedPostIds = new Set(likes.map(l => l.post_id).filter(Boolean))
        const dislikedPostIds = new Set(dislikes.map(d => d.post_id).filter(Boolean))

        postsWithLikeStatus = paginatedPosts.map(post => ({
          ...post,
          isLiked: likedPostIds.has(post.id),
          isDisliked: dislikedPostIds.has(post.id),
          isAuthor: post.author_id === user.id
        }))
      }
    }

    return c.json({
      posts: postsWithLikeStatus,
      total,
      page,
      limit,
      totalPages,
      category
    })
  } catch (error) {
    console.error('获取帖子列表错误:', error)
    return c.json({ error: '获取帖子列表失败' }, 500)
  }
})

// 获取帖子详情
forumRouter.get('/posts/:postId', async (c) => {
  try {
    const postId = parseInt(c.req.param('postId'))
    const token = extractToken(c.req.header('Authorization'))
    const db = drizzle(c.env.DB)

    // 查询帖子详情
    const post = await db.select({
      id: forumPosts.id,
      category_id: forumPosts.category_id,
      author_id: forumPosts.author_id,
      title: forumPosts.title,
      content: forumPosts.content,
      views_count: forumPosts.views_count,
      comments_count: forumPosts.comments_count,
      likes_count: forumPosts.likes_count,
      dislikes_count: forumPosts.dislikes_count,
      is_pinned: forumPosts.is_pinned,
      status: forumPosts.status,
      created_at: forumPosts.created_at,
      updated_at: forumPosts.updated_at,
      author_username: users.username,
      author_avatar: users.avatar,
      category_name: forumCategories.name,
      category_slug: forumCategories.slug
    })
      .from(forumPosts)
      .leftJoin(users, eq(forumPosts.author_id, users.id))
      .leftJoin(forumCategories, eq(forumPosts.category_id, forumCategories.id))
      .where(eq(forumPosts.id, postId))
      .get()

    if (!post || post.status !== 'published') {
      return c.json({ error: '帖子不存在' }, 404)
    }

    // 增加浏览次数
    await db.update(forumPosts)
      .set({ views_count: (post.views_count || 0) + 1 })
      .where(eq(forumPosts.id, postId))
      .run()

    // 如果用户已登录，查询点赞和反赞状态
    let postWithStatus: any = { ...post, views_count: (post.views_count || 0) + 1 }
    if (token) {
      const user = await validateToken(db, token)
      if (user) {
        const like = await db.select()
          .from(forumLikes)
          .where(and(
            eq(forumLikes.user_id, user.id),
            eq(forumLikes.post_id, postId)
          ))
          .get()

        const dislike = await db.select()
          .from(forumDislikes)
          .where(and(
            eq(forumDislikes.user_id, user.id),
            eq(forumDislikes.post_id, postId)
          ))
          .get()

        postWithStatus = {
          ...postWithStatus,
          isLiked: !!like,
          isDisliked: !!dislike,
          isAuthor: post.author_id === user.id
        }
      }
    }

    return c.json({ post: postWithStatus })
  } catch (error) {
    console.error('获取帖子详情错误:', error)
    return c.json({ error: '获取帖子详情失败' }, 500)
  }
})

// 发布新帖子（需认证）
forumRouter.post('/:categorySlug/posts', authMiddleware, async (c) => {
  try {
    const categorySlug = c.req.param('categorySlug')
    const { title, content } = await c.req.json()
    const user = c.get('user')
    const db = drizzle(c.env.DB)

    // 验证输入
    if (!title || title.trim().length === 0) {
      return c.json({ error: '标题不能为空' }, 400)
    }
    if (title.length > 200) {
      return c.json({ error: '标题不能超过200个字符' }, 400)
    }
    if (!content || content.trim().length === 0) {
      return c.json({ error: '内容不能为空' }, 400)
    }
    if (content.length > 10000) {
      return c.json({ error: '内容不能超过10000个字符' }, 400)
    }

    // 获取分类
    const category = await db.select()
      .from(forumCategories)
      .where(eq(forumCategories.slug, categorySlug))
      .get()

    if (!category) {
      return c.json({ error: '分类不存在' }, 404)
    }

    // 创建帖子
    const result = await db.insert(forumPosts).values({
      category_id: category.id,
      author_id: user.id,
      title: title.trim(),
      content: content.trim(),
      created_at: new Date(),
      updated_at: new Date()
    }).returning().get()

    // 更新分类帖子数
    await db.update(forumCategories)
      .set({ post_count: category.post_count + 1 })
      .where(eq(forumCategories.id, category.id))
      .run()

    return c.json({ post: result }, 201)
  } catch (error) {
    console.error('发布帖子错误:', error)
    return c.json({ error: '发布帖子失败' }, 500)
  }
})

// ==================== 点赞相关 ====================

// 点赞帖子（需认证）
forumRouter.post('/posts/:postId/like', authMiddleware, async (c) => {
  try {
    const postId = parseInt(c.req.param('postId'))
    const user = c.get('user')
    const db = drizzle(c.env.DB)

    // 检查帖子是否存在
    const post = await db.select()
      .from(forumPosts)
      .where(eq(forumPosts.id, postId))
      .get()

    if (!post) {
      return c.json({ error: '帖子不存在' }, 404)
    }

    // 检查是否已点赞
    const existingLike = await db.select()
      .from(forumLikes)
      .where(and(
        eq(forumLikes.user_id, user.id),
        eq(forumLikes.post_id, postId)
      ))
      .get()

    if (existingLike) {
      return c.json({ error: '已经点赞过了' }, 400)
    }

    // 添加点赞记录
    await db.insert(forumLikes).values({
      user_id: user.id,
      post_id: postId,
      comment_id: null,
      created_at: new Date()
    }).run()

    // 更新帖子点赞数
    await db.update(forumPosts)
      .set({ likes_count: post.likes_count + 1 })
      .where(eq(forumPosts.id, postId))
      .run()

    return c.json({
      success: true,
      likes_count: post.likes_count + 1
    })
  } catch (error) {
    console.error('点赞帖子错误:', error)
    return c.json({ error: '点赞失败' }, 500)
  }
})

// 取消点赞帖子（需认证）
forumRouter.delete('/posts/:postId/like', authMiddleware, async (c) => {
  try {
    const postId = parseInt(c.req.param('postId'))
    const user = c.get('user')
    const db = drizzle(c.env.DB)

    // 检查帖子是否存在
    const post = await db.select()
      .from(forumPosts)
      .where(eq(forumPosts.id, postId))
      .get()

    if (!post) {
      return c.json({ error: '帖子不存在' }, 404)
    }

    // 检查是否已点赞
    const existingLike = await db.select()
      .from(forumLikes)
      .where(and(
        eq(forumLikes.user_id, user.id),
        eq(forumLikes.post_id, postId)
      ))
      .get()

    if (!existingLike) {
      return c.json({ error: '还未点赞' }, 400)
    }

    // 删除点赞记录
    await db.delete(forumLikes)
      .where(and(
        eq(forumLikes.user_id, user.id),
        eq(forumLikes.post_id, postId)
      ))
      .run()

    // 更新帖子点赞数
    await db.update(forumPosts)
      .set({ likes_count: Math.max(0, post.likes_count - 1) })
      .where(eq(forumPosts.id, postId))
      .run()

    return c.json({
      success: true,
      likes_count: Math.max(0, post.likes_count - 1)
    })
  } catch (error) {
    console.error('取消点赞错误:', error)
    return c.json({ error: '取消点赞失败' }, 500)
  }
})

// ==================== 反赞相关 ====================

// 反赞帖子（需认证）
forumRouter.post('/posts/:postId/dislike', authMiddleware, async (c) => {
  try {
    const postId = parseInt(c.req.param('postId'))
    const user = c.get('user')
    const db = drizzle(c.env.DB)

    // 检查帖子是否存在
    const post = await db.select()
      .from(forumPosts)
      .where(eq(forumPosts.id, postId))
      .get()

    if (!post) {
      return c.json({ error: '帖子不存在' }, 404)
    }

    // 检查是否已反赞
    const existingDislike = await db.select()
      .from(forumDislikes)
      .where(and(
        eq(forumDislikes.user_id, user.id),
        eq(forumDislikes.post_id, postId)
      ))
      .get()

    if (existingDislike) {
      return c.json({ error: '已经反赞过了' }, 400)
    }

    // 添加反赞记录
    await db.insert(forumDislikes).values({
      user_id: user.id,
      post_id: postId,
      comment_id: null,
      created_at: new Date()
    }).run()

    // 更新帖子反赞数
    await db.update(forumPosts)
      .set({ dislikes_count: post.dislikes_count + 1 })
      .where(eq(forumPosts.id, postId))
      .run()

    return c.json({
      success: true,
      dislikes_count: post.dislikes_count + 1
    })
  } catch (error) {
    console.error('反赞帖子错误:', error)
    return c.json({ error: '反赞失败' }, 500)
  }
})

// 取消反赞帖子（需认证）
forumRouter.delete('/posts/:postId/dislike', authMiddleware, async (c) => {
  try {
    const postId = parseInt(c.req.param('postId'))
    const user = c.get('user')
    const db = drizzle(c.env.DB)

    // 检查帖子是否存在
    const post = await db.select()
      .from(forumPosts)
      .where(eq(forumPosts.id, postId))
      .get()

    if (!post) {
      return c.json({ error: '帖子不存在' }, 404)
    }

    // 检查是否已反赞
    const existingDislike = await db.select()
      .from(forumDislikes)
      .where(and(
        eq(forumDislikes.user_id, user.id),
        eq(forumDislikes.post_id, postId)
      ))
      .get()

    if (!existingDislike) {
      return c.json({ error: '还未反赞' }, 400)
    }

    // 删除反赞记录
    await db.delete(forumDislikes)
      .where(and(
        eq(forumDislikes.user_id, user.id),
        eq(forumDislikes.post_id, postId)
      ))
      .run()

    // 更新帖子反赞数
    await db.update(forumPosts)
      .set({ dislikes_count: Math.max(0, post.dislikes_count - 1) })
      .where(eq(forumPosts.id, postId))
      .run()

    return c.json({
      success: true,
      dislikes_count: Math.max(0, post.dislikes_count - 1)
    })
  } catch (error) {
    console.error('取消反赞错误:', error)
    return c.json({ error: '取消反赞失败' }, 500)
  }
})

// 反赞评论（需认证）
forumRouter.post('/comments/:commentId/dislike', authMiddleware, async (c) => {
  try {
    const commentId = parseInt(c.req.param('commentId'))
    const user = c.get('user')
    const db = drizzle(c.env.DB)

    // 检查评论是否存在
    const comment = await db.select()
      .from(forumComments)
      .where(eq(forumComments.id, commentId))
      .get()

    if (!comment) {
      return c.json({ error: '评论不存在' }, 404)
    }

    // 检查是否已反赞
    const existingDislike = await db.select()
      .from(forumDislikes)
      .where(and(
        eq(forumDislikes.user_id, user.id),
        eq(forumDislikes.comment_id, commentId)
      ))
      .get()

    if (existingDislike) {
      return c.json({ error: '已经反赞过了' }, 400)
    }

    // 添加反赞记录
    await db.insert(forumDislikes).values({
      user_id: user.id,
      post_id: null,
      comment_id: commentId,
      created_at: new Date()
    }).run()

    // 更新评论反赞数
    await db.update(forumComments)
      .set({ dislikes_count: comment.dislikes_count + 1 })
      .where(eq(forumComments.id, commentId))
      .run()

    return c.json({
      success: true,
      dislikes_count: comment.dislikes_count + 1
    })
  } catch (error) {
    console.error('反赞评论错误:', error)
    return c.json({ error: '反赞失败' }, 500)
  }
})

// 取消反赞评论（需认证）
forumRouter.delete('/comments/:commentId/dislike', authMiddleware, async (c) => {
  try {
    const commentId = parseInt(c.req.param('commentId'))
    const user = c.get('user')
    const db = drizzle(c.env.DB)

    // 检查评论是否存在
    const comment = await db.select()
      .from(forumComments)
      .where(eq(forumComments.id, commentId))
      .get()

    if (!comment) {
      return c.json({ error: '评论不存在' }, 404)
    }

    // 检查是否已反赞
    const existingDislike = await db.select()
      .from(forumDislikes)
      .where(and(
        eq(forumDislikes.user_id, user.id),
        eq(forumDislikes.comment_id, commentId)
      ))
      .get()

    if (!existingDislike) {
      return c.json({ error: '还未反赞' }, 400)
    }

    // 删除反赞记录
    await db.delete(forumDislikes)
      .where(and(
        eq(forumDislikes.user_id, user.id),
        eq(forumDislikes.comment_id, commentId)
      ))
      .run()

    // 更新评论反赞数
    await db.update(forumComments)
      .set({ dislikes_count: Math.max(0, comment.dislikes_count - 1) })
      .where(eq(forumComments.id, commentId))
      .run()

    return c.json({
      success: true,
      dislikes_count: Math.max(0, comment.dislikes_count - 1)
    })
  } catch (error) {
    console.error('取消反赞评论错误:', error)
    return c.json({ error: '取消反赞失败' }, 500)
  }
})

export default forumRouter
