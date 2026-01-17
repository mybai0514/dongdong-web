'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { GamepadIcon, Users, MessageSquare, User, LogOut } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { User as UserType } from '@/types'

export function Navbar() {
  const router = useRouter()
  const pathname = usePathname() // 监听路由变化
  const [user, setUser] = useState<UserType | null>(null)

  // 刷新用户信息的函数
  const refreshUser = () => {
    const userStr = localStorage.getItem('user')
    if (userStr) {
      try {
        setUser(JSON.parse(userStr))
      } catch (error) {
        console.error('解析用户信息失败:', error)
        localStorage.removeItem('user')
        setUser(null)
      }
    } else {
      setUser(null)
    }
  }

  useEffect(() => {
    // 初始加载时读取用户信息
    refreshUser()

    // 监听 storage 事件（当其他标签页修改 localStorage 时触发）
    window.addEventListener('storage', refreshUser)

    // 监听自定义事件（当前页面修改 localStorage 时触发）
    window.addEventListener('user-login', refreshUser)
    window.addEventListener('user-logout', refreshUser)

    return () => {
      window.removeEventListener('storage', refreshUser)
      window.removeEventListener('user-login', refreshUser)
      window.removeEventListener('user-logout', refreshUser)
    }
  }, [])

  // 路由变化时也刷新用户信息
  useEffect(() => {
    refreshUser()
  }, [pathname])

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setUser(null)
    
    // 触发自定义事件
    window.dispatchEvent(new Event('user-logout'))
    
    router.push('/')
  }

  return (
    <header className="sticky px-4 top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex h-16 items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center space-x-2">
          <GamepadIcon className="h-6 w-6 text-primary" />
          <span className="font-bold text-xl bg-linear-to-r from-primary to-purple-600 bg-clip-text text-transparent">
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
          {user ? (
            // 已登录：显示用户菜单
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="flex items-center space-x-2">
                  <User className="h-4 w-4" />
                  <span>{user.username}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link href="/profile" className="cursor-pointer">
                    <User className="mr-2 h-4 w-4" />
                    个人中心
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  登出
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            // 未登录：显示登录/注册按钮
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/login">登录</Link>
              </Button>
              <Button size="sm" asChild>
                <Link href="/register">注册</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  )
}