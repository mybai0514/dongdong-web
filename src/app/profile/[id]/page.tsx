'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  User as UserIcon,
  Mail,
  MessageCircle,
  Users,
  Clock,
  Gamepad2,
  Crown,
  Loader2,
  Star,
  Award,
  ArrowLeft
} from 'lucide-react'
import {
  getUser,
  getUserTeams,
  getUserJoinedTeams,
  getUserReputation,
  type UserReputation
} from '@/lib/api'
import type { User, Team } from '@/types'
import { formatTimeForDisplay } from '@/lib/time'

export default function UserProfilePage() {
  const params = useParams()
  const userId = Number(params.id)

  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [teams, setTeams] = useState<Team[]>([])
  const [loadingTeams, setLoadingTeams] = useState(true)

  const [joinedTeams, setJoinedTeams] = useState<Team[]>([])
  const [loadingJoinedTeams, setLoadingJoinedTeams] = useState(true)

  const [reputation, setReputation] = useState<UserReputation | null>(null)
  const [loadingReputation, setLoadingReputation] = useState(true)

  // 获取用户信息
  useEffect(() => {
    const fetchUser = async () => {
      setLoading(true)
      setError(null)
      try {
        const data = await getUser(userId)
        setUser(data)
      } catch (err) {
        console.error('获取用户信息失败:', err)
        setError('获取用户信息失败')
      } finally {
        setLoading(false)
      }
    }

    if (userId) {
      fetchUser()
    }
  }, [userId])

  // 获取用户队伍
  useEffect(() => {
    const fetchTeams = async () => {
      setLoadingTeams(true)
      try {
        const data = await getUserTeams(userId)
        setTeams(data)
      } catch (err) {
        console.error('获取用户队伍失败:', err)
      } finally {
        setLoadingTeams(false)
      }
    }

    if (userId) {
      fetchTeams()
    }
  }, [userId])

  // 获取用户加入的队伍
  useEffect(() => {
    const fetchJoinedTeams = async () => {
      setLoadingJoinedTeams(true)
      try {
        const data = await getUserJoinedTeams(userId)
        setJoinedTeams(data)
      } catch (err) {
        console.error('获取用户加入的队伍失败:', err)
      } finally {
        setLoadingJoinedTeams(false)
      }
    }

    if (userId) {
      fetchJoinedTeams()
    }
  }, [userId])

  // 获取用户信誉
  useEffect(() => {
    const fetchReputation = async () => {
      setLoadingReputation(true)
      try {
        const data = await getUserReputation(userId)
        setReputation(data)
      } catch (err) {
        console.error('获取用户信誉失败:', err)
      } finally {
        setLoadingReputation(false)
      }
    }

    if (userId) {
      fetchReputation()
    }
  }, [userId])

  // 获取状态标签
  const getStatusBadge = (status: string, memberCount: number, maxMembers: number, endTime: string) => {
    const now = new Date()
    const end = new Date(endTime)
    if (end < now) {
      return <Badge variant="secondary">已完成</Badge>
    }

    if (status === 'full' || memberCount >= maxMembers) {
      return <Badge variant="secondary">已满员</Badge>
    }
    if (status === 'closed') {
      return <Badge variant="secondary">已关闭</Badge>
    }
    return <Badge className="bg-green-500">招募中</Badge>
  }

  // 检查队伍是否已完成
  const isTeamCompleted = (endTime: string) => {
    const now = new Date()
    const end = new Date(endTime)
    return end < now
  }

  // 筛选进行中的队伍
  const activeTeams = teams.filter(team => !isTeamCompleted(team.end_time))
  const activeJoinedTeams = joinedTeams.filter(team => !isTeamCompleted(team.end_time))

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent"></div>
          <p className="mt-4 text-muted-foreground">加载中...</p>
        </div>
      </div>
    )
  }

  if (error || !user) {
    return (
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">{error || '用户不存在'}</p>
          <Button asChild>
            <Link href="/teams">
              <ArrowLeft className="mr-2 h-4 w-4" />
              返回队伍列表
            </Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      {/* 返回按钮 */}
      <div className="mb-6">
        <Button variant="ghost" asChild>
          <Link href="/teams">
            <ArrowLeft className="mr-2 h-4 w-4" />
            返回
          </Link>
        </Button>
      </div>

      {/* 页面标题 */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">{user.username} 的个人主页</h1>
        <p className="text-muted-foreground">
          查看用户的公开信息和队伍
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* 左侧：个人资料 */}
        <div className="lg:col-span-1 space-y-6">
          {/* 基本信息卡片 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserIcon className="h-5 w-5" />
                基本信息
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-2xl font-bold text-primary">
                    {user.username.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <h3 className="font-semibold text-lg">{user.username}</h3>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Mail className="h-3 w-3" />
                    {user.email}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 联系方式卡片 - 只显示公开的联系方式 */}
          {((user.wechat && user.wechat_visible) ||
            (user.qq && user.qq_visible) ||
            (user.yy && user.yy_visible)) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageCircle className="h-5 w-5" />
                  联系方式
                </CardTitle>
                <CardDescription>
                  用户公开的联系方式
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {user.wechat && user.wechat_visible && (
                    <>
                      <div className="flex items-center justify-between py-2">
                        <span className="text-muted-foreground">微信</span>
                        <span>{user.wechat}</span>
                      </div>
                      <Separator />
                    </>
                  )}
                  {user.qq && user.qq_visible && (
                    <>
                      <div className="flex items-center justify-between py-2">
                        <span className="text-muted-foreground">QQ</span>
                        <span>{user.qq}</span>
                      </div>
                      <Separator />
                    </>
                  )}
                  {user.yy && user.yy_visible && (
                    <div className="flex items-center justify-between py-2">
                      <span className="text-muted-foreground">YY</span>
                      <span>{user.yy}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* 信誉卡片 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5 text-amber-500" />
                用户信誉
              </CardTitle>
              <CardDescription>
                基于队友对该用户的评价
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingReputation ? (
                <div className="text-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                </div>
              ) : reputation && reputation.totalReviews > 0 ? (
                <div className="space-y-4">
                  {/* 平均评分 */}
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                      <span className="font-medium">平均评分</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-bold">{reputation.averageRating}</span>
                      <span className="text-muted-foreground text-sm">/ 5.0</span>
                    </div>
                  </div>

                  {/* 评价次数 */}
                  <div className="flex items-center justify-between py-2">
                    <span className="text-muted-foreground">收到评价</span>
                    <span className="font-medium">{reputation.totalReviews} 次</span>
                  </div>

                  {/* 标签统计 */}
                  {Object.keys(reputation.tagStats).length > 0 && (
                    <>
                      <Separator />
                      <div>
                        <p className="text-sm font-medium mb-3">队友评价标签</p>
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(reputation.tagStats)
                            .sort(([, a], [, b]) => b - a)
                            .map(([tag, count]) => (
                              <Badge key={tag} variant="secondary" className="text-sm">
                                {tag} × {count}
                              </Badge>
                            ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Award className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                  <p className="text-muted-foreground">暂无评价</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* 右侧：队伍列表 */}
        <div className="lg:col-span-2 space-y-6">
          {/* 发起的队伍 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-yellow-500" />
                发起的队伍
                <Badge variant="secondary" className="ml-2">{activeTeams.length}</Badge>
              </CardTitle>
              <CardDescription>
                该用户创建的进行中的组队信息
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingTeams ? (
                <div className="text-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                </div>
              ) : activeTeams.length === 0 ? (
                <div className="text-center py-8">
                  <Gamepad2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">暂无进行中的组队</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {activeTeams.map(team => (
                    <div
                      key={team.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="shrink-0 text-xs font-mono">ID: {team.id}</Badge>
                          <Badge variant="outline">{team.game}</Badge>
                          {getStatusBadge(team.status, team.member_count, team.max_members, team.end_time)}
                        </div>
                        <h4 className="font-medium truncate">{team.title}</h4>
                        <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {team.member_count}/{team.max_members}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatTimeForDisplay(team.start_time)}
                            {' - '}
                            {formatTimeForDisplay(team.end_time)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* 加入的队伍 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-500" />
                加入的队伍
                <Badge variant="secondary" className="ml-2">{activeJoinedTeams.length}</Badge>
              </CardTitle>
              <CardDescription>
                该用户加入的进行中的队伍
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingJoinedTeams ? (
                <div className="text-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                </div>
              ) : activeJoinedTeams.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">暂无进行中的队伍</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {activeJoinedTeams.map(team => (
                    <div
                      key={team.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="shrink-0 text-xs font-mono">ID: {team.id}</Badge>
                          <Badge variant="outline">{team.game}</Badge>
                          {getStatusBadge(team.status, team.member_count, team.max_members, team.end_time)}
                        </div>
                        <h4 className="font-medium truncate">{team.title}</h4>
                        <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {team.member_count}/{team.max_members}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatTimeForDisplay(team.start_time)}
                            {' - '}
                            {formatTimeForDisplay(team.end_time)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
