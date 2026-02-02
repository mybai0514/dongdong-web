import { Hono } from 'hono'
import { drizzle } from 'drizzle-orm/d1'
import { eq, desc, and } from 'drizzle-orm'
import { teams, teamMembers, users, reviews } from '../../../db/schema'
import { authMiddleware } from '../middleware/auth'
import { extractToken, validateToken } from '../utils/token'
import { getNowUTC8, isSameDayUTC8 } from '../utils/time'
import type { Bindings } from '../types'

const teamsRouter = new Hono<{ Bindings: Bindings }>()

// 获取所有组队信息（支持筛选和分页）
teamsRouter.get('/', async (c) => {
  try {
    const game = c.req.query('game')
    const status = c.req.query('status') || 'open'
    const search = c.req.query('search')
    const date = c.req.query('date')
    const page = parseInt(c.req.query('page') || '1')
    const limit = parseInt(c.req.query('limit') || '9')
    const token = extractToken(c.req.header('Authorization'))

    const db = drizzle(c.env.DB)

    // 构建查询条件
    const conditions = []
    if (game) conditions.push(eq(teams.game, game))
    if (status) conditions.push(eq(teams.status, status))

    let query = db.select().from(teams)

    if (conditions.length > 0) {
      query = query.where(conditions.length === 1 ? conditions[0] : and(...conditions)) as any
    }

    let allTeams = await query.orderBy(desc(teams.created_at)).all()

    // 搜索过滤：支持 ID、标题、描述的模糊搜索
    if (search) {
      const searchLower = search.toLowerCase().trim()
      // 检查是否是纯数字（ID 搜索）
      const isNumeric = /^\d+$/.test(searchLower)

      allTeams = allTeams.filter(team => {
        // 如果搜索词是数字，优先按 ID 精确匹配
        if (isNumeric) {
          const searchId = parseInt(searchLower)
          if (team.id === searchId) {
            return true
          }
        }

        // 其次按标题和描述进行模糊匹配
        return (
          team.title.toLowerCase().includes(searchLower) ||
          (team.description && team.description.toLowerCase().includes(searchLower))
        )
      })
    }

    // 日期筛选
    if (date) {
      allTeams = allTeams.filter(team => {
        try {
          // 使用 UTC+8 时区比较日期
          return isSameDayUTC8(team.start_time, date)
        } catch (error) {
          console.error('日期解析错误:', error, team.start_time)
          return false
        }
      })
    }

    // 过滤已过期的队伍（使用 UTC+8 时区比较）
    const now = getNowUTC8()
    allTeams = allTeams.filter(team => new Date(team.end_time) >= now)

    // 计算分页
    const total = allTeams.length
    const totalPages = Math.ceil(total / limit)
    const startIndex = (page - 1) * limit
    const endIndex = startIndex + limit
    const paginatedTeams = allTeams.slice(startIndex, endIndex)

    // 如果用户已登录，批量查询成员状态
    let teamsWithMembership = paginatedTeams
    if (token) {
      const user = await validateToken(db, token)
      if (user) {
        const memberships = await db.select()
          .from(teamMembers)
          .where(eq(teamMembers.user_id, user.id))
          .all()

        const membershipMap = new Map(memberships.map(m => [m.team_id, true]))

        teamsWithMembership = paginatedTeams.map(team => ({
          ...team,
          isMember: team.creator_id === user.id || membershipMap.has(team.id),
          isCreator: team.creator_id === user.id
        }))
      }
    }

    return c.json({
      teams: teamsWithMembership,
      total,
      page,
      limit,
      totalPages
    })
  } catch (error) {
    console.error('获取组队列表错误:', error)
    return c.json({ error: '获取组队列表失败' }, 500)
  }
})

// 获取单个组队详情
teamsRouter.get('/:id', async (c) => {
  try {
    const id = c.req.param('id')
    const db = drizzle(c.env.DB)

    const team = await db.select().from(teams).where(eq(teams.id, Number(id))).get()

    if (!team) {
      return c.json({ error: '组队信息不存在' }, 404)
    }

    return c.json(team)
  } catch (error) {
    console.error('获取组队详情错误:', error)
    return c.json({ error: '获取组队详情失败' }, 500)
  }
})

