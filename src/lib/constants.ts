/**
 * 游戏相关常量配置
 */

// 游戏列表（不含"全部"选项，用于创建/编辑）
export const GAMES = [
  '王者荣耀',
  '和平精英',
  '英雄联盟',
  'VALORANT',
  'CS2',
  'DOTA2',
  '永劫无间',
  '其他'
] as const

// 游戏列表（含"全部"选项，用于筛选）
export const GAMES_WITH_ALL = ['全部', ...GAMES] as const

// 段位选项
export const RANKS: Record<string, string[]> = {
  '王者荣耀': ['不限', '青铜', '白银', '黄金', '铂金', '钻石', '星耀', '最强王者', '荣耀王者'],
  '和平精英': ['不限', '青铜', '白银', '黄金', '铂金', '钻石', '皇冠', '王牌', '无敌战神'],
  '英雄联盟': ['不限', '黑铁', '青铜', '白银', '黄金', '铂金', '钻石', '大师', '宗师', '王者'],
  'VALORANT': ['不限', '铁', '铜', '银', '金', '铂金', '钻石', '不朽', '辐射'],
  'CS2': ['不限', '白银', '黄金', '守护者', '传奇之鹰', '至尊大师'],
  'DOTA2': ['不限', '先锋', '卫士', '中军', '统帅', '传奇', '万古', '超凡', '冠绝'],
  '永劫无间': ['不限', '侠岚', '侠客', '侠魁', '修罗'],
  '默认': ['不限', '新手', '进阶', '高手', '大神']
}

// 联系方式类型
export const CONTACT_METHODS = [
  { value: 'wechat', label: '微信' },
  { value: 'qq', label: 'QQ' },
  { value: 'yy', label: 'YY' },
  { value: 'other', label: '其他' }
] as const

// 获取游戏对应的段位列表
export function getRanks(game: string): string[] {
  return RANKS[game] || RANKS['默认']
}

/**
 * 评价标签配置
 */
export const REVIEW_TAGS = {
  required: ['素质', '操作', '意识'],
  optional: ['嘴硬', '迟到', '情绪稳定']
}

// 类型导出
export type Game = typeof GAMES[number]
export type ContactMethodValue = typeof CONTACT_METHODS[number]['value']
