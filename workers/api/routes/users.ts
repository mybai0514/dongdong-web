import { Hono } from 'hono'
import { drizzle } from 'drizzle-orm/d1'
import { eq, desc, or } from 'drizzle-orm'
import { users, teams, teamMembers, reviews } from '../../../db/schema'
import { authMiddleware } from '../middleware/auth'
import { extractToken, validateToken } from '../utils/token'
import type { Bindings } from '../types'

const usersRouter = new Hono<{ Bindings: Bindings }>()

// 获取用户信息
usersRouter.get('/:id', async (c) => {
  try {
    const id = c.req.param('id')
    const db = drizzle(c.env.DB)

    const user = await db.select({
      id: users.id,
      email: users.email,
      username: users.username,
      avatar: users.avatar,
      wechat: users.wechat,
      qq: users.qq,
      yy: users.yy,
      wechat_visible: users.wechat_visible,
      qq_visible: users.qq_visible,
      yy_visible: users.yy_visible,
      created_at: users.created_at
    }).from(users).where(eq(users.id, Number(id))).get()

    if (!user) {
      return c.json({ error: '用户不存在' }, 404)
    }

    return c.json(user)
  } catch (error) {
    console.error('获取用户信息错误:', error)
    return c.json({ error: '获取用户信息失败' }, 500)
  }
})

// 获取用户发起的队伍
usersRouter.get('/:id/teams', authMiddleware, async (c) => {
  try {
    const userId = Number(c.req.param('id'))
    const currentUser = c.get('user')
    const db = drizzle(c.env.DB)

    const userTeams = await db.select()
      .from(teams)
      .where(eq(teams.creator_id, userId))
      .orderBy(desc(teams.created_at))
      .all()

    // 如果查看的是自己的队伍，加入评分状态
    if (currentUser.id === userId) {
      const ratingRecords = await db.select({
        team_id: reviews.team_id
      })
        .from(reviews)
        .where(eq(reviews.reviewer_id, currentUser.id))
        .all()

      const ratedTeamIds = new Set(ratingRecords.map(r => r.team_id))

      return c.json(userTeams.map(team => ({
        ...team,
        hasRated: ratedTeamIds.has(team.id)
      })))
    }

    return c.json(userTeams)
  } catch (error) {
    console.error('获取用户队伍错误:', error)
    return c.json({ error: '获取队伍失败' }, 500)
  }
})

// 获取指定用户加入的队伍
usersRouter.get('/:id/joined-teams', authMiddleware, async (c) => {
  try {
    const userId = Number(c.req.param('id'))
    const currentUser = c.get('user')
    const db = drizzle(c.env.DB)

    // 获取用户加入的队伍
    const memberRecords = await db.select()
      .from(teamMembers)
      .where(eq(teamMembers.user_id, userId))
      .all()

    if (memberRecords.length === 0) {
      return c.json([])
    }

    // 获取队伍详情
    const teamIds = memberRecords.map(m => m.team_id)
    const joinedTeams = await db.select()
      .from(teams)
      .where(or(...teamIds.map(id => eq(teams.id, id))))
      .orderBy(desc(teams.created_at))
      .all()

    // 如果查看的是自己的队伍，加入评分状态
    if (currentUser.id === userId) {
      const ratingRecords = await db.select({
        team_id: reviews.team_id
      })
        .from(reviews)
        .where(eq(reviews.reviewer_id, currentUser.id))
        .all()

      const ratedTeamIds = new Set(ratingRecords.map(r => r.team_id))

      return c.json(joinedTeams.map(team => ({
        ...team,
        hasRated: ratedTeamIds.has(team.id)
      })))
    }

    return c.json(joinedTeams)
  } catch (error) {
    console.error('获取用户加入的队伍错误:', error)
    return c.json({ error: '获取队伍失败' }, 500)
  }
})

// 更新用户信息
usersRouter.put('/:id', authMiddleware, async (c) => {
  try {
    const userId = c.req.param('id')
    const user = c.get('user')

    // 只能更新自己的信息
    if (user.id !== Number(userId)) {
      return c.json({ error: '无权限修改他人信息' }, 403)
    }

    const { wechat, qq, yy, wechat_visible, qq_visible, yy_visible } = await c.req.json()
    const db = drizzle(c.env.DB)

    await db.update(users)
      .set({
        wechat: wechat || null,
        qq: qq || null,
        yy: yy || null,
        wechat_visible: wechat_visible !== undefined ? wechat_visible : true,
        qq_visible: qq_visible !== undefined ? qq_visible : true,
        yy_visible: yy_visible !== undefined ? yy_visible : true
      })
      .where(eq(users.id, Number(userId)))
      .run()

    return c.json({ success: true, message: '更新成功' })
  } catch (error) {
    console.error('更新用户信息错误:', error)
    return c.json({ error: '更新失败' }, 500)
  }
})

// 获取用户信誉统计
usersRouter.get('/:id/reputation', async (c) => {
  try {
    const userId = c.req.param('id')
    const db = drizzle(c.env.DB)

    // 获取用户收到的所有评分
    const userReviews = await db.select({
      rating: reviews.rating,
      tags: reviews.tags
    })
      .from(reviews)
      .where(eq(reviews.reviewee_id, Number(userId)))
      .all()

    if (userReviews.length === 0) {
      return c.json({
        totalReviews: 0,
        averageRating: 0,
        tagStats: {}
      })
    }

    // 计算平均评分
    const totalRating = userReviews.reduce((sum, review) => sum + review.rating, 0)
    const averageRating = totalRating / userReviews.length

    // 统计标签出现次数
    const tagStats: Record<string, number> = {}
    userReviews.forEach(review => {
      if (review.tags) {
        try {
          const tags = JSON.parse(review.tags)
          if (Array.isArray(tags)) {
            tags.forEach(tag => {
              tagStats[tag] = (tagStats[tag] || 0) + 1
            })
          }
        } catch (error) {
          console.error('解析标签错误:', error)
        }
      }
    })

    return c.json({
      totalReviews: userReviews.length,
      averageRating: Math.round(averageRating * 10) / 10, // 保留一位小数
      tagStats
    })
  } catch (error) {
    console.error('获取用户信誉错误:', error)
    return c.json({ error: '获取信誉失败' }, 500)
  }
})

export default usersRouter