// 创建新的组队
teamsRouter.post('/', async (c) => {
  try {
    let body
    try {
      body = await c.req.json()
    } catch (parseError) {
      console.error('JSON 解析错误:', parseError)
      return c.json({ error: '请求数据格式错误' }, 400)
    }

    const {
      game,
      title,
      description,
      rank_requirement,
      start_time,
      end_time,
      contact_method,
      contact_value,
      creator_id,
      max_members
    } = body

    // 验证必填字段
    if (!game || !title || !contact_method || !contact_value || !creator_id || !start_time || !end_time) {
      return c.json({
        error: '游戏、标题、开始时间、结束时间、联系方式和创建者ID不能为空',
        received: { game, title, start_time, end_time, contact_method, contact_value, creator_id }
      }, 400)
    }

    const db = drizzle(c.env.DB)

    const result = await db.insert(teams).values({
      game,
      title,
      description: description || null,
      rank_requirement: rank_requirement || null,
      start_time: new Date(start_time),
      end_time: new Date(end_time),
      contact_method,
      contact_value,
      creator_id,
      status: 'open',
      member_count: 1,
      max_members: max_members || 5,
      created_at: new Date(),
      updated_at: new Date()
    }).run()

    console.log('✅ 组队创建成功:', result.meta.last_row_id)

    return c.json({
      success: true,
      teamId: result.meta.last_row_id,
      message: '组队创建成功'
    })
  } catch (error) {
    console.error('创建组队错误:', error)
    return c.json({ error: '创建组队失败', details: String(error) }, 500)
  }
})

// 更新组队信息
teamsRouter.put('/:id', async (c) => {
  try {
    const id = c.req.param('id')
    const body = await c.req.json()

    console.log('收到更新请求，body:', JSON.stringify(body))

    const db = drizzle(c.env.DB)

    // 只提取允许更新的字段
    const updates: any = {
      updated_at: new Date()
    }

    // 允许更新的字段列表
    const allowedFields = [
      'title',
      'description',
      'rank_requirement',
      'contact_method',
      'contact_value',
      'max_members',
      'status',
      'start_time',
      'end_time'
    ]

    // 只更新允许的字段
    allowedFields.forEach(field => {
      if (body[field] !== undefined) {
        // 时间字段需要转换为 Date 对象
        if (field === 'start_time' || field === 'end_time') {
          updates[field] = new Date(body[field])
        } else {
          updates[field] = body[field]
        }
      }
    })

    console.log('准备更新的数据:', JSON.stringify(updates))

    await db.update(teams)
      .set(updates)
      .where(eq(teams.id, Number(id)))
      .run()

    return c.json({ success: true, message: '更新成功' })
  } catch (error) {
    console.error('更新组队信息错误:', error)
    return c.json({ error: '更新组队信息失败', details: String(error) }, 500)
  }
})

// 删除组队
teamsRouter.delete('/:id', async (c) => {
  try {
    const id = c.req.param('id')
    const db = drizzle(c.env.DB)

    await db.delete(teams).where(eq(teams.id, Number(id))).run()

    return c.json({ success: true, message: '删除成功' })
  } catch (error) {
    console.error('删除组队错误:', error)
    return c.json({ error: '删除组队失败' }, 500)
  }
})

// 加入队伍
teamsRouter.post('/:id/join', authMiddleware, async (c) => {
  try {
    const teamId = c.req.param('id')
    const db = drizzle(c.env.DB)
    const user = c.get('user')

    // 获取队伍信息
    const team = await db.select().from(teams).where(eq(teams.id, Number(teamId))).get()
    if (!team) {
      return c.json({ error: '队伍不存在' }, 404)
    }

    // 检查队伍状态
    if (team.status !== 'open') {
      return c.json({ error: '该队伍已关闭或满员' }, 400)
    }

    // 检查是否已经是队长
    if (team.creator_id === user.id) {
      return c.json({ error: '你已经是队长了' }, 400)
    }

    // 检查是否已加入
    const existingMember = await db.select()
      .from(teamMembers)
      .where(
        and(
          eq(teamMembers.team_id, Number(teamId)),
          eq(teamMembers.user_id, user.id)
        )
      )
      .get()

    if (existingMember) {
      return c.json({ error: '你已经加入该队伍了' }, 400)
    }

    // 检查人数是否已满
    if (team.member_count >= team.max_members) {
      return c.json({ error: '队伍已满员' }, 400)
    }

    // 加入队伍
    await db.insert(teamMembers).values({
      team_id: Number(teamId),
      user_id: user.id,
      joined_at: new Date()
    }).run()

    // 更新队伍人数
    await db.update(teams)
      .set({
        member_count: team.member_count + 1,
        status: (team.member_count + 1) >= team.max_members ? 'full' : 'open',
        updated_at: new Date()
      })
      .where(eq(teams.id, Number(teamId)))
      .run()

    console.log(`✅ 用户 ${user.id} 加入队伍 ${teamId}`)

    return c.json({
      success: true,
      message: '加入成功',
      contact: {
        method: team.contact_method,
        value: team.contact_value
      }
    })
  } catch (error) {
    console.error('加入队伍错误:', error)
    return c.json({ error: '加入失败' }, 500)
  }
})

