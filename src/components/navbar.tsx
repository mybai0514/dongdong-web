import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { GamepadIcon, Users, MessageSquare, User } from 'lucide-react'

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center space-x-2">
          <GamepadIcon className="h-6 w-6 text-primary" />
          <span className="font-bold text-xl bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
            咚咚组队
          </span>
        </Link>

        {/* 导航菜单 */}
        <nav className="hidden md:flex items-center space-x-6 text-sm font-medium">
          <Link 
            href="/teams" 
            className="flex items-center space-x-1 transition-colors hover:text-primary"
          >
            <Users className="h-4 w-4" />
            <span>找队友</span>
          </Link>
          <Link 
            href="/feedback" 
            className="flex items-center space-x-1 transition-colors hover:text-primary"
          >
            <MessageSquare className="h-4 w-4" />
            <span>月度反馈</span>
          </Link>
        </nav>

        {/* 右侧按钮 */}
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/login">登录</Link>
          </Button>
          <Button size="sm" asChild>
            <Link href="/register">注册</Link>
          </Button>
        </div>
      </div>
    </header>
  )
}