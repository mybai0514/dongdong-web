/**
 * 时间处理工具库 - 所有时间统一使用 UTC+8（北京时间）
 */

const TIMEZONE_OFFSET = 8 * 60 * 60 * 1000 // UTC+8 的毫秒偏移量

/**
 * 获取 UTC+8 时区的当前时间
 */
export function getNowInUTC8(): Date {
  const now = new Date()
  // 获取当前时间的 UTC 时间戳
  const utcTime = new Date(now.getTime())
  // 将 UTC 时间转换为 UTC+8
  return new Date(utcTime.getTime() + TIMEZONE_OFFSET)
}

/**
 * 将任何时间转换为 UTC+8 时区
 */
export function toUTC8(date: Date | string | number): Date {
  const d = new Date(date)
  return new Date(d.getTime() + TIMEZONE_OFFSET)
}

/**
 * 获取 UTC+8 时区的日期字符串 (YYYY-MM-DD)
 */
export function getDateStringUTC8(date: Date | string | number): string {
  const d = toUTC8(date)
  const year = d.getUTCFullYear()
  const month = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * 获取 UTC+8 时区的时间字符串 (HH:mm:ss)
 */
export function getTimeStringUTC8(date: Date | string | number): string {
  const d = toUTC8(date)
  const hours = String(d.getUTCHours()).padStart(2, '0')
  const minutes = String(d.getUTCMinutes()).padStart(2, '0')
  const seconds = String(d.getUTCSeconds()).padStart(2, '0')
  return `${hours}:${minutes}:${seconds}`
}

/**
 * 获取 UTC+8 时区的完整日期时间字符串 (YYYY-MM-DD HH:mm:ss)
 */
export function getDateTimeStringUTC8(date: Date | string | number): string {
  return `${getDateStringUTC8(date)} ${getTimeStringUTC8(date)}`
}

/**
 * 格式化时间为中文显示格式 (如: 01-15 14:30)
 */
export function formatTimeForDisplay(date: Date | string | number, showSeconds = false): string {
  const d = toUTC8(date)
  const month = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  const hours = String(d.getUTCHours()).padStart(2, '0')
  const minutes = String(d.getUTCMinutes()).padStart(2, '0')

  if (showSeconds) {
    const seconds = String(d.getUTCSeconds()).padStart(2, '0')
    return `${month}-${day} ${hours}:${minutes}:${seconds}`
  }

  return `${month}-${day} ${hours}:${minutes}`
}

/**
 * 比较两个时间（都转换为 UTC+8 后比较）
 */
export function compareTimesUTC8(date1: Date | string | number, date2: Date | string | number): number {
  const d1 = toUTC8(date1).getTime()
  const d2 = toUTC8(date2).getTime()
  return d1 - d2
}

/**
 * 检查时间是否在 UTC+8 时区已过期
 */
export function isExpiredUTC8(date: Date | string | number): boolean {
  return compareTimesUTC8(date, getNowInUTC8()) < 0
}

/**
 * 检查时间是否在 UTC+8 时区还未开始
 */
export function isNotStartedYetUTC8(date: Date | string | number): boolean {
  return compareTimesUTC8(date, getNowInUTC8()) > 0
}

/**
 * 将本地时间转换为 ISO 字符串（用于 API 传输）
 * 注意：直接使用 Date.toISOString() 会使用 UTC 时间，这里返回的是 UTC+8 对应的 ISO 格式
 */
export function toISOStringUTC8(date: Date | string | number): string {
  const d = toUTC8(date)
  const year = d.getUTCFullYear()
  const month = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  const hours = String(d.getUTCHours()).padStart(2, '0')
  const minutes = String(d.getUTCMinutes()).padStart(2, '0')
  const seconds = String(d.getUTCSeconds()).padStart(2, '0')

  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}+08:00`
}

/**
 * 解析 UTC+8 日期字符串 (YYYY-MM-DD) 并返回该天的开始时间
 */
export function parseDateStringUTC8(dateStr: string): Date {
  // 假设输入的日期字符串是 UTC+8 的日期
  const [year, month, day] = dateStr.split('-').map(Number)
  const d = new Date()
  d.setUTCFullYear(year)
  d.setUTCMonth(month - 1)
  d.setUTCDate(day)
  d.setUTCHours(0, 0, 0, 0)

  // 减去 UTC+8 偏移量，得到实际的 UTC 时间
  return new Date(d.getTime() - TIMEZONE_OFFSET)
}
