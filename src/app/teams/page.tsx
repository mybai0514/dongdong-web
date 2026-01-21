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
  Gamepad2,
  CheckCircle2,
  Loader2
} from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import type { User, Team, MembershipStatus, ContactMethod } from '@/types'
import { getTeams, joinTeam, checkMembership, ApiError } from '@/lib/api'
import { GAMES_WITH_ALL } from '@/lib/constants'
import { useUser } from '@/hooks'

interface ContactInfo {
  method: ContactMethod
  value: string
}

export default function TeamsPage() {
  const user = useUser()
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedGame, setSelectedGame] = useState('全部')

  // 加入队伍相关状态
  const [joiningTeamId, setJoiningTeamId] = useState<number | null>(null)
  const [contactDialog, setContactDialog] = useState<{
    open: boolean
    contact?: ContactInfo
  }>({ open: false })

  // 获取组队列表
  useEffect(() => {
    fetchTeamsList()
  }, [selectedGame])

  const fetchTeamsList = async () => {
    setLoading(true)
    try {
      const data = await getTeams({
        game: selectedGame,
        status: 'open'
      })
      setTeams(data)
    } catch (error) {
      console.error('获取组队列表失败:', error)
    } finally {
      setLoading(false)
    }
  }

  // 加入队伍
  const handleJoinTeam = async (teamId: number) => {
    if (!user) {
      window.location.href = '/login?redirect=/teams'
      return
    }

    setJoiningTeamId(teamId)

    try {
      const data = await joinTeam(teamId)

      // 显示联系方式
      setContactDialog({
        open: true,
        contact: data.contact
      })

      // 刷新列表
      fetchTeamsList()
    } catch (err) {
      if (err instanceof ApiError) {
        alert(err.message || '加入失败')
      } else {
        alert('网络错误，请稍后重试')
      }
      console.error('加入队伍错误:', err)
    } finally {
      setJoiningTeamId(null)
    }
  }

// 检查成员状态
  const checkMembershipStatus = async (teamId: number): Promise<MembershipStatus> => {
    if (!user) {
      return { isMember: false, isCreator: false }
    }

    try {
      return await checkMembership(teamId)
    } catch (error) {
      return { isMember: false, isCreator: false }
    }
  }

  // 显示联系方式（仅对队员和队长）
  const showContact = async (teamId: number) => {
    const status = await checkMembershipStatus(teamId)

    if (!status.isMember) {
      alert('请先加入队伍才能查看联系方式')
      return
    }

    if (status.contact) {
      setContactDialog({
        open: true,
        contact: status.contact
      })
    }
  }

  // 筛选组队
  const filteredTeams = teams.filter(team => {
    const matchSearch = team.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                       team.description?.toLowerCase().includes(searchQuery.toLowerCase())
    return matchSearch
  })

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
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
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
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="搜索组队标题或描述..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <Select value={selectedGame} onValueChange={setSelectedGame}>
          <SelectTrigger className="w-full md:w-50">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue placeholder="选择游戏" />
          </SelectTrigger>
          <SelectContent>
            {GAMES_WITH_ALL.map(game => (
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
        <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {filteredTeams.map(team => (
            <TeamCard
              key={team.id}
              team={team}
              user={user}
              joiningTeamId={joiningTeamId}
              onJoin={handleJoinTeam}
              onShowContact={showContact}
              getStatusBadge={getStatusBadge}
              getContactIcon={getContactIcon}
            />
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

      {/* 联系方式弹窗 */}
      <Dialog open={contactDialog.open} onOpenChange={(open) => setContactDialog({ open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              加入成功
            </DialogTitle>
            <DialogDescription>
              你已成功加入队伍，使用以下联系方式联系队长开始游戏吧
            </DialogDescription>
          </DialogHeader>
          <div className="py-6">
            {contactDialog.contact && (
              <div className="flex items-center justify-center space-x-4 text-lg bg-muted/50 rounded-lg p-4">
                <MessageCircle className="h-6 w-6 text-primary" />
                <div>
                  <span className="font-semibold">{getContactIcon(contactDialog.contact.method)}：</span>
                  <span className="ml-2 text-primary select-all">{contactDialog.contact.value}</span>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => setContactDialog({ open: false })}>
              知道了
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// 拆分出卡片组件
function TeamCard({
  team,
  user,
  joiningTeamId,
  onJoin,
  onShowContact,
  getStatusBadge,
  getContactIcon
}: {
  team: Team
  user: User | null
  joiningTeamId: number | null
  onJoin: (id: number) => void
  onShowContact: (id: number) => void
  getStatusBadge: (status: string, count: number, max: number) => React.ReactNode
  getContactIcon: (method: string) => string
}) {
  const [memberStatus, setMemberStatus] = useState<MembershipStatus | null>(null)

  useEffect(() => {
    if (user) {
      checkStatus()
    }
  }, [user, team.id])

  const checkStatus = async () => {
    try {
      const data = await checkMembership(team.id)
      setMemberStatus(data)
    } catch (error) {
      console.error('检查成员状态错误:', error)
    }
  }

  const isJoining = joiningTeamId === team.id

  return (
    <Card className="hover:shadow-lg transition-shadow flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <Badge variant="outline" className="shrink-0">{team.game}</Badge>
              {getStatusBadge(team.status, team.member_count, team.max_members)}
              {memberStatus?.isMember && (
                <Badge variant="secondary" className="shrink-0">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  {memberStatus.isCreator ? '队长' : '已加入'}
                </Badge>
              )}
            </div>
            <CardTitle className="text-lg mb-1 line-clamp-2">{team.title}</CardTitle>
            {team.rank_requirement && (
              <CardDescription className="text-xs">
                段位要求：{team.rank_requirement}
              </CardDescription>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col">
        {team.description && (
          <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
            {team.description}
          </p>
        )}

        <div className="space-y-2 text-sm mb-4 flex-1">
          <div className="flex items-center text-muted-foreground">
            <Users className="h-4 w-4 mr-2 shrink-0" />
            <span>{team.member_count || 1}/{team.max_members} 人</span>
          </div>

          <div className="flex items-center text-muted-foreground">
            <Clock className="h-4 w-4 mr-2 shrink-0" />
            <span className="truncate">
              {new Date(team.start_time).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
              {' - '}
              {new Date(team.end_time).toLocaleString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>

          <div className="flex items-center text-muted-foreground">
            <MessageCircle className="h-4 w-4 mr-2 shrink-0" />
            <span className="truncate">
              {memberStatus?.isMember && memberStatus.contact
                ? `${getContactIcon(memberStatus.contact.method)}: ${memberStatus.contact.value}`
                : '加入后可见联系方式'
              }
            </span>
          </div>
        </div>

        {/* 操作按钮 */}
        {memberStatus?.isMember ? (
          <Button 
            variant="outline" 
            className="w-full"
            onClick={() => onShowContact(team.id)}
          >
            <MessageCircle className="mr-2 h-4 w-4" />
            查看联系方式
          </Button>
        ) : (
          <Button 
            variant="default" 
            className="w-full"
            disabled={team.status !== 'open' || isJoining || !user}
            onClick={() => onJoin(team.id)}
          >
            {isJoining ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                加入中...
              </>
            ) : team.status === 'open' ? (
              <>
                <Plus className="mr-2 h-4 w-4" />
                加入队伍
              </>
            ) : (
              '已满员'
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}