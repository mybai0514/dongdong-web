'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
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
  LogOut
} from 'lucide-react'

interface UserInfo {
  id: number
  username: string
  email: string
  avatar?: string
  wechat?: string
  qq?: string
  yy?: string
}

interface Team {
  id: number
  game: string
  title: string
  description?: string
  rank_requirement?: string
  contact_method: string
  contact_value: string
  creator_id: number
  status: 'open' | 'closed' | 'full'
  member_count: number
  max_members: number
  created_at: string
}

export default function ProfilePage() {
  const router = useRouter()
  const [user, setUser] = useState<UserInfo | null>(null)
  const [loading, setLoading] = useState(true)
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

  // 检查登录状态并获取用户信息
  useEffect(() => {
    const userStr = localStorage.getItem('user')
    const token = localStorage.getItem('token')

    if (!userStr || !token) {
      router.push('/login?redirect=/profile')
      return
    }

    const userData = JSON.parse(userStr)
    setUser(userData)
    setEditForm({
      wechat: userData.wechat || '',
      qq: userData.qq || '',
      yy: userData.yy || ''
    })
    setLoading(false)

    // 获取我发起的队伍和加入的队伍
    fetchMyTeams(userData.id, token)
    fetchJoinedTeams(token)
  }, [router])

  // 获取我发起的队伍
  const fetchMyTeams = async (userId: number, token: string) => {
    setLoadingMyTeams(true)
    try {
      const response = await fetch(`http://localhost:8787/api/users/${userId}/teams`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      const data = await response.json()
      if (Array.isArray(data)) {
        setMyTeams(data)
      }
    } catch (error) {
      console.error('获取我的队伍失败:', error)
    } finally {
      setLoadingMyTeams(false)
    }
  }

  // 获取我加入的队伍
  const fetchJoinedTeams = async (token: string) => {
    setLoadingJoinedTeams(true)
    try {
      const response = await fetch('http://localhost:8787/api/users/me/joined-teams', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      const data = await response.json()
      if (Array.isArray(data)) {
        setJoinedTeams(data)
      }
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
      const token = localStorage.getItem('token')
      const response = await fetch(`http://localhost:8787/api/users/${user.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(editForm)
      })

      if (response.ok) {
        const updatedUser = { ...user, ...editForm }
        setUser(updatedUser)
        localStorage.setItem('user', JSON.stringify(updatedUser))
        setEditing(false)
      } else {
        alert('保存失败，请稍后重试')
      }
    } catch (error) {
      console.error('保存联系方式错误:', error)
      alert('网络错误，请稍后重试')
    } finally {
      setSaving(false)
    }
  }

  // 退出队伍
  const handleLeaveTeam = async () => {
    if (!leaveDialog.teamId) return

    setLeaving(true)
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`http://localhost:8787/api/teams/${leaveDialog.teamId}/leave`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (response.ok) {
        // 刷新加入的队伍列表
        fetchJoinedTeams(token!)
        setLeaveDialog({ open: false })
      } else {
        const data: { error?: string } = await response.json()
        alert(data.error || '退出失败')
      }
    } catch (error) {
      console.error('退出队伍错误:', error)
      alert('网络错误，请稍后重试')
    } finally {
      setLeaving(false)
    }
  }

  // 登出
  const handleLogout = async () => {
    try {
      const token = localStorage.getItem('token')
      await fetch('http://localhost:8787/api/auth/logout', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
    } catch (error) {
      console.error('登出错误:', error)
    } finally {
      localStorage.removeItem('user')
      localStorage.removeItem('token')
      router.push('/login')
    }
  }

  // 格式化时间
  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
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
      case 'wechat': return '微信'
      case 'qq': return 'QQ'
      case 'yy': return 'YY'
      default: return '联系方式'
    }
  }

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
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">个人中心</h1>
          <p className="text-muted-foreground">
            管理你的个人信息和队伍
          </p>
        </div>
        <Button variant="outline" onClick={handleLogout}>
          <LogOut className="mr-2 h-4 w-4" />
          退出登录
        </Button>
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
                <Badge variant="secondary" className="ml-2">{myTeams.length}</Badge>
              </CardTitle>
              <CardDescription>
                你创建的所有组队信息
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingMyTeams ? (
                <div className="text-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                </div>
              ) : myTeams.length === 0 ? (
                <div className="text-center py-8">
                  <Gamepad2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground mb-4">你还没有发起过组队</p>
                  <Button asChild>
                    <Link href="/teams/create">发布组队</Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {myTeams.map(team => (
                    <div
                      key={team.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline">{team.game}</Badge>
                          {getStatusBadge(team.status, team.member_count, team.max_members)}
                        </div>
                        <h4 className="font-medium truncate">{team.title}</h4>
                        <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {team.member_count}/{team.max_members}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatTime(team.created_at)}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/teams/${team.id}/manage`}>管理</Link>
                        </Button>
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
                <Badge variant="secondary" className="ml-2">{joinedTeams.length}</Badge>
              </CardTitle>
              <CardDescription>
                你作为队员加入的队伍
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingJoinedTeams ? (
                <div className="text-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                </div>
              ) : joinedTeams.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground mb-4">你还没有加入任何队伍</p>
                  <Button asChild>
                    <Link href="/teams">浏览队伍</Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {joinedTeams.map(team => (
                    <div
                      key={team.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline">{team.game}</Badge>
                          {getStatusBadge(team.status, team.member_count, team.max_members)}
                        </div>
                        <h4 className="font-medium truncate">{team.title}</h4>
                        <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <MessageCircle className="h-3 w-3" />
                            {getContactIcon(team.contact_method)}: {team.contact_value}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatTime(team.created_at)}
                          </span>
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
    </div>
  )
}
