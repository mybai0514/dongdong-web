'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { 
  Users, 
  Clock, 
  MessageCircle, 
  Search, 
  Filter,
  Plus,
  Gamepad2
} from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

// 游戏列表
const GAMES = [
  '全部',
  '王者荣耀',
  '和平精英',
  '英雄联盟',
  'VALORANT',
  'CS2',
  'DOTA2',
  '永劫无间',
  '其他'
]

// 段位列表
const RANKS = {
  '王者荣耀': ['青铜', '白银', '黄金', '铂金', '钻石', '星耀', '最强王者', '荣耀王者'],
  '和平精英': ['青铜', '白银', '黄金', '铂金', '钻石', '皇冠', '王牌', '无敌战神'],
  '默认': ['新手', '进阶', '高手', '大神']
}

interface Team {
  id: number
  game: string
  title: string
  description: string
  rank_requirement?: string
  contact_method: string
  contact_value: string
  creator_id: number
  status: 'open' | 'closed' | 'full'
  member_count: number
  max_members: number
  created_at: string
}

export default function TeamsPage() {
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedGame, setSelectedGame] = useState('全部')
  const [user, setUser] = useState<any>(null)

  // 检查用户登录状态
  useEffect(() => {
    const userStr = localStorage.getItem('user')
    if (userStr) {
      setUser(JSON.parse(userStr))
    }
  }, [])

  // 获取组队列表
  useEffect(() => {
    fetchTeams()
  }, [selectedGame])

  const fetchTeams = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (selectedGame !== '全部') {
        params.append('game', selectedGame)
      }
      params.append('status', 'open')

      const response = await fetch(`http://localhost:8787/api/teams?${params}`)
      const data = await response.json()
      
      if (Array.isArray(data)) {
        setTeams(data)
      }
    } catch (error) {
      console.error('获取组队列表失败:', error)
    } finally {
      setLoading(false)
    }
  }

  // 筛选组队
  const filteredTeams = teams.filter(team => {
    const matchSearch = team.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                       team.description?.toLowerCase().includes(searchQuery.toLowerCase())
    return matchSearch
  })

  // 格式化时间
  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)
    
    if (minutes < 60) return `${minutes}分钟前`
    if (hours < 24) return `${hours}小时前`
    return `${days}天前`
  }

  // 获取状态标签
  const getStatusBadge = (status: string, memberCount: number, maxMembers: number) => {
    if (status === 'full' || memberCount >= maxMembers) {
      return <Badge variant="secondary">已满员</Badge>
    }
    if (status === 'closed') {
      return <Badge variant="secondary">已关闭</Badge>
    }
    return <Badge className="bg-green-500">招募中</Badge>
  }

  // 获取联系方式图标
  const getContactIcon = (method: string) => {
    switch (method) {
      case 'wechat':
        return '微信'
      case 'qq':
        return 'QQ'
      case 'yy':
        return 'YY'
      default:
        return '联系方式'
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 px-4">
      {/* 页面标题 */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">找队友</h1>
          <p className="text-muted-foreground">
            找到志同道合的游戏伙伴，一起开黑上分
          </p>
        </div>
        {user && (
          <Button asChild>
            <Link href="/teams/create">
              <Plus className="mr-2 h-4 w-4" />
              发布组队
            </Link>
          </Button>
        )}
      </div>

      {/* 筛选栏 */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        {/* 搜索框 */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="搜索组队标题或描述..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* 游戏筛选 */}
        <Select value={selectedGame} onValueChange={setSelectedGame}>
          <SelectTrigger className="w-full md:w-50">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue placeholder="选择游戏" />
          </SelectTrigger>
          <SelectContent>
            {GAMES.map(game => (
              <SelectItem key={game} value={game}>
                {game}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* 组队列表 */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent"></div>
          <p className="mt-4 text-muted-foreground">加载中...</p>
        </div>
      ) : filteredTeams.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Gamepad2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">暂无组队信息</h3>
            <p className="text-muted-foreground mb-4">
              {selectedGame === '全部' ? '还没有人发布组队' : `暂时没有${selectedGame}的组队信息`}
            </p>
            {user && (
              <Button asChild>
                <Link href="/teams/create">发布第一个组队</Link>
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredTeams.map(team => (
            <Card key={team.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline">{team.game}</Badge>
                      {getStatusBadge(team.status, team.member_count, team.max_members)}
                    </div>
                    <CardTitle className="text-lg mb-1">{team.title}</CardTitle>
                    {team.rank_requirement && (
                      <CardDescription>
                        段位要求：{team.rank_requirement}
                      </CardDescription>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {team.description && (
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                    {team.description}
                  </p>
                )}

                <div className="space-y-2 text-sm">
                  {/* 人数 */}
                  <div className="flex items-center text-muted-foreground">
                    <Users className="h-4 w-4 mr-2" />
                    <span>{team.member_count || 1}/{team.max_members} 人</span>
                  </div>

                  {/* 联系方式 */}
                  <div className="flex items-center text-muted-foreground">
                    <MessageCircle className="h-4 w-4 mr-2" />
                    <span>{getContactIcon(team.contact_method)}: {team.contact_value}</span>
                  </div>

                  {/* 发布时间 */}
                  <div className="flex items-center text-muted-foreground">
                    <Clock className="h-4 w-4 mr-2" />
                    <span>{formatTime(team.created_at)}</span>
                  </div>
                </div>

                {/* 操作按钮 */}
                <div className="mt-4">
                  <Button 
                    variant="outline" 
                    className="w-full"
                    disabled={team.status !== 'open'}
                  >
                    {team.status === 'open' ? '联系队长' : '已满员'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* 未登录提示 */}
      {!user && (
        <Card className="mt-8 border-primary/50 bg-primary/5">
          <CardContent className="py-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold mb-1">想要发布组队？</h3>
                <p className="text-sm text-muted-foreground">
                  登录后即可发布组队信息，找到你的游戏伙伴
                </p>
              </div>
              <Button asChild>
                <Link href="/login">立即登录</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}