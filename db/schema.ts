import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'

// ==================== 用户表 ====================
export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }), // 用户 ID
  username: text('username').notNull().unique(), // 用户名
  email: text('email').notNull().unique(), // 邮箱
  password_hash: text('password_hash').notNull(), // 密码哈希
  avatar: text('avatar'), // 头像 URL
  wechat: text('wechat'), // 微信号
  qq: text('qq'), // QQ 号
  yy: text('yy'), // YY 号
  wechat_visible: integer('wechat_visible', { mode: 'boolean' }).notNull().default(true), // 微信号是否对陌生人可见
  qq_visible: integer('qq_visible', { mode: 'boolean' }).notNull().default(true), // QQ 号是否对陌生人可见
  yy_visible: integer('yy_visible', { mode: 'boolean' }).notNull().default(true), // YY 号是否对陌生人可见
  created_at: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()) // 创建时间
})

// ==================== 会话表 ====================
export const sessions = sqliteTable('sessions', {
  id: integer('id').primaryKey({ autoIncrement: true }), // 会话 ID
  user_id: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }), // 用户 ID
  token: text('token').notNull().unique(), // 会话令牌
  expires_at: integer('expires_at', { mode: 'timestamp' }).notNull(), // 过期时间
  created_at: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()) // 创建时间
})

// ==================== 组队表 ====================
export const teams = sqliteTable('teams', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  game: text('game').notNull(), // 游戏名称：王者荣耀、和平精英等
  title: text('title').notNull(), // 组队标题
  description: text('description'), // 详细描述
  rank_requirement: text('rank_requirement'), // 段位要求：钻石、星耀等
  start_time: integer('start_time', { mode: 'timestamp' }).notNull(), // 开始时间
  end_time: integer('end_time', { mode: 'timestamp' }).notNull(), // 结束时间
  contact_method: text('contact_method').notNull(), // 联系方式：wechat/qq/yy
  contact_value: text('contact_value').notNull(), // 具体联系号码
  creator_id: integer('creator_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  status: text('status').notNull().default('open'), // open=开放, closed=已关闭, full=人满
  member_count: integer('member_count').notNull().default(1), // 当前队伍人数
  max_members: integer('max_members').notNull().default(5), // 最大人数
  created_at: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()), // 创建时间
  updated_at: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()) // 更新时间
})

// ==================== 月度反馈表 ====================
export const feedback = sqliteTable('feedback', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  user_id: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  content: text('content').notNull(), // 反馈内容
  month: text('month').notNull(), // 格式: 2025-01
  game: text('game'), // 关联的游戏（可选）
  mood: text('mood'), // 心情：happy/neutral/sad
  created_at: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date())
})

// ==================== 队伍成员表（可选，用于记录加入的成员）====================
export const teamMembers = sqliteTable('team_members', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  team_id: integer('team_id').notNull().references(() => teams.id, { onDelete: 'cascade' }),
  user_id: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  joined_at: integer('joined_at', { mode: 'timestamp' }).$defaultFn(() => new Date())
})

// ==================== 评价表 ====================
export const reviews = sqliteTable('reviews', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  reviewer_id: integer('reviewer_id').notNull().references(() => users.id, { onDelete: 'cascade' }), // 评价者
  reviewee_id: integer('reviewee_id').notNull().references(() => users.id, { onDelete: 'cascade' }), // 被评价者
  team_id: integer('team_id').references(() => teams.id, { onDelete: 'set null' }), // 关联队伍（可选）
  rating: integer('rating').notNull(), // 评分 1-5
  comment: text('comment'), // 评价内容
  tags: text('tags'), // 标签（JSON 数组字符串）：技术好/配合默契/准时等
  created_at: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date())
})

// ==================== 论坛分类表 ====================
export const forumCategories = sqliteTable('forum_categories', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  slug: text('slug').notNull().unique(), // 分类标识：lusty/fishy
  name: text('name').notNull(), // 分类名称：驴酱板块/鱼酱板块
  description: text('description'), // 分类描述
  icon: text('icon'), // 分类图标 emoji
  color: text('color'), // 分类颜色标识
  post_count: integer('post_count').notNull().default(0), // 帖子总数缓存
  created_at: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date())
})

// ==================== 论坛帖子表 ====================
export const forumPosts = sqliteTable('forum_posts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  category_id: integer('category_id').notNull().references(() => forumCategories.id, { onDelete: 'cascade' }), // 分类 ID
  author_id: integer('author_id').notNull().references(() => users.id, { onDelete: 'cascade' }), // 发布者 ID
  title: text('title').notNull(), // 帖子标题
  content: text('content').notNull(), // 帖子内容
  views_count: integer('views_count').notNull().default(0), // 浏览次数
  comments_count: integer('comments_count').notNull().default(0), // 评论数缓存
  likes_count: integer('likes_count').notNull().default(0), // 点赞数缓存
  dislikes_count: integer('dislikes_count').notNull().default(0), // 反赞数缓存
  is_pinned: integer('is_pinned', { mode: 'boolean' }).notNull().default(false), // 是否置顶
  status: text('status').notNull().default('published'), // published/draft/deleted
  created_at: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updated_at: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date())
})

// ==================== 论坛评论表 ====================
export const forumComments = sqliteTable('forum_comments', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  post_id: integer('post_id').notNull().references(() => forumPosts.id, { onDelete: 'cascade' }), // 帖子 ID
  author_id: integer('author_id').notNull().references(() => users.id, { onDelete: 'cascade' }), // 评论者 ID
  parent_comment_id: integer('parent_comment_id'), // 父评论 ID（楼中楼），自引用
  content: text('content').notNull(), // 评论内容
  likes_count: integer('likes_count').notNull().default(0), // 点赞数
  dislikes_count: integer('dislikes_count').notNull().default(0), // 反赞数
  status: text('status').notNull().default('published'), // published/deleted
  created_at: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updated_at: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date())
})

// ==================== 论坛点赞表 ====================
export const forumLikes = sqliteTable('forum_likes', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  user_id: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  post_id: integer('post_id').references(() => forumPosts.id, { onDelete: 'cascade' }), // NULL 表示点赞的是评论
  comment_id: integer('comment_id').references(() => forumComments.id, { onDelete: 'cascade' }), // NULL 表示点赞的是帖子
  created_at: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date())
})

// ==================== 论坛反赞表 ====================
export const forumDislikes = sqliteTable('forum_dislikes', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  user_id: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  post_id: integer('post_id').references(() => forumPosts.id, { onDelete: 'cascade' }), // NULL 表示反赞的是评论
  comment_id: integer('comment_id').references(() => forumComments.id, { onDelete: 'cascade' }), // NULL 表示反赞的是帖子
  created_at: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date())
})