// 检查用户是否已加入队伍
teamsRouter.get('/:id/check-membership', async (c) => {
  try {
    const teamId = c.req.param('id')
    const token = extractToken(c.req.header('Authorization'))

    if (!token) {
      return c.json({ isMember: false, isCreator: false })
    }

    const db = drizzle(c.env.DB)
    const user = await validateToken(db, token)

    if (!user) {
      return c.json({ isMember: false, isCreator: false })
    }

    // 检查是否是队长
    const team = await db.select().from(teams).where(eq(teams.id, Number(teamId))).get()
    if (!team) {
      return c.json({ isMember: false, isCreator: false })
    }

    if (team.creator_id === user.id) {
      return c.json({
        isMember: true,
        isCreator: true,
        contact: {
          method: team.contact_method,
          value: team.contact_value
        }
      })
    }

    // 检查是否是队员
    const member = await db.select()
      .from(teamMembers)
      .where(
        and(
          eq(teamMembers.team_id, Number(teamId)),
          eq(teamMembers.user_id, user.id)
        )
      )
      .get()

    if (member) {
      return c.json({
        isMember: true,
        isCreator: false,
        contact: {
          method: team.contact_method,
          value: team.contact_value
        }
      })
    }

    return c.json({ isMember: false, isCreator: false })
  } catch (error) {
    console.error('检查成员错误:', error)
    return c.json({ isMember: false, isCreator: false })
  }
})

// 退出队伍
teamsRouter.post('/:id/leave', authMiddleware, async (c) => {
  try {
    const teamId = c.req.param('id')
    const db = drizzle(c.env.DB)
    const user = c.get('user')

    // 获取队伍信息
    const team = await db.select().from(teams).where(eq(teams.id, Number(teamId))).get()
    if (!team) {
      return c.json({ error: '队伍不存在' }, 404)
    }

    // 队长不能退出自己的队伍
    if (team.creator_id === user.id) {
      return c.json({ error: '队长不能退出自己的队伍，请解散队伍' }, 400)
    }

    // 检查是否是队员
    const member = await db.select()
      .from(teamMembers)
      .where(
        and(
          eq(teamMembers.team_id, Number(teamId)),
          eq(teamMembers.user_id, user.id)
        )
      )
      .get()

    if (!member) {
      return c.json({ error: '你不是该队伍的成员' }, 400)
    }

    // 删除成员记录
    await db.delete(teamMembers)
      .where(
        and(
          eq(teamMembers.team_id, Number(teamId)),
          eq(teamMembers.user_id, user.id)
        )
      )
      .run()

    // 更新队伍人数
    await db.update(teams)
      .set({
        member_count: team.member_count - 1,
        status: 'open', // 有人退出后重新开放
        updated_at: new Date()
      })
      .where(eq(teams.id, Number(teamId)))
      .run()

    console.log(`✅ 用户 ${user.id} 退出队伍 ${teamId}`)

    return c.json({
      success: true,
      message: '已退出队伍'
    })
  } catch (error) {
    console.error('退出队伍错误:', error)
    return c.json({ error: '退出失败' }, 500)
  }
})

