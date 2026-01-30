/**
 * 后端时间处理工具 - 所有时间统一使用 UTC+8（北京时间）
 */

/**
 * 获取 UTC+8 时区的当前时间
 * 返回的 Date 对象表示 UTC+8 的当前时间
 */
export function getNowUTC8(): Date {
  const now = new Date()
  // 获取当�� UTC 时间的毫秒数
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60 * 1000
  // 添加 UTC+8 的偏移量
  return new Date(utcMs + 8 * 60 * 60 * 1000)
}

/**
 * 创建 UTC+8 时区的指定日期时间
 */
export function createDateUTC8(year: number, month: number, day: number, hours: number = 0, minutes: number = 0, seconds: number = 0): Date {
  // 创建一个 UTC 时间
  const d = new Date(Date.UTC(year, month - 1, day, hours, minutes, seconds))
  // 减去 UTC+8 偏移量，使其在数据库中存储为相对于 UTC+8 的时间
  return new Date(d.getTime() - 8 * 60 * 60 * 1000)
}

/**
 * 将时间转换为 UTC+8 时区的日期字符串 (YYYY-MM-DD)
 */
export function formatDateUTC8(date: Date | string | number): string {
  const d = new Date(date)
  // 获取 UTC 时间
  const utcTime = d.getTime() + d.getTimezoneOffset() * 60 * 1000
  // 加上 UTC+8 偏移
  const utc8Time = new Date(utcTime + 8 * 60 * 60 * 1000)

  const year = utc8Time.getFullYear()
  const month = String(utc8Time.getMonth() + 1).padStart(2, '0')
  const day = String(utc8Time.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

/**
 * 将时间转换为 UTC+8 时区的时间字符串 (HH:mm:ss)
 */
export function formatTimeUTC8(date: Date | string | number): string {
  const d = new Date(date)
  // 获取 UTC 时间
  const utcTime = d.getTime() + d.getTimezoneOffset() * 60 * 1000
  // 加上 UTC+8 偏移
  const utc8Time = new Date(utcTime + 8 * 60 * 60 * 1000)

  const hours = String(utc8Time.getHours()).padStart(2, '0')
  const minutes = String(utc8Time.getMinutes()).padStart(2, '0')
  const seconds = String(utc8Time.getSeconds()).padStart(2, '0')

  return `${hours}:${minutes}:${seconds}`
}

/**
 * 将时间转换为 UTC+8 时区的完整日期时间字符串 (YYYY-MM-DD HH:mm:ss)
 */
export function formatDateTimeUTC8(date: Date | string | number): string {
  return `${formatDateUTC8(date)} ${formatTimeUTC8(date)}`
}

/**
 * 比较两个时间
 * 返回值: < 0 表示 date1 早于 date2，= 0 表示相等，> 0 表示 date1 晚于 date2
 */
export function compareTimesUTC8(date1: Date | string | number, date2: Date | string | number): number {
  const d1 = new Date(date1).getTime()
  const d2 = new Date(date2).getTime()
  return d1 - d2
}

/**
 * 检查时间是否已过期（与 UTC+8 当前时间比较）
 */
export function isExpiredUTC8(date: Date | string | number): boolean {
  return compareTimesUTC8(date, getNowUTC8()) < 0
}

/**
 * 检查时间是否还未开始（与 UTC+8 当前时间比较）
 */
export function isNotStartedYetUTC8(date: Date | string | number): boolean {
  return compareTimesUTC8(date, getNowUTC8()) > 0
}

/**
 * 获取 UTC+8 时区的日期对应的年、月、日
 */
export function getDateComponentsUTC8(date: Date | string | number): { year: number; month: number; day: number } {
  const d = new Date(date)
  // 获取 UTC 时间
  const utcTime = d.getTime() + d.getTimezoneOffset() * 60 * 1000
  // 加上 UTC+8 偏移
  const utc8Time = new Date(utcTime + 8 * 60 * 60 * 1000)

  return {
    year: utc8Time.getFullYear(),
    month: utc8Time.getMonth() + 1,
    day: utc8Time.getDate()
  }
}

/**
 * 判断两个日期是否为同一天（UTC+8 时区）
 */
export function isSameDayUTC8(date1: Date | string | number, date2: Date | string | number): boolean {
  const comp1 = getDateComponentsUTC8(date1)
  const comp2 = getDateComponentsUTC8(date2)

  return comp1.year === comp2.year && comp1.month === comp2.month && comp1.day === comp2.day
}
