import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ArrowRight, Users, MessageSquare, Trophy, Zap } from 'lucide-react'

export default function Home() {
  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="py-20 md:py-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-6 max-w-3xl mx-auto">
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
              找到你的
              <span className="bg-linear-to-r from-primary to-purple-600 bg-clip-text text-transparent">
                {" "}游戏队友
              </span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              咚咚组队帮助玩家快速组建队伍，无论是王者荣耀、和平精英还是其他游戏，都能找到志同道合的伙伴
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Button size="lg" asChild>
                <Link href="/teams">
                  开始组队 <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/register">免费注册</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-muted/40">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-12">核心功能</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col items-center text-center space-y-4">
                  <div className="p-3 bg-primary/10 rounded-full">
                    <Users className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold">快速组队</h3>
                  <p className="text-muted-foreground">
                    发布组队需求，快速找到合适的队友，告别单排烦恼
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col items-center text-center space-y-4">
                  <div className="p-3 bg-primary/10 rounded-full">
                    <MessageSquare className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold">月度反馈</h3>
                  <p className="text-muted-foreground">
                    每月记录你的游戏历程，分享心得，见证自己的成长
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col items-center text-center space-y-4">
                  <div className="p-3 bg-primary/10 rounded-full">
                    <Trophy className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold">段位提升</h3>
                  <p className="text-muted-foreground">
                    和优秀的队友一起战斗，提升技术，冲击更高段位
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Card className="bg-linear-to-r from-primary/10 to-purple-600/10 border-none">
            <CardContent className="pt-12 pb-12">
              <div className="text-center space-y-6 max-w-2xl mx-auto">
                <h2 className="text-3xl font-bold">准备好开始了吗？</h2>
                <p className="text-muted-foreground text-lg">
                  加入数千名玩家，找到你的游戏伙伴，一起征战排位赛场
                </p>
                <Button size="lg" asChild>
                  <Link href="/register">
                    立即注册 <Zap className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  )
}