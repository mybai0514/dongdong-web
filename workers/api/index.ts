/// <reference types="@cloudflare/workers-types" />

import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { drizzle } from 'drizzle-orm/d1'
import { eq, desc, or } from 'drizzle-orm'
import { teams, users, feedback, sessions, teamMembers } from '../../db/schema'
import bcrypt from 'bcryptjs'

type Bindings = {
  DB: D1Database
}

const app = new Hono<{ Bindings: Bindings }>()

// 允许跨域请求（让 Next.js 前端可以调用）
app.use('/*', cors())

// ==================== 健康检查 ====================
app.get('/api/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// ==================== 工具函数 ====================

// 生成随机 token
function generateToken(): string {
  return crypto.randomUUID() + '-' + Date.now().toString(36)
}

// 创建会话（7天有效期）
async function createSession(db: any, userId: number): Promise<string> {
  const token = generateToken()
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 7) // 7天后过期

  await db.insert(sessions).values({
    user_id: userId,
    token,
    expires_at: expiresAt,
    created_at: new Date()
  }).run()

  return token
}

// 验证 token 是否有效
async function validateToken(db: any, token: string) {
  const session = await db.select()
    .from(sessions)
    .where(eq(sessions.token, token))
    .get()

  if (!session) return null
  
  // 检查是否过期
  if (new Date() > new Date(session.expires_at)) {
    // 删除过期的 session
    await db.delete(sessions).where(eq(sessions.token, token)).run()
    return null
  }

  // 获取用户信息
  const user = await db.select().from(users).where(eq(users.id, session.user_id)).get()
  return user
}


// ==================== 用户相关 API ====================

// 用户注册
app.post('/api/auth/register', async (c) => {
  try {
    const { username, email, password, wechat, qq, yy } = await c.req.json()
    
    // 验证必填字段
    if (!username || !email || !password) {
      return c.json({ error: '用户名、邮箱和密码不能为空' }, 400)
    }

    // 验证密码长度
    if (password.length < 6) {
      return c.json({ error: '密码长度至少为 6 位' }, 400)
    }

    const db = drizzle(c.env.DB)
    
    // 检查用户名或邮箱是否已存在
    const existingUser = await db.select().from(users)
      .where(
        or(
          eq(users.email, email),
          eq(users.username, username)
        )
      )
      .get()
      
    if (existingUser) {
      return c.json({ error: '用户名或邮箱已被注册' }, 400)
    }

    // 加密密码
    const salt = await bcrypt.genSalt(10)
    const passwordHash = await bcrypt.hash(password, salt)

    // 创建用户
    const result = await db.insert(users).values({
      username,
      email,
      password_hash: passwordHash,
      wechat: wechat || null,
      qq: qq || null,
      yy: yy || null,
      created_at: new Date()
    }).run()

    const userId = result.meta.last_row_id as number

    // 创建会话
    const token = await createSession(db, userId)

    return c.json({ 
      success: true, 
      message: '注册成功',
      token,
      user: {
        id: userId,
        username,
        email,
        wechat,
        qq,
        yy
      }
    })
  } catch (error) {
    console.error('注册错误:', error)
    return c.json({ error: '注册失败，请稍后重试' }, 500)
  }
})

// 用户登录
app.post('/api/auth/login', async (c) => {
  try {
    const { email, password } = await c.req.json()
    
    if (!email || !password) {
      return c.json({ error: '邮箱和密码不能为空' }, 400)
    }

    // 通过email拿到数据库中的用户信息，检查用户是否存在
    const db = drizzle(c.env.DB)
    const user = await db.select().from(users).where(eq(users.email, email)).get()

    if (!user) {
      return c.json({ error: '邮箱或密码错误' }, 401)
    }

    // 验证密码:通过数据库中的密码hash，和用户输入的密码进行验证
    const isValidPassword = await bcrypt.compare(password, user.password_hash)
    if (!isValidPassword) {
      return c.json({ error: '邮箱或密码错误' }, 401)
    }

    // 创建会话
    const token = await createSession(db, user.id)

    return c.json({
      success: true,
      message: '登录成功',
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        avatar: user.avatar,
        wechat: user.wechat,
        qq: user.qq,
        yy: user.yy
      }
    })
  } catch (error) {
    console.error('登录错误:', error)
    return c.json({ error: '登录失败，请稍后重试' }, 500)
  }
})

// 验证 token（获取当前用户信息）
app.get('/api/auth/me', async (c) => {
  try {
    const authHeader = c.req.header('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ error: '未提供认证令牌' }, 401)
    }

    const token = authHeader.substring(7)
    const db = drizzle(c.env.DB)
    const user = await validateToken(db, token)

    if (!user) {
      return c.json({ error: '无效或过期的令牌' }, 401)
    }

    return c.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        avatar: user.avatar,
        wechat: user.wechat,
        qq: user.qq,
        yy: user.yy
      }
    })
  } catch (error) {
    console.error('验证令牌错误:', error)
    return c.json({ error: '验证失败' }, 500)
  }
})

