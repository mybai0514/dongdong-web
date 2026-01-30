# 时间处理系统统一为 UTC+8 迁移指南

## 概述

本项目的所有时间处理已统一采用 **UTC+8（北京时间）标准**。这个文档说明如何处理现存的数据库时间数据。

## 时间处理策略

### 核心原则
1. **数据库存储**: 所有时间字段存储的是 UTC 时间戳（整数），Drizzle ORM 会自动转换为 Date 对象
2. **后端处理**: 使用新建的 `workers/api/utils/time.ts` 工具库，所有时间比较和转换都基于 UTC+8
3. **前端显示**: 使用新建的 `src/lib/time.ts` 工具库，所有显示都是 UTC+8 格式

### 后端时间工具函数

```typescript
// workers/api/utils/time.ts
getNowUTC8()              // 获取 UTC+8 当前时间
formatDateUTC8(date)      // 格式化为 YYYY-MM-DD
formatTimeUTC8(date)      // 格式化为 HH:mm:ss
formatDateTimeUTC8(date)  // 格式化为 YYYY-MM-DD HH:mm:ss
isSameDayUTC8(d1, d2)     // 判断是否同一天（UTC+8）
isExpiredUTC8(date)       // 检查是否已过期
```

### 前端时间工具函数

```typescript
// src/lib/time.ts
getNowInUTC8()            // 获取 UTC+8 当前时间
formatTimeForDisplay(date) // 格式化为 MM-DD HH:mm
getDateStringUTC8(date)    // 获取日期字符串 YYYY-MM-DD
toISOStringUTC8(date)      // 转换为 ISO 字符串 (UTC+8 格式)
```

## 数据库数据迁移

### 注意事项

**重要**: 如果现存数据是在非中国时区的服务器上创建的，需要检查并可能需要调整数据。

### 检查数据

运行以下 SQL 命令检查数据库中的时间数据：

```sql
-- 检查 teams 表
SELECT id, title, start_time, end_time, created_at
FROM teams
LIMIT 5;

-- 检查 sessions 表
SELECT id, user_id, expires_at, created_at
FROM sessions
LIMIT 5;

-- 检查 team_members 表
SELECT id, team_id, user_id, joined_at
FROM team_members
LIMIT 5;

-- 检查 reviews 表
SELECT id, reviewer_id, reviewee_id, created_at
FROM reviews
LIMIT 5;

-- 检查 users 表
SELECT id, username, created_at
FROM users
LIMIT 5;
```

### 数据修正脚本

如果需要修正现存的数据（例如从 UTC 时间转换到 UTC+8），可以使用以下脚本：

**警告**: 在运行任何修改数据库的脚本之前，请备份您的数据库！

```sql
-- 方案 1: 如果数据是以 UTC 存储的，且需要转换为 UTC+8
-- （这个脚本只是示例，具体操作取决于你的数据库类型和时间戳格式）

-- SQLite 示例：
-- 给所有时间字段加上 8 小时（对应 UTC+8）
-- UPDATE teams
-- SET start_time = start_time + 8 * 3600000,
--     end_time = end_time + 8 * 3600000,
--     created_at = created_at + 8 * 3600000,
--     updated_at = updated_at + 8 * 3600000
-- WHERE created_at < datetime('now', '-100 years'); -- 防止误操作，只更新合理的数据

-- 方案 2: 如果数据已经是正确的 UTC+8 时间
-- 无需操作，直接使用新的时间处理逻辑即可
```

## 已更新的文件列表

### 新增工具库
- ✅ `src/lib/time.ts` - 前端时间处理工具库
- ✅ `workers/api/utils/time.ts` - 后端时间处理工具库

### 更新的后端文件
- ✅ `workers/api/routes/teams.ts` - 使用新的时间工具库进行日期比较和过期检查
- ✅ `workers/api/utils/token.ts` - 使用 UTC+8 时间进行 session 过期检查

### 更新的前端文件（时间显示）
- ✅ `src/app/teams/page.tsx` - 队伍列表和详情显示
- ✅ `src/app/profile/page.tsx` - 个人资料页面时间显示
- ✅ `src/app/profile/history/page.tsx` - 历史记录页面时间显示
- ✅ `src/app/profile/[id]/page.tsx` - 用户资料页面时间显示

## 验证时间处理

### 前端测试
1. 打开组队列表页面，查看时间是否正确显示（应该显示为 MM-DD HH:mm 格式）
2. 打开日期筛选器，选择日期并筛选，检查是否能正确查询数据
3. 查看成员加入时间是否正确显示

### 后端测试
1. 检查队伍筛选接口 `/api/teams?date=YYYY-MM-DD`，确保日期比较正确
2. 验证已过期的队伍是否被正确过滤
3. 检查评分功能中队伍完成状态的判断

## 常见问题

### Q: 为什么使用 UTC+8 而不是直接使用系统时区？
A: 统一使用 UTC+8 确保全球用户都看到一致的中国时间，不受服务器所在时区影响。

### Q: 前端选择的日期如何转换为后端接受的格式？
A: 使用 `getDateStringUTC8(date)` 函数，它会自动处理时区转换，返回 `YYYY-MM-DD` 格式的字符串。

### Q: toLocaleString 为什么���替换为 formatTimeForDisplay？
A: `toLocaleString` 依赖浏览器的本地时区设置，可能导致显示不一致。新的函数统一使用 UTC+8，确保所有用户看到相同的时间显示。

### Q: 数据库中存储的是什么格式的时间？
A: SQLite 中使用 `integer` 类型存储 Unix 时间戳（从 1970-01-01 00:00:00 UTC 开始的秒数或毫秒数）。Drizzle ORM 的 `timestamp` 模式会自动处理转换。

## 持续维护

### 新代码中时间处理的最佳实践

1. **显示时间给用户**：使用 `formatTimeForDisplay()` （前端）或 `formatDateTimeUTC8()` （后端）
2. **发送时间到 API**：使用 `toISOString()` 或 `toISOStringUTC8()`
3. **比较时间**：使用 `isExpiredUTC8()` 或 `compareTimesUTC8()`
4. **获取当前时间**：使用 `getNowUTC8()` 或 `getNowInUTC8()`

### 代码审查清单

- [ ] 没有使用 `new Date()`，而是使用 `getNowUTC8()`
- [ ] 没有使用 `toLocaleString()`，而是使用 `formatTimeForDisplay()` 或 `formatDateTimeUTC8()`
- [ ] 日期比较使用了时间工具库中的函数
- [ ] 时间显示始终使用 UTC+8 格式的工具函数

## 参考资源

- [Date-fns 文档](https://date-fns.org/)
- [JavaScript Date 对象](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Date)
- [Unix 时间戳](https://en.wikipedia.org/wiki/Unix_time)
