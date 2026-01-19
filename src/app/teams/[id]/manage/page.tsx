'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  ArrowLeft,
  Loader2,
  Save,
  Trash2,
  UserMinus,
  Users,
  Crown,
  AlertTriangle,
  Settings
} from 'lucide-react'
import {
  getTeam,
  getTeamMembers,
  updateTeam,
  deleteTeam,
  kickMember,
  getStoredUser,
  ApiError
} from '@/lib/api'
import type { User, Team, TeamMember, ContactMethod } from '@/types'

// 游戏列表
const GAMES = [
  '王者荣耀',
  '和平精英',
  '英雄联盟',
  'VALORANT',
  'CS2',
  'DOTA2',
  '永劫无间',
  '其他'
]

// 段位选项
const RANKS: { [key: string]: string[] } = {
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
const CONTACT_METHODS = [
  { value: 'wechat', label: '微信' },
  { value: 'qq', label: 'QQ' },
  { value: 'yy', label: 'YY' }
]

export default function ManageTeamPage() {
  const router = useRouter()
  const params = useParams()
  const teamId = Number(params.id)

  const [user, setUser] = useState<User | null>(null)
  const [team, setTeam] = useState<Team | null>(null)
  const [members, setMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [formData, setFormData] = useState<{
    title: string
    description: string
    rank_requirement: string
    contact_method: ContactMethod
    contact_value: string
    max_members: number
    status: 'open' | 'closed' | 'full'
  }>({
    title: '',
    description: '',
    rank_requirement: '不限',
    contact_method: 'wechat',
    contact_value: '',
    max_members: 5,
    status: 'open'
  })

  // 解散队伍弹窗
  const [disbandDialog, setDisbandDialog] = useState(false)
  const [disbanding, setDisbanding] = useState(false)

  // 踢出成员弹窗
  const [kickDialog, setKickDialog] = useState<{
    open: boolean
    member?: TeamMember
  }>({ open: false })
  const [kicking, setKicking] = useState(false)

  // 检查登录状态并获取队伍信息
  useEffect(() => {
    const userData = getStoredUser<User>()

    if (!userData) {
      router.push(`/login?redirect=/teams/${teamId}/manage`)
      return
    }

    setUser(userData)
    fetchTeamData()
    fetchMembersList()
  }, [router, teamId])

  // 获取队伍信息
  const fetchTeamData = async () => {
    try {
      const data = await getTeam(teamId)
      setTeam(data)

      // 检查是否是队长
      const userData = getStoredUser<User>()
      if (userData && data.creator_id !== userData.id) {
        router.push('/teams')
        return
      }

      setFormData({
        title: data.title,
        description: data.description || '',
        rank_requirement: data.rank_requirement || '不限',
        contact_method: data.contact_method,
        contact_value: data.contact_value,
        max_members: data.max_members,
        status: data.status
      })
    } catch (err) {
      console.error('获取队伍信息错误:', err)
      setError('队伍不存在或获取失败')
    } finally {
      setLoading(false)
    }
  }

  // 获取队伍成员
  const fetchMembersList = async () => {
    try {
      const data = await getTeamMembers(teamId)
      setMembers(data)
    } catch (err) {
      console.error('获取成员列表错误:', err)
    }
  }

  // 保存队伍信息
  const handleSave = async () => {
    if (!formData.title) {
      setError('标题不能为空')
      return
    }

    if (!formData.contact_value) {
      setError('联系方式不能为空')
      return
    }

    setSaving(true)
    setError('')

    try {
      await updateTeam(teamId, formData)
      // 更新本地状态
      if (team) {
        setTeam({ ...team, ...formData })
      }
      alert('保存成功')
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message || '保存失败')
      } else {
        setError('网络错误，请稍后重试')
      }
      console.error('保存队伍信息错误:', err)
    } finally {
      setSaving(false)
    }
  }

  // 解散队伍
  const handleDisband = async () => {
    setDisbanding(true)

    try {
      await deleteTeam(teamId)
      router.push('/profile')
    } catch (err) {
      if (err instanceof ApiError) {
        alert(err.message || '解散失败')
      } else {
        alert('网络错误，请稍后重试')
      }
      console.error('解散队伍错误:', err)
    } finally {
      setDisbanding(false)
      setDisbandDialog(false)
    }
  }

  // 踢出成员
  const handleKick = async () => {
    if (!kickDialog.member) return

    setKicking(true)

    try {
      await kickMember(teamId, kickDialog.member.user_id)
      // 刷新成员列表
      fetchMembersList()
      // 更新队伍人数
      if (team) {
        setTeam({ ...team, member_count: team.member_count - 1 })
      }
      setKickDialog({ open: false })
    } catch (err) {
      if (err instanceof ApiError) {
        alert(err.message || '踢出失败')
      } else {
        alert('网络错误，请稍后重试')
      }
      console.error('踢出成员错误:', err)
    } finally {
      setKicking(false)
    }
  }

  // 格式化时间
  const formatTime = (dateString: string | null) => {
    if (!dateString) return '未知时间'
    const date = new Date(dateString)
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
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

  if (error && !team) {
    return (
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardContent className="py-12 text-center">
            <AlertTriangle className="h-12 w-12 mx-auto text-destructive mb-4" />
            <h3 className="text-lg font-semibold mb-2">{error}</h3>
            <Button asChild className="mt-4">
              <Link href="/teams">返回队伍列表</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!team) return null

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      {/* 返回按钮 */}
      <Button variant="ghost" asChild className="mb-6">
        <Link href="/profile">
          <ArrowLeft className="mr-2 h-4 w-4" />
          返回个人中心
        </Link>
      </Button>

      {/* 页面标题 */}
      <div className="flex items-center gap-3 mb-8">
        <Settings className="h-8 w-8" />
        <div>
          <h1 className="text-3xl font-bold">队伍管理</h1>
          <p className="text-muted-foreground">
            管理「{team.title}」的信息和成员
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* 左侧：编辑队伍信息 */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>队伍信息</CardTitle>
              <CardDescription>
                编辑队伍的基本信息
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
                {/* 游戏（不可修改） */}
                <div className="space-y-2">
                  <Label>游戏</Label>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-base py-1 px-3">
                      {team.game}
                    </Badge>
                    <span className="text-sm text-muted-foreground">（不可修改）</span>
                  </div>
                </div>

                {/* 组队标题 */}
                <div className="space-y-2">
                  <Label htmlFor="title">组队标题 *</Label>
                  <Input
                    id="title"
                    placeholder="例如：钻石局找辅助、五排开黑"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                    maxLength={50}
                  />
                  <p className="text-xs text-muted-foreground">
                    {formData.title.length}/50
                  </p>
                </div>

                {/* 段位要求 */}
                <div className="space-y-2">
                  <Label htmlFor="rank">段位要求</Label>
                  <Select
                    value={formData.rank_requirement}
                    onValueChange={(value) => setFormData({ ...formData, rank_requirement: value })}
                  >
                    <SelectTrigger id="rank">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(RANKS[team.game] || RANKS['默认']).map(rank => (
                        <SelectItem key={rank} value={rank}>
                          {rank}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* 队伍人数 */}
                <div className="space-y-2">
                  <Label htmlFor="max_members">队伍人数上限 *</Label>
                  <Input
                    id="max_members"
                    type="number"
                    min={team.member_count}
                    max={10}
                    value={formData.max_members}
                    onChange={(e) => setFormData({ ...formData, max_members: Number(e.target.value) })}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    当前 {team.member_count} 人，最少不能低于当前人数
                  </p>
                </div>

                {/* 队伍状态 */}
                <div className="space-y-2">
                  <Label htmlFor="status">队伍状态</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => setFormData({ ...formData, status: value as 'open' | 'closed' })}
                  >
                    <SelectTrigger id="status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">招募中</SelectItem>
                      <SelectItem value="closed">已关闭</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* 详细描述 */}
                <div className="space-y-2">
                  <Label htmlFor="description">详细描述（可选）</Label>
                  <Textarea
                    id="description"
                    placeholder="描述你的组队需求"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={4}
                    maxLength={200}
                  />
                  <p className="text-xs text-muted-foreground">
                    {formData.description.length}/200
                  </p>
                </div>

                {/* 联系方式 */}
                <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
                  <h3 className="font-semibold text-sm">联系方式</h3>

                  <div className="space-y-2">
                    <Label htmlFor="contact_method">联系方式类型 *</Label>
                    <Select
                      value={formData.contact_method}
                      onValueChange={(value) => setFormData({ ...formData, contact_method: value as ContactMethod })}
                    >
                      <SelectTrigger id="contact_method">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CONTACT_METHODS.map(method => (
                          <SelectItem key={method.value} value={method.value}>
                            {method.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="contact_value">
                      {CONTACT_METHODS.find(m => m.value === formData.contact_method)?.label} 号 *
                    </Label>
                    <Input
                      id="contact_value"
                      placeholder={`请输入你的${CONTACT_METHODS.find(m => m.value === formData.contact_method)?.label}号`}
                      value={formData.contact_value}
                      onChange={(e) => setFormData({ ...formData, contact_value: e.target.value })}
                      required
                    />
                  </div>
                </div>

                {/* 错误提示 */}
                {error && (
                  <div className="text-sm text-destructive bg-destructive/10 p-3 rounded">
                    {error}
                  </div>
                )}

                {/* 保存按钮 */}
                <Button type="submit" className="w-full" disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      保存中...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      保存修改
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* 右侧：成员管理和危险操作 */}
        <div className="space-y-6">
          {/* 成员列表 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                队伍成员
                <Badge variant="secondary">{team.member_count}/{team.max_members}</Badge>
              </CardTitle>
              <CardDescription>
                管理队伍中的成员
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {/* 队长（自己） */}
                <div className="flex items-center justify-between p-3 bg-primary/5 rounded-lg border border-primary/20">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Crown className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">你（队长）</p>
                      <p className="text-xs text-muted-foreground">
                        创建于 {formatTime(team.created_at)}
                      </p>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* 队员列表 */}
                {members.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">
                    暂无其他成员
                  </p>
                ) : (
                  members.map(member => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                          <span className="text-sm font-medium">
                            {member.username.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium">{member.username}</p>
                          <p className="text-xs text-muted-foreground">
                            加入于 {formatTime(member.joined_at)}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => setKickDialog({ open: true, member })}
                      >
                        <UserMinus className="h-4 w-4" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* 危险操作 */}
          <Card className="border-destructive/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                危险操作
              </CardTitle>
              <CardDescription>
                以下操作不可撤销，请谨慎操作
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant="destructive"
                className="w-full"
                onClick={() => setDisbandDialog(true)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                解散队伍
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 解散队伍确认弹窗 */}
      <Dialog open={disbandDialog} onOpenChange={setDisbandDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              确认解散队伍
            </DialogTitle>
            <DialogDescription>
              你确定要解散「{team.title}」吗？此操作不可撤销，所有成员将被移出队伍。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDisbandDialog(false)}
            >
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={handleDisband}
              disabled={disbanding}
            >
              {disbanding ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  解散中...
                </>
              ) : (
                '确认解散'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 踢出成员确认弹窗 */}
      <Dialog open={kickDialog.open} onOpenChange={(open) => setKickDialog({ open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认踢出成员</DialogTitle>
            <DialogDescription>
              你确定要将「{kickDialog.member?.username}」踢出队伍吗？
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
              onClick={handleKick}
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