// 登出
app.post('/api/auth/logout', async (c) => {
  try {
    const authHeader = c.req.header('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ error: '未提供认证令牌' }, 401)
    }

    const token = authHeader.substring(7)
    const db = drizzle(c.env.DB)
    
    // 删除 session
    await db.delete(sessions).where(eq(sessions.token, token)).run()

    return c.json({ success: true, message: '登出成功' })
  } catch (error) {
    console.error('登出错误:', error)
    return c.json({ error: '登出失败' }, 500)
  }
})

// 获取用户信息
app.get('/api/users/:id', async (c) => {
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

// ==================== 组队相关 API ====================

// 获取所有组队信息（支持筛选）
app.get('/api/teams', async (c) => {
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
app.get('/api/teams/:id', async (c) => {
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

// 创建新的组队（支持新字段）
app.post('/api/teams', async (c) => {
  try {
    // 错误处理
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
      contact_method,
      contact_value,
      creator_id,
      max_members 
    } = body
    
    // 验证必填字段
    if (!game || !title || !contact_method || !contact_value || !creator_id) {
      return c.json({ 
        error: '游戏、标题、联系方式和创建者ID不能为空',
        received: { game, title, contact_method, contact_value, creator_id }
      }, 400)
    }

    const db = drizzle(c.env.DB)
    
    const result = await db.insert(teams).values({
      game,
      title,
      description: description || null,
      rank_requirement: rank_requirement || null,
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
app.put('/api/teams/:id', async (c) => {
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
app.delete('/api/teams/:id', async (c) => {
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

// ==================== 加入队伍 API ====================

// 加入队伍
app.post('/api/teams/:id/join', async (c) => {
  try {
    const teamId = c.req.param('id')
    const authHeader = c.req.header('Authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ error: '未登录' }, 401)
    }

    const token = authHeader.substring(7)
    const db = drizzle(c.env.DB)
    
    // 验证用户
    const user = await validateToken(db, token)
    if (!user) {
      return c.json({ error: '登录已过期，请重新登录' }, 401)
    }

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
        or(
          eq(teamMembers.team_id, Number(teamId)),
          eq(teamMembers.user_id, user.id)
        )
      )
      .get()

    if (existingMember && existingMember.team_id === Number(teamId) && existingMember.user_id === user.id) {
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
app.get('/api/teams/:id/check-membership', async (c) => {
  try {
    const teamId = c.req.param('id')
    const authHeader = c.req.header('Authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ isMember: false, isCreator: false })
    }

    const token = authHeader.substring(7)
    const db = drizzle(c.env.DB)
    
    const user = await validateToken(db, token)
    if (!user) {
      return c.json({ isMember: false, isCreator: false })
    }

    // 检查是否是队长
    const team = await db.select().from(teams).where(eq(teams.id, Number(teamId))).get()
    // 添加类型守卫
    if (!team) {
      return c.json({ isMember: false, isCreator: false })
    }
    if (team?.creator_id === user.id) {
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
        or(
          eq(teamMembers.team_id, Number(teamId)),
          eq(teamMembers.user_id, user.id)
        )
      )
      .get()

    if (member && member.team_id === Number(teamId) && member.user_id === user.id) {
      return c.json({
        isMember: true,
        isCreator: false,
        contact: {
          method: team!.contact_method,
          value: team!.contact_value
        }
      })
    }

    return c.json({ isMember: false, isCreator: false })
  } catch (error) {
    console.error('检查成员错误:', error)
    return c.json({ isMember: false, isCreator: false })
  }
})

// ==================== 反馈相关 API ====================

// 提交月度反馈（支持新字段）
app.post('/api/feedback', async (c) => {
  try {
    const { user_id, content, month, game, mood } = await c.req.json()
    
    if (!user_id || !content || !month) {
      return c.json({ error: '用户ID、内容和月份不能为空' }, 400)
    }

    const db = drizzle(c.env.DB)
    
    const result = await db.insert(feedback).values({
      user_id,
      content,
      month,
      game,
      mood,
      created_at: new Date()
    }).run()

    return c.json({ 
      success: true, 
      feedbackId: result.meta.last_row_id,
      message: '反馈提交成功' 
    })
  } catch (error) {
    console.error('提交反馈错误:', error)
    return c.json({ error: '提交反馈失败' }, 500)
  }
})

// 获取用户的反馈历史
app.get('/api/feedback/user/:userId', async (c) => {
  try {
    const userId = c.req.param('userId')
    const db = drizzle(c.env.DB)
    
    const userFeedback = await db.select()
      .from(feedback)
      .where(eq(feedback.user_id, Number(userId)))
      .orderBy(desc(feedback.created_at))
      .all()

    return c.json(userFeedback)
  } catch (error) {
    console.error('获取反馈历史错误:', error)
    return c.json({ error: '获取反馈历史失败' }, 500)
  }
})

// 获取某个月的所有反馈
app.get('/api/feedback/month/:month', async (c) => {
  try {
    const month = c.req.param('month')
    const db = drizzle(c.env.DB)
    
    const monthFeedback = await db.select()
      .from(feedback)
      .where(eq(feedback.month, month))
      .orderBy(desc(feedback.created_at))
      .all()

    return c.json(monthFeedback)
  } catch (error) {
    console.error('获取月度反馈错误:', error)
    return c.json({ error: '获取月度反馈失败' }, 500)
  }
})

export default app