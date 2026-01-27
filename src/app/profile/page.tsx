'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  User,
  Mail,
  MessageCircle,
  Edit2,
  Save,
  X,
  Users,
  Clock,
  Gamepad2,
  Crown,
  UserPlus,
  Loader2,
  LogOut,
  UserMinus
} from 'lucide-react'
import {
  getUserTeams,
  getJoinedTeams,
  updateUser,
  leaveTeam,
  getTeamMembers,
  kickMember,
  ApiError
} from '@/lib/api'
import { useAuth } from '@/hooks'
import type { Team, TeamMember } from '@/types'

export default function ProfilePage() {
  // 使用 useAuth 处理认证，未登录自动跳转
  const { user, loading, logout, updateUser: updateLocalUser } = useAuth({
    redirectTo: '/login',
  })

  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editForm, setEditForm] = useState({
    wechat: '',
    qq: '',
    yy: ''
  })

  // 我发起的队伍
  const [myTeams, setMyTeams] = useState<Team[]>([])
  const [loadingMyTeams, setLoadingMyTeams] = useState(true)

  // 我加入的队伍
  const [joinedTeams, setJoinedTeams] = useState<Team[]>([])
  const [loadingJoinedTeams, setLoadingJoinedTeams] = useState(true)

  // 退出队伍确认弹窗
  const [leaveDialog, setLeaveDialog] = useState<{
    open: boolean
    teamId?: number
    teamTitle?: string
  }>({ open: false })
  const [leaving, setLeaving] = useState(false)

  // 队伍详情弹窗状态
  const [membersDialog, setMembersDialog] = useState<{
    open: boolean
    teamId?: number
    teamTitle?: string
    teamDescription?: string
    members?: TeamMember[]
    loading?: boolean
    isCreator?: boolean
  }>({ open: false })

  // 踢出队友确认弹窗
  const [kickDialog, setKickDialog] = useState<{
    open: boolean
    teamId?: number
    userId?: number
    username?: string
  }>({ open: false })
  const [kicking, setKicking] = useState(false)

  // 用户信息加载后，初始化表单和获取队伍数据
  useEffect(() => {
    if (user) {
      setEditForm({
        wechat: user.wechat || '',
        qq: user.qq || '',
        yy: user.yy || ''
      })
      fetchMyTeams(user.id)
      fetchJoinedTeamsList()
    }
  }, [user])

  // 获取我发起的队伍
  const fetchMyTeams = async (userId: number) => {
    setLoadingMyTeams(true)
    try {
      const data = await getUserTeams(userId)
      setMyTeams(data)
    } catch (error) {
      console.error('获取我的队伍失败:', error)
    } finally {
      setLoadingMyTeams(false)
    }
  }

  // 获取我加入的队伍
  const fetchJoinedTeamsList = async () => {
    setLoadingJoinedTeams(true)
    try {
      const data = await getJoinedTeams()
      setJoinedTeams(data)
    } catch (error) {
      console.error('获取加入的队伍失败:', error)
    } finally {
      setLoadingJoinedTeams(false)
    }
  }

  // 保存联系方式
  const handleSaveContact = async () => {
    if (!user) return

    setSaving(true)
    try {
      await updateUser(user.id, editForm)
      updateLocalUser(editForm)
      setEditing(false)
    } catch (error) {
      console.error('保存联系方式错误:', error)
      alert('保存失败，请稍后重试')
    } finally {
      setSaving(false)
    }
  }

  // 退出队伍
  const handleLeaveTeam = async () => {
    if (!leaveDialog.teamId) return

    setLeaving(true)
    try {
      await leaveTeam(leaveDialog.teamId)
      // 刷新加入的队伍列表
      fetchJoinedTeamsList()
      setLeaveDialog({ open: false })
    } catch (err) {
      if (err instanceof ApiError) {
        alert(err.message || '退出失败')
      } else {
        alert('网络错误，请稍后重试')
      }
      console.error('退出队伍错误:', err)
    } finally {
      setLeaving(false)
    }
  }

  // 查看队伍详情
  const showMembers = async (teamId: number, teamTitle: string, teamDescription?: string, isCreator: boolean = false) => {
    // 打开弹窗并开始加载
    setMembersDialog({
      open: true,
      teamId,
      teamTitle,
      teamDescription,
      loading: true,
      isCreator
    })

    try {
      const members = await getTeamMembers(teamId)
      setMembersDialog({
        open: true,
        teamId,
        teamTitle,
        teamDescription,
        members,
        loading: false,
        isCreator
      })
    } catch (err) {
      if (err instanceof ApiError) {
        alert(err.message || '获取队伍信息失败')
      } else {
        alert('网络错误，请稍后重试')
      }
      console.error('获取队伍信息错误:', err)
      setMembersDialog({ open: false })
    }
  }

  // 踢出队友
  const handleKickMember = async () => {
    if (!kickDialog.teamId || !kickDialog.userId) return

    setKicking(true)
    try {
      await kickMember(kickDialog.teamId, kickDialog.userId)
      // 刷新队伍成员列表
      if (membersDialog.teamId) {
        const members = await getTeamMembers(membersDialog.teamId)
        setMembersDialog(prev => ({ ...prev, members }))
      }
      setKickDialog({ open: false })
    } catch (err) {
      if (err instanceof ApiError) {
        alert(err.message || '踢出失败')
      } else {
        alert('网络错误，请稍后重试')
      }
      console.error('踢出队友错误:', err)
    } finally {
      setKicking(false)
    }
  }

  // 登出
  const handleLogout = async () => {
    await logout()
  }

  // 获取状态标签
  const getStatusBadge = (status: string, memberCount: number, maxMembers: number, endTime: string) => {
    // 检查是否过期
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

  // 获取联系方式图标
  const getContactIcon = (method: string) => {
    switch (method) {
      case 'wechat': return '微信'
      case 'qq': return 'QQ'
      case 'yy': return 'YY'
      default: return '联系方式'
    }
  }

  // 筛选进行中的队伍（未完成的）
  const activeMyTeams = myTeams.filter(team => !isTeamCompleted(team.end_time))
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

  if (!user) return null

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      {/* 页面标题 */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">个人中心</h1>
        <p className="text-muted-foreground">
          管理你的个人信息和队伍
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* 左侧：个人资料 */}
        <div className="lg:col-span-1 space-y-6">
          {/* 基本信息卡片 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
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

          {/* 联系方式卡片 */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <MessageCircle className="h-5 w-5" />
                  联系方式
                </CardTitle>
                {!editing ? (
                  <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
                    <Edit2 className="h-4 w-4" />
                  </Button>
                ) : (
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditing(false)
                        setEditForm({
                          wechat: user.wechat || '',
                          qq: user.qq || '',
                          yy: user.yy || ''
                        })
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleSaveContact}
                      disabled={saving}
                    >
                      {saving ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                )}
              </div>
              <CardDescription>
                发布组队时会自动填充这些联系方式
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {editing ? (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="wechat">微信</Label>
                    <Input
                      id="wechat"
                      placeholder="请输入微信号"
                      value={editForm.wechat}
                      onChange={(e) => setEditForm({ ...editForm, wechat: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="qq">QQ</Label>
                    <Input
                      id="qq"
                      placeholder="请输入QQ号"
                      value={editForm.qq}
                      onChange={(e) => setEditForm({ ...editForm, qq: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="yy">YY</Label>
                    <Input
                      id="yy"
                      placeholder="请输入YY号"
                      value={editForm.yy}
                      onChange={(e) => setEditForm({ ...editForm, yy: e.target.value })}
                    />
                  </div>
                </>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between py-2">
                    <span className="text-muted-foreground">微信</span>
                    <span className={user.wechat ? '' : 'text-muted-foreground'}>
                      {user.wechat || '未设置'}
                    </span>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between py-2">
                    <span className="text-muted-foreground">QQ</span>
                    <span className={user.qq ? '' : 'text-muted-foreground'}>
                      {user.qq || '未设置'}
                    </span>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between py-2">
                    <span className="text-muted-foreground">YY</span>
                    <span className={user.yy ? '' : 'text-muted-foreground'}>
                      {user.yy || '未设置'}
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* 右侧：队伍列表 */}
        <div className="lg:col-span-2 space-y-6">
          {/* 我发起的队伍 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-yellow-500" />
                我发起的队伍
                <Badge variant="secondary" className="ml-2">{activeMyTeams.length}</Badge>
              </CardTitle>
              <CardDescription>
                你创建的进行中的组队信息
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingMyTeams ? (
                <div className="text-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                </div>
              ) : activeMyTeams.length === 0 ? (
                <div className="text-center py-8">
                  <Gamepad2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground mb-4">暂无进行中的组队</p>
                  <Button asChild>
                    <Link href="/teams/create">发布组队</Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {activeMyTeams.map(team => (
                    <div
                      key={team.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
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
                            {new Date(team.start_time).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                            {' - '}
                            {new Date(team.end_time).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => showMembers(team.id, team.title, team.description || undefined, true)}
                        >
                          <Users className="mr-1 h-3 w-3" />
                          查看队伍
                        </Button>
                        {/* {!isTeamCompleted(team.end_time) && (
                          <Button variant="outline" size="sm" asChild>
                            <Link href={`/teams/${team.id}/manage`}>管理</Link>
                          </Button>
                        )} */}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* 我加入的队伍 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-blue-500" />
                我加入的队伍
                <Badge variant="secondary" className="ml-2">{activeJoinedTeams.length}</Badge>
              </CardTitle>
              <CardDescription>
                你作为队员加入的进行中的队伍
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
                  <p className="text-muted-foreground mb-4">暂无进行中的队伍</p>
                  <Button asChild>
                    <Link href="/teams">浏览队伍</Link>
                  </Button>
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
                            {new Date(team.start_time).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                            {' - '}
                            {new Date(team.end_time).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 mt-1 text-sm text-muted-foreground">
                          <MessageCircle className="h-3 w-3" />
                          <span>{getContactIcon(team.contact_method)}: {team.contact_value}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setLeaveDialog({
                            open: true,
                            teamId: team.id,
                            teamTitle: team.title
                          })}
                        >
                          退出
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => showMembers(team.id, team.title, team.description || undefined)}
                        >
                          <Users className="mr-1 h-3 w-3" />
                          查看队伍
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 退出队伍确认弹窗 */}
      <Dialog open={leaveDialog.open} onOpenChange={(open) => setLeaveDialog({ open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认退出队伍</DialogTitle>
            <DialogDescription>
              你确定要退出「{leaveDialog.teamTitle}」吗？退出后需要重新申请加入。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setLeaveDialog({ open: false })}
            >
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={handleLeaveTeam}
              disabled={leaving}
            >
              {leaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  退出中...
                </>
              ) : (
                '确认退出'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 队伍详情弹窗 */}
      <Dialog open={membersDialog.open} onOpenChange={(open) => setMembersDialog({ open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              队伍详情
            </DialogTitle>
            <DialogDescription>
              {membersDialog.teamTitle}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {membersDialog.loading ? (
              <div className="text-center py-8">
                <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                <p className="mt-2 text-sm text-muted-foreground">加载中...</p>
              </div>
            ) : (
              <>
                {/* 队伍描述 */}
                {membersDialog.teamDescription && (
                  <div className="mb-4 p-3 bg-muted/50 rounded-lg">
                    <h4 className="text-sm font-semibold mb-1">队伍描述</h4>
                    <p className="text-sm text-muted-foreground">{membersDialog.teamDescription}</p>
                  </div>
                )}

                {/* 队友列表 */}
                <div className="mb-2">
                  <h4 className="text-sm font-semibold mb-2">队友列表</h4>
                  {membersDialog.members && membersDialog.members.length > 0 ? (
                    <div className="space-y-2">
                      {membersDialog.members.map((member) => (
                        <div
                          key={member.id}
                          className="flex items-center justify-between p-3 border rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                              <span className="font-semibold text-primary">
                                {member.username.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-medium">{member.username}</p>
                                {member.isCreator && (
                                  <Badge variant="secondary" className="text-xs">
                                    <Crown className="h-3 w-3 mr-1" />
                                    队长
                                  </Badge>
                                )}
                              </div>
                              {member.joined_at && (
                                <p className="text-xs text-muted-foreground">
                                  加入于 {new Date(member.joined_at).toLocaleString('zh-CN', {
                                    month: '2-digit',
                                    day: '2-digit',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </p>
                              )}
                            </div>
                          </div>
                          {membersDialog.isCreator && !member.isCreator && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => setKickDialog({
                                open: true,
                                teamId: membersDialog.teamId,
                                userId: member.user_id,
                                username: member.username
                              })}
                            >
                              <UserMinus className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Users className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                      <p className="text-muted-foreground">暂无队友信息</p>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => setMembersDialog({ open: false })}>
              关闭
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 踢出队友确认弹窗 */}
      <Dialog open={kickDialog.open} onOpenChange={(open) => setKickDialog({ open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认踢出队友</DialogTitle>
            <DialogDescription>
              你确定要将「{kickDialog.username}」踢出队伍吗？此操作无法撤销。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setKickDialog({ open: false })}
            >
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={handleKickMember}
              disabled={kicking}
            >
              {kicking ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  踢出中...
                </>
              ) : (
                '确认踢出'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
