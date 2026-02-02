'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Clock,
  Users,
  MessageCircle,
  Gamepad2,
  Crown,
  UserPlus,
  Loader2,
  Search,
  Filter,
  Star
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
import {
  getUserTeams,
  getUserJoinedTeams,
  getTeamMembers,
  submitTeamRatings,
  getMyTeamRatings,
  getUserReputation,
  ApiError,
  type TeamMemberRating,
  type RatingTag,
  type RatingDetail,
  type UserReputation
} from '@/lib/api'
import { useAuth } from '@/hooks'
import type { Team, TeamMember } from '@/types'
import { GAMES_WITH_ALL } from '@/lib/constants'
import { formatTimeForDisplay } from '@/lib/time'

export default function HistoryPage() {
  const { user, loading } = useAuth({
    redirectTo: '/login',
  })

  // 列表数据状态
  const [myTeams, setMyTeams] = useState<Team[]>([])
  const [joinedTeams, setJoinedTeams] = useState<Team[]>([])
  const [loadingMyTeams, setLoadingMyTeams] = useState(false)
  const [loadingJoinedTeams, setLoadingJoinedTeams] = useState(false)

  // 查询参数状态
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedGame, setSelectedGame] = useState('全部')
  const [activeTab, setActiveTab] = useState<'created' | 'joined'>('created')

  // 本地搜索输入框状态（用于防止每次输入都调用接口）
  const [localSearchInput, setLocalSearchInput] = useState(searchQuery)

  // 队伍详情弹窗状态
  const [membersDialog, setMembersDialog] = useState<{
    open: boolean
    teamId?: number
    teamTitle?: string
    teamDescription?: string
    members?: TeamMember[]
    memberReputations?: Map<number, UserReputation>
    loading?: boolean
  }>({ open: false })

  // 评分弹窗状态
  const [ratingDialog, setRatingDialog] = useState<{
    open: boolean
    teamId?: number
    teamTitle?: string
    members?: TeamMember[]
    loading?: boolean
  }>({ open: false })

  // 查看评分历史弹窗状态
  const [viewRatingDialog, setViewRatingDialog] = useState<{
    open: boolean
    teamId?: number
    teamTitle?: string
    ratings?: RatingDetail[]
    loading?: boolean
  }>({ open: false })

  // 评分数据
  const [ratings, setRatings] = useState<Record<number, { rating: number; tags: RatingTag[] }>>({})
  const [submittingRating, setSubmittingRating] = useState(false)
  const [ratedTeams, setRatedTeams] = useState<Set<number>>(new Set())

  // 同步 searchQuery 到本地输入框状态
  useEffect(() => {
    setLocalSearchInput(searchQuery)
  }, [searchQuery])

  useEffect(() => {
    if (user) {
      fetchMyTeams(user.id)
      fetchJoinedTeamsList(user.id)
    }
  }, [user])

  const fetchMyTeams = async (userId: number) => {
    setLoadingMyTeams(true)
    try {
      const data = await getUserTeams(userId)
      setMyTeams(data)
      // 从队伍数据中提取已评分的队伍 ID
      const ratedTeamIds = new Set<number>()
      data.forEach(team => {
        if (team.hasRated) {
          ratedTeamIds.add(team.id)
        }
      })
      setRatedTeams(prev => new Set([...prev, ...ratedTeamIds]))
    } catch (error) {
      console.error('获取我的队伍失败:', error)
    } finally {
      setLoadingMyTeams(false)
    }
  }

  const fetchJoinedTeamsList = async (userId: number) => {
    setLoadingJoinedTeams(true)
    try {
      const data = await getUserJoinedTeams(userId)
      setJoinedTeams(data)
      // 从队伍数据中提取已评分的队伍 ID
      const ratedTeamIds = new Set<number>()
      data.forEach(team => {
        if (team.hasRated) {
          ratedTeamIds.add(team.id)
        }
      })
      setRatedTeams(prev => new Set([...prev, ...ratedTeamIds]))
    } catch (error) {
      console.error('获取加入的队伍失败:', error)
    } finally {
      setLoadingJoinedTeams(false)
    }
  }


  const showMembers = async (teamId: number, teamTitle: string, teamDescription?: string) => {
    setMembersDialog({
      open: true,
      teamId,
      teamTitle,
      teamDescription,
      loading: true
    })

    try {
      const members = await getTeamMembers(teamId)

      // 批量获取成员信誉
      const reputationMap = new Map<number, UserReputation>()
      await Promise.all(
        members.map(async (member) => {
          try {
            const rep = await getUserReputation(member.user_id)
            reputationMap.set(member.user_id, rep)
          } catch (error) {
            console.error(`获取用户 ${member.user_id} 信誉失败:`, error)
          }
        })
      )

      setMembersDialog({
        open: true,
        teamId,
        teamTitle,
        teamDescription,
        members,
        memberReputations: reputationMap,
        loading: false
      })
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error(err.message || '获取队伍信息失败')
      } else {
        toast.error('网络错误，请稍后重试')
      }
      console.error('获取队伍信息错误:', err)
      setMembersDialog({ open: false })
    }
  }

  const openRatingDialog = async (teamId: number, teamTitle: string) => {
    setRatingDialog({
      open: true,
      teamId,
      teamTitle,
      loading: true
    })

    try {
      const members = await getTeamMembers(teamId)
      // 过滤掉当前用户（使用 user_id 而不是 id）
      const otherMembers = members.filter(m => m.user_id !== user?.id)
      setRatingDialog({
        open: true,
        teamId,
        teamTitle,
        members: otherMembers,
        loading: false
      })
      // 初始化评分数据（使用 user_id 作为 key）
      const initialRatings: Record<number, { rating: number; tags: RatingTag[] }> = {}
      otherMembers.forEach(member => {
        initialRatings[member.user_id] = { rating: 0, tags: [] }
      })
      setRatings(initialRatings)
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error(err.message || '获取队伍信息失败')
      } else {
        toast.error('网络错误，请稍后重试')
      }
      console.error('获取队伍信息错误:', err)
      setRatingDialog({ open: false })
    }
  }

  const openViewRatingDialog = async (teamId: number, teamTitle: string) => {
    setViewRatingDialog({
      open: true,
      teamId,
      teamTitle,
      loading: true
    })

    try {
      const ratingsData = await getMyTeamRatings(teamId)
      setViewRatingDialog({
        open: true,
        teamId,
        teamTitle,
        ratings: ratingsData,
        loading: false
      })
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error(err.message || '获取评分详情失败')
      } else {
        toast.error('网络错误，请稍后重试')
      }
      console.error('获取评分详情错误:', err)
      setViewRatingDialog({ open: false })
    }
  }

  const isTeamCompleted = (endTime: string) => {
    const now = new Date()
    const end = new Date(endTime)
    return end < now
  }

  const getContactIcon = (method: string) => {
    switch (method) {
      case 'wechat': return '微信'
      case 'qq': return 'QQ'
      case 'yy': return 'YY'
      default: return '联系方式'
    }
  }

  // 筛选已完成的队伍
  const completedMyTeams = myTeams.filter(team => isTeamCompleted(team.end_time))
  const completedJoinedTeams = joinedTeams.filter(team => isTeamCompleted(team.end_time))

  // 应用搜索和游戏筛选
  const filteredMyTeams = completedMyTeams.filter(team => {
    const matchSearch = team.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                       team.description?.toLowerCase().includes(searchQuery.toLowerCase())
    if (!matchSearch) return false
    if (selectedGame !== '全部' && team.game !== selectedGame) return false
    return true
  })

  const filteredJoinedTeams = completedJoinedTeams.filter(team => {
    const matchSearch = team.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                       team.description?.toLowerCase().includes(searchQuery.toLowerCase())
    if (!matchSearch) return false
    if (selectedGame !== '全部' && team.game !== selectedGame) return false
    return true
  })

  const currentTeams = activeTab === 'created' ? filteredMyTeams : filteredJoinedTeams
  const currentLoading = activeTab === 'created' ? loadingMyTeams : loadingJoinedTeams

  // 计算应显示的队伍数（用于 Tab 计数）
  const displayedMyTeamsCount = filteredMyTeams.length
  const displayedJoinedTeamsCount = filteredJoinedTeams.length

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
        <h1 className="text-3xl font-bold mb-2">历史组队</h1>
        <p className="text-muted-foreground">
          查看你的历史组队记录
        </p>
      </div>

      {/* Tab 切换 */}
      <div className="flex gap-2 mb-6">
        <Button
          variant={activeTab === 'created' ? 'default' : 'outline'}
          onClick={() => setActiveTab('created')}
        >
          <Crown className="mr-2 h-4 w-4" />
          我发起的 ({completedMyTeams.length})
        </Button>
        <Button
          variant={activeTab === 'joined' ? 'default' : 'outline'}
          onClick={() => setActiveTab('joined')}
        >
          <UserPlus className="mr-2 h-4 w-4" />
          我加入的 ({completedJoinedTeams.length})
        </Button>
      </div>

      {/* 筛选栏 */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="搜索组队标题或描述..."
            value={localSearchInput}
            onChange={(e) => setLocalSearchInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                setSearchQuery(localSearchInput)
              }
            }}
            onBlur={() => {
              if (localSearchInput !== searchQuery) {
                setSearchQuery(localSearchInput)
              }
            }}
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

      {/* 队伍列表 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            {activeTab === 'created' ? '我发起的历史组队' : '我加入的历史组队'}
          </CardTitle>
          <CardDescription>
            已完成的组队记录
          </CardDescription>
        </CardHeader>
        <CardContent>
          {currentLoading ? (
            <div className="text-center py-8">
              <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
            </div>
          ) : currentTeams.length === 0 ? (
            <div className="text-center py-8">
              <Gamepad2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {searchQuery || selectedGame !== '全部' 
                  ? '没有找到符合条件的历史记录' 
                  : '暂无历史组队记录'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {currentTeams.map(team => (
                <div
                  key={team.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="shrink-0 text-xs font-mono">ID: {team.id}</Badge>
                      <Badge variant="outline">{team.game}</Badge>
                      <Badge variant="secondary">已完成</Badge>
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
                    {activeTab === 'joined' && team.contact_method && team.contact_value && (
                      <div className="flex items-center gap-1 mt-1 text-sm text-muted-foreground">
                        <MessageCircle className="h-3 w-3" />
                        <span>{getContactIcon(team.contact_method)}: {team.contact_value}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    {ratedTeams.has(team.id) ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openViewRatingDialog(team.id, team.title)}
                      >
                        <Star className="mr-1 h-3 w-3 fill-yellow-400 text-yellow-400" />
                        查看评分
                      </Button>
                    ) : (
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => openRatingDialog(team.id, team.title)}
                      >
                        <Star className="mr-1 h-3 w-3" />
                        评分
                      </Button>
                    )}
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
                {membersDialog.teamDescription && (
                  <div className="mb-4 p-3 bg-muted/50 rounded-lg">
                    <h4 className="text-sm font-semibold mb-1">队伍描述</h4>
                    <p className="text-sm text-muted-foreground">{membersDialog.teamDescription}</p>
                  </div>
                )}
                <div className="mb-2">
                  <h4 className="text-sm font-semibold mb-2">队友列表</h4>
                  {membersDialog.members && membersDialog.members.length > 0 ? (
                    <div className="space-y-2">
                      {membersDialog.members.map((member) => {
                        const memberRep = membersDialog.memberReputations?.get(member.user_id)
                        return (
                          <div
                            key={member.id}
                            className="flex items-center justify-between p-3 border rounded-lg"
                          >
                            <div className="flex items-center gap-3 flex-1">
                              <Link href={`/profile/${member.user_id}`}>
                                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center cursor-pointer hover:bg-primary/20 transition-colors">
                                  <span className="font-semibold text-primary">
                                    {member.username.charAt(0).toUpperCase()}
                                  </span>
                                </div>
                              </Link>
                              <div className="flex-1">
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
                                    加入于 {formatTimeForDisplay(member.joined_at)}
                                  </p>
                                )}
                                {/* 显示信誉 */}
                                {memberRep && memberRep.totalReviews > 0 && (
                                  <div className="flex items-center gap-2 mt-1">
                                    <div className="flex items-center gap-1">
                                      <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                                      <span className="text-xs font-medium">{memberRep.averageRating}</span>
                                    </div>
                                    {Object.keys(memberRep.tagStats).length > 0 && (
                                      <div className="flex gap-1">
                                        {Object.entries(memberRep.tagStats)
                                          .sort(([, a], [, b]) => b - a)
                                          .slice(0, 3)
                                          .map(([tag]) => (
                                            <Badge key={tag} variant="outline" className="text-xs px-1 py-0">
                                              {tag}
                                            </Badge>
                                          ))}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        )
                      })}
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

      {/* 评分弹窗 */}
      <Dialog open={ratingDialog.open} onOpenChange={(open) => setRatingDialog({ open })}>
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Star className="h-5 w-5" />
              队伍评分
            </DialogTitle>
            <DialogDescription>
              {ratingDialog.teamTitle}
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto py-4">
            {ratingDialog.loading ? (
              <div className="text-center py-8">
                <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                <p className="mt-2 text-sm text-muted-foreground">加载中...</p>
              </div>
            ) : ratingDialog.members && ratingDialog.members.length > 0 ? (
              <div className="space-y-6">
                {ratingDialog.members.map((member) => (
                  <div key={member.user_id} className="p-4 border rounded-lg space-y-3">
                    <div className="flex items-center gap-3">
                      <Link href={`/profile/${member.user_id}`}>
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center cursor-pointer hover:bg-primary/20 transition-colors">
                          <span className="font-semibold text-primary">
                            {member.username.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      </Link>
                      <p className="font-medium">{member.username}</p>
                    </div>

                    {/* 星级评分 */}
                    <div>
                      <p className="text-sm font-medium mb-2">评分</p>
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => {
                              setRatings(prev => ({
                                ...prev,
                                [member.user_id]: {
                                  ...prev[member.user_id],
                                  rating: star
                                }
                              }))
                            }}
                            className="transition-colors"
                          >
                            <Star
                              className={`h-6 w-6 ${
                                ratings[member.user_id]?.rating >= star
                                  ? 'fill-yellow-400 text-yellow-400'
                                  : 'text-gray-300'
                              }`}
                            />
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* 标签选择 */}
                    <div>
                      <p className="text-sm font-medium mb-2">标签</p>
                      <div className="flex flex-wrap gap-2">
                        {(['素质队友', '操作怪', '意识好', '嘴硬', '迟到', '口臭佬'] as RatingTag[]).map((tag) => (
                          <Badge
                            key={tag}
                            variant={ratings[member.user_id]?.tags.includes(tag) ? 'default' : 'outline'}
                            className="cursor-pointer"
                            onClick={() => {
                              setRatings(prev => {
                                const currentTags = prev[member.user_id]?.tags || []
                                const newTags = currentTags.includes(tag)
                                  ? currentTags.filter(t => t !== tag)
                                  : [...currentTags, tag]
                                return {
                                  ...prev,
                                  [member.user_id]: {
                                    ...prev[member.user_id],
                                    tags: newTags
                                  }
                                }
                              })
                            }}
                          >
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Users className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                <p className="text-muted-foreground">没有可评分的队友</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRatingDialog({ open: false })}
              disabled={submittingRating}
            >
              取消
            </Button>
            <Button
              onClick={async () => {
                if (!ratingDialog.teamId) return

                // 验证所有队友都已评分
                const allRated = ratingDialog.members?.every(
                  member => ratings[member.user_id]?.rating > 0
                )

                if (!allRated) {
                  toast.warning('请为所有队友评分')
                  return
                }

                setSubmittingRating(true)
                try {
                  const ratingsData: TeamMemberRating[] = ratingDialog.members!.map(member => ({
                    userId: member.user_id,
                    rating: ratings[member.user_id].rating,
                    tags: ratings[member.user_id].tags
                  }))

                  await submitTeamRatings(ratingDialog.teamId, ratingsData)
                  setRatedTeams(prev => new Set([...prev, ratingDialog.teamId!]))
                  toast.success('评分提交成功！感谢你的反馈')
                  setRatingDialog({ open: false })
                  setRatings({})
                } catch (err) {
                  if (err instanceof ApiError) {
                    toast.error(err.message || '提交评分失败')
                  } else {
                    toast.error('网络错误，请稍后重试')
                  }
                  console.error('提交评分错误:', err)
                } finally {
                  setSubmittingRating(false)
                }
              }}
              disabled={submittingRating}
            >
              {submittingRating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  提交中...
                </>
              ) : (
                '提交评分'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 查看评分历史弹窗 */}
      <Dialog open={viewRatingDialog.open} onOpenChange={(open) => setViewRatingDialog({ open })}>
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
              评分历史
            </DialogTitle>
            <DialogDescription>
              {viewRatingDialog.teamTitle}
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto py-4">
            {viewRatingDialog.loading ? (
              <div className="text-center py-8">
                <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                <p className="mt-2 text-sm text-muted-foreground">加载中...</p>
              </div>
            ) : viewRatingDialog.ratings && viewRatingDialog.ratings.length > 0 ? (
              <div className="space-y-6">
                {viewRatingDialog.ratings.map((rating) => (
                  <div key={rating.id} className="p-4 border rounded-lg space-y-3">
                    <div className="flex items-center gap-3">
                      <Link href={`/profile/${rating.reviewee_id}`}>
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center cursor-pointer hover:bg-primary/20 transition-colors">
                          <span className="font-semibold text-primary">
                            {rating.username.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      </Link>
                      <p className="font-medium">{rating.username}</p>
                    </div>

                    {/* 星级评分（只读） */}
                    <div>
                      <p className="text-sm font-medium mb-2">评分</p>
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`h-6 w-6 ${
                              rating.rating >= star
                                ? 'fill-yellow-400 text-yellow-400'
                                : 'text-gray-300'
                            }`}
                          />
                        ))}
                      </div>
                    </div>

                    {/* 标签（只读） */}
                    {rating.tags && rating.tags.length > 0 && (
                      <div>
                        <p className="text-sm font-medium mb-2">标签</p>
                        <div className="flex flex-wrap gap-2">
                          {rating.tags.map((tag) => (
                            <Badge key={tag} variant="default">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 评分时间 */}
                    <div className="text-xs text-muted-foreground">
                      评分时间: {formatTimeForDisplay(rating.created_at)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Star className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                <p className="text-muted-foreground">暂无评分记录</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => setViewRatingDialog({ open: false })}>
              关闭
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