// 获取队伍成员列表
teamsRouter.get('/:id/members', async (c) => {
  try {
    const teamId = c.req.param('id')
    const db = drizzle(c.env.DB)

    // 检查队伍是否存在
    const team = await db.select().from(teams).where(eq(teams.id, Number(teamId))).get()
    if (!team) {
      return c.json({ error: '队伍不存在' }, 404)
    }

    // 获取成员列表（带用户名）
    const memberRecords = await db.select({
      id: teamMembers.id,
      user_id: teamMembers.user_id,
      joined_at: teamMembers.joined_at
    })
      .from(teamMembers)
      .where(eq(teamMembers.team_id, Number(teamId)))
      .all()

    // 获取用户名
    const membersWithUsername = await Promise.all(
      memberRecords.map(async (member) => {
        const memberUser = await db.select({ username: users.username })
          .from(users)
          .where(eq(users.id, member.user_id))
          .get()
        return {
          ...member,
          username: memberUser?.username || '未知用户'
        }
      })
    )

    // 添加队长到成员列表
    const creator = await db.select({
      id: users.id,
      username: users.username
    })
      .from(users)
      .where(eq(users.id, team.creator_id))
      .get()

    // 将队长添加到列表开头
    const allMembers = [
      {
        id: 0, // 队长没有 teamMembers 记录，使用 0 作为 id
        user_id: team.creator_id,
        username: creator?.username || '未知用户',
        joined_at: team.created_at, // 队长的加入时间就是队伍创建时间
        isCreator: true
      },
      ...membersWithUsername.map(member => ({
        ...member,
        isCreator: false
      }))
    ]

    return c.json(allMembers)
  } catch (error) {
    console.error('获取成员列表错误:', error)
    return c.json({ error: '获取成员列表失败' }, 500)
  }
})

// 踢出成员
teamsRouter.delete('/:id/members/:userId', authMiddleware, async (c) => {
  try {
    const teamId = c.req.param('id')
    const targetUserId = c.req.param('userId')
    const db = drizzle(c.env.DB)
    const user = c.get('user')

    // 检查是否是队长
    const team = await db.select().from(teams).where(eq(teams.id, Number(teamId))).get()
    if (!team) {
      return c.json({ error: '队伍不存在' }, 404)
    }

    if (team.creator_id !== user.id) {
      return c.json({ error: '只有队长可以踢出成员' }, 403)
    }

    // 不能踢出自己
    if (Number(targetUserId) === user.id) {
      return c.json({ error: '不能踢出自己' }, 400)
    }

    // 检查目标用户是否是队员
    const member = await db.select()
      .from(teamMembers)
      .where(
        and(
          eq(teamMembers.team_id, Number(teamId)),
          eq(teamMembers.user_id, Number(targetUserId))
        )
      )
      .get()

    if (!member) {
      return c.json({ error: '该用户不是队伍成员' }, 400)
    }

    // 删除成员记录
    await db.delete(teamMembers)
      .where(
        and(
          eq(teamMembers.team_id, Number(teamId)),
          eq(teamMembers.user_id, Number(targetUserId))
        )
      )
      .run()

    // 更新队伍人数
    await db.update(teams)
      .set({
        member_count: team.member_count - 1,
        status: 'open',
        updated_at: new Date()
      })
      .where(eq(teams.id, Number(teamId)))
      .run()

    console.log(`✅ 队长 ${user.id} 踢出成员 ${targetUserId} 从队伍 ${teamId}`)

    return c.json({
      success: true,
      message: '已踢出成员'
    })
  } catch (error) {
    console.error('踢出成员错误:', error)
    return c.json({ error: '踢出失败' }, 500)
  }
})

// 提交队伍评分
teamsRouter.post('/:id/ratings', authMiddleware, async (c) => {
  try {
    const teamId = c.req.param('id')
    const db = drizzle(c.env.DB)
    const user = c.get('user')

    let body
    try {
      body = await c.req.json()
    } catch (parseError) {
      console.error('JSON 解析错误:', parseError)
      return c.json({ error: '请求数据格式错误' }, 400)
    }

    const { ratings } = body

    if (!ratings || !Array.isArray(ratings)) {
      return c.json({ error: '评分数据格式错误' }, 400)
    }

    // 检查队伍是否存在
    const team = await db.select().from(teams).where(eq(teams.id, Number(teamId))).get()
    if (!team) {
      return c.json({ error: '队伍不存在' }, 404)
    }

    // 检查队伍是否已完成（使用 UTC+8 时区比较）
    const now = getNowUTC8()
    if (team.end_time > now) {
      return c.json({ error: '只能对已完成的队伍进行评分' }, 400)
    }

    // 检查用户是否是队伍成员
    const isCreator = team.creator_id === user.id
    const isMember = await db.select()
      .from(teamMembers)
      .where(
        and(
          eq(teamMembers.team_id, Number(teamId)),
          eq(teamMembers.user_id, user.id)
        )
      )
      .get()

    if (!isCreator && !isMember) {
      return c.json({ error: '只有队伍成员可以评分' }, 403)
    }

    // 检查是否已经评分过
    const existingRating = await db.select()
      .from(reviews)
      .where(
        and(
          eq(reviews.team_id, Number(teamId)),
          eq(reviews.reviewer_id, user.id)
        )
      )
      .get()

    if (existingRating) {
      return c.json({ error: '你已经对这个队伍进行过评分了' }, 400)
    }

    // 批量插入评分
    for (const rating of ratings) {
      const { userId, rating: score, tags } = rating

      // 验证评分数据
      if (!userId || !score || score < 1 || score > 5) {
        return c.json({ error: '评分数据无效' }, 400)
      }

      // 不能给自己评分
      if (userId === user.id) {
        continue
      }

      // 插入评分记录
      await db.insert(reviews).values({
        reviewer_id: user.id,
        reviewee_id: userId,
        team_id: Number(teamId),
        rating: score,
        tags: JSON.stringify(tags || []),
        comment: null,
        created_at: new Date()
      }).run()
    }

    console.log(`✅ 用户 ${user.id} 对队伍 ${teamId} 提交了评分`)

    return c.json({
      success: true,
      message: '评分提交成功'
    })
  } catch (error) {
    console.error('提交评分错误:', error)
    return c.json({ error: '提交评分失败', details: String(error) }, 500)
  }
})

