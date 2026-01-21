'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { DateTimePicker } from '@/components/ui/datetime-picker'
import { ArrowLeft, Loader2, Plus } from 'lucide-react'
import { createTeam, ApiError } from '@/lib/api'
import { GAMES, CONTACT_METHODS, getRanks } from '@/lib/constants'
import { useAuth } from '@/hooks'
import type { ContactMethod } from '@/types'

export default function CreateTeamPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth({ redirectTo: '/login' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [formData, setFormData] = useState<{
    game: string
    title: string
    description: string
    rank_requirement: string
    start_time: Date | undefined
    end_time: Date | undefined
    contact_method: ContactMethod
    contact_value: string
    max_members: number
  }>({
    game: '',
    title: '',
    description: '',
    rank_requirement: '不限',
    start_time: undefined,
    end_time: undefined,
    contact_method: 'wechat',
    contact_value: '',
    max_members: 5
  })

  // 自动填充用户的联系方式
  useEffect(() => {
    if (!user) return

    if (user.wechat) {
      setFormData(prev => ({
        ...prev,
        contact_method: 'wechat',
        contact_value: user.wechat || ''
      }))
    } else if (user.qq) {
      setFormData(prev => ({
        ...prev,
        contact_method: 'qq',
        contact_value: user.qq || ''
      }))
    } else if (user.yy) {
      setFormData(prev => ({
        ...prev,
        contact_method: 'yy',
        contact_value: user.yy || ''
      }))
    }
  }, [user])

  // 当游戏改变时，重置段位要求
  const handleGameChange = (game: string) => {
    setFormData(prev => ({
      ...prev,
      game,
      rank_requirement: '不限'
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // 验证
    if (!formData.game || !formData.title) {
      setError('请填写游戏和标题')
      return
    }

    if (!formData.start_time || !formData.end_time) {
      setError('请选择开始时间和结束时间')
      return
    }

    if (!formData.contact_value) {
      setError('请填写联系方式')
      return
    }

    if (formData.max_members < 2 || formData.max_members > 10) {
      setError('队伍人数必须在 2-10 人之间')
      return
    }

    if (!user) {
      setError('请先登录')
      return
    }

    setLoading(true)

    try {
      await createTeam({
        game: formData.game,
        title: formData.title,
        description: formData.description,
        rank_requirement: formData.rank_requirement,
        start_time: formData.start_time.toISOString(),
        end_time: formData.end_time.toISOString(),
        contact_method: formData.contact_method,
        contact_value: formData.contact_value,
        max_members: formData.max_members,
        creator_id: user.id
      })
      router.push('/teams')
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message || '发布失败')
      } else {
        setError('网络错误，请稍后重试')
      }
      console.error('发布组队错误:', err)
    } finally {
      setLoading(false)
    }
  }

  if (authLoading || !user) {
    return (
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      {/* 返回按钮 */}
      <Button variant="ghost" asChild className="mb-6">
        <Link href="/teams">
          <ArrowLeft className="mr-2 h-4 w-4" />
          返回组队列表
        </Link>
      </Button>

      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>发布组队</CardTitle>
            <CardDescription>
              填写组队信息，找到志同道合的游戏伙伴
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* 选择游戏 */}
              <div className="space-y-2">
                <Label htmlFor="game">游戏 *</Label>
                <Select 
                  value={formData.game} 
                  onValueChange={handleGameChange}
                  required
                >
                  <SelectTrigger id="game">
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
                    {getRanks(formData.game).map(rank => (
                      <SelectItem key={rank} value={rank}>
                        {rank}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* 游戏时间 */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start_time">开始时间 *</Label>
                  <DateTimePicker
                    date={formData.start_time}
                    setDate={(date) => setFormData({ ...formData, start_time: date })}
                    minDate={new Date()}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end_time">结束时间 *</Label>
                  <DateTimePicker
                    date={formData.end_time}
                    setDate={(date) => setFormData({ ...formData, end_time: date })}
                    minDate={formData.start_time}
                    disabled={!formData.start_time}
                  />
                </div>
              </div>

              {/* 队伍人数 */}
              <div className="space-y-2">
                <Label htmlFor="max_members">队伍人数 *</Label>
                <Input
                  id="max_members"
                  type="number"
                  min={2}
                  max={10}
                  value={formData.max_members}
                  onChange={(e) => setFormData({ ...formData, max_members: Number(e.target.value) })}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  最少 2 人，最多 10 人
                </p>
              </div>

              {/* 详细描述 */}
              <div className="space-y-2">
                <Label htmlFor="description">详细描述（可选）</Label>
                <Textarea
                  id="description"
                  placeholder="描述你的组队需求，例如：会报点、有意识、欢迎萌新等"
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
                    {CONTACT_METHODS.find(m => m.value === formData.contact_method)?.label} *
                  </Label>
                  <Input
                    id="contact_value"
                    placeholder={`请输入你的${CONTACT_METHODS.find(m => m.value === formData.contact_method)?.label}`}
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

              {/* 提交按钮 */}
              <div className="flex gap-4">
                <Button type="button" variant="outline" className="flex-1" asChild>
                  <Link href="/teams">取消</Link>
                </Button>
                <Button type="submit" className="flex-1" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      发布中...
                    </>
                  ) : (
                    <>
                      <Plus className="mr-2 h-4 w-4" />
                      发布组队
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}