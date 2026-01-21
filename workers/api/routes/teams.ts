import { Hono } from 'hono'
import { drizzle } from 'drizzle-orm/d1'
import { eq, desc, or, and } from 'drizzle-orm'
import { teams, teamMembers, users } from '../../../db/schema'
import { authMiddleware } from '../middleware/auth'
import { extractToken, validateToken } from '../utils/token'
import type { Bindings } from '../types'

const teamsRouter = new Hono<{ Bindings: Bindings }>()

// 获取所有组队信息（支持筛选）
teamsRouter.get('/', async (c) => {
  try {
    const game = c.req.query('game')
    const status = c.req.query('status') || 'open'

    const db = drizzle(c.env.DB)

    // 构建查询条件
    const conditions = []
    if (game) conditions.push(eq(teams.game, game))
    if (status) conditions.push(eq(teams.status, status))

    let query = db.select().from(teams)

    if (conditions.length > 0) {
      query = query.where(conditions.length === 1 ? conditions[0] : or(...conditions)) as any
    }

    const allTeams = await query.orderBy(desc(teams.created_at)).all()

    return c.json(allTeams)
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
    const updates = await c.req.json()

    const db = drizzle(c.env.DB)

    // 添加更新时间
    updates.updated_at = new Date()

    await db.update(teams)
      .set(updates)
      .where(eq(teams.id, Number(id)))
      .run()

    return c.json({ success: true, message: '更新成功' })
  } catch (error) {
    console.error('更新组队信息错误:', error)
    return c.json({ error: '更新组队信息失败' }, 500)
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
teamsRouter.get('/:id/members', authMiddleware, async (c) => {
  try {
    const teamId = c.req.param('id')
    const db = drizzle(c.env.DB)
    const user = c.get('user')

    // 检查是否是队长
    const team = await db.select().from(teams).where(eq(teams.id, Number(teamId))).get()
    if (!team) {
      return c.json({ error: '队伍不存在' }, 404)
    }

    if (team.creator_id !== user.id) {
      return c.json({ error: '只有队长可以查看成员列表' }, 403)
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

    return c.json(membersWithUsername)
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

export default teamsRouter