// 获取队伍评分状态
teamsRouter.get('/:id/ratings/status', authMiddleware, async (c) => {
  try {
    const teamId = c.req.param('id')
    const db = drizzle(c.env.DB)
    const user = c.get('user')

    // 检查用户是否已经对该队伍评分
    const existingRating = await db.select()
      .from(reviews)
      .where(
        and(
          eq(reviews.team_id, Number(teamId)),
          eq(reviews.reviewer_id, user.id)
        )
      )
      .get()

    return c.json({
      hasRated: !!existingRating
    })
  } catch (error) {
    console.error('获取评分状态错误:', error)
    return c.json({ error: '获取评分状态失败' }, 500)
  }
})

// 批量获取队伍评分状态
teamsRouter.post('/ratings/status/batch', authMiddleware, async (c) => {
  try {
    const db = drizzle(c.env.DB)
    const user = c.get('user')

    let body
    try {
      body = await c.req.json()
    } catch (parseError) {
      console.error('JSON 解析错误:', parseError)
      return c.json({ error: '请求数据格式错误' }, 400)
    }

    const { teamIds } = body

    if (!teamIds || !Array.isArray(teamIds) || teamIds.length === 0) {
      return c.json({ error: '队伍ID列表不能为空' }, 400)
    }

    // 查询用户对这些队伍的所有评分记录
    const ratings = await db.select({
      team_id: reviews.team_id
    })
      .from(reviews)
      .where(eq(reviews.reviewer_id, user.id))
      .all()

    // 构建已评分的队伍ID集合
    const ratedTeamIds = new Set(ratings.map(r => r.team_id))

    // 返回每个队伍的评分状态
    const result: Record<number, boolean> = {}
    teamIds.forEach((teamId: number) => {
      result[teamId] = ratedTeamIds.has(teamId)
    })

    return c.json(result)
  } catch (error) {
    console.error('批量获取评分状态错误:', error)
    return c.json({ error: '批量获取评分状态失败' }, 500)
  }
})

// 获取用户对队伍的评分详情
teamsRouter.get('/:id/ratings/my', authMiddleware, async (c) => {
  try {
    const teamId = c.req.param('id')
    const db = drizzle(c.env.DB)
    const user = c.get('user')

    // 获取用户对该队伍的所有评分记录
    const ratings = await db.select({
      id: reviews.id,
      reviewee_id: reviews.reviewee_id,
      rating: reviews.rating,
      tags: reviews.tags,
      comment: reviews.comment,
      created_at: reviews.created_at
    })
      .from(reviews)
      .where(
        and(
          eq(reviews.team_id, Number(teamId)),
          eq(reviews.reviewer_id, user.id)
        )
      )
      .all()

    // 获取被评分者的用户名
    const ratingsWithUsername = await Promise.all(
      ratings.map(async (rating) => {
        const reviewee = await db.select({ username: users.username })
          .from(users)
          .where(eq(users.id, rating.reviewee_id))
          .get()

        return {
          ...rating,
          username: reviewee?.username || '未知用户',
          tags: rating.tags ? JSON.parse(rating.tags) : []
        }
      })
    )

    return c.json(ratingsWithUsername)
  } catch (error) {
    console.error('获取评分详情错误:', error)
    return c.json({ error: '获取评分详情失败' }, 500)
  }
})

export default teamsRouter
