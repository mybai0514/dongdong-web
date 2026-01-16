'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { GamepadIcon, Loader2 } from 'lucide-react';

// 类型定义
interface LoginResponse {
  success?: boolean;
  message?: string;
  error?: string;
  token?: string;
  user?: {
    id: number;
    username: string;
    email: string;
    avatar?: string;
    wechat?: string;
    qq?: string;
    yy?: string;
  };
}

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    wechat: '',
    qq: '',
    yy: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // 验证密码
    if (formData.password !== formData.confirmPassword) {
      setError('两次输入的密码不一致');
      return;
    }

    if (formData.password.length < 6) {
      setError('密码长度至少为 6 位');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('http://localhost:8787/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: formData.username,
          email: formData.email,
          password: formData.password,
          wechat: formData.wechat,
          qq: formData.qq,
          yy: formData.yy,
        }),
      });

      const data: LoginResponse = await response.json();

      if (!response.ok) {
        setError(data.error || '注册失败');
        return;
      }

      if (data.token && data.user) {
        // 保存 token 和用户信息到 localStorage
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));

        // 触发自定义事件，通知导航栏更新
        window.dispatchEvent(new Event('user-login'));

        router.push('/');
      } else {
        setError('登录响应数据不完整');
      }

      // 跳转到首页
      router.push('/');
    } catch (err) {
      setError('网络错误，请稍后重试');
      console.error('注册错误:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex items-center justify-center min-h-[calc(100vh-4rem)] py-10">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center mb-4">
            <GamepadIcon className="h-10 w-10 text-primary" />
          </div>
          <CardTitle className="text-2xl text-center">注册账号</CardTitle>
          <CardDescription className="text-center">
            填写信息创建你的咚咚组队账号
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* 用户名 */}
            <div className="space-y-2">
              <Label htmlFor="username">用户名 *</Label>
              <Input
                id="username"
                name="username"
                placeholder="请输入用户名"
                value={formData.username}
                onChange={handleChange}
                required
                disabled={loading}
              />
            </div>

            {/* 邮箱 */}
            <div className="space-y-2">
              <Label htmlFor="email">邮箱 *</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="your@email.com"
                value={formData.email}
                onChange={handleChange}
                required
                disabled={loading}
              />
            </div>

            {/* 密码 */}
            <div className="space-y-2">
              <Label htmlFor="password">密码 *</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="至少 6 位密码"
                value={formData.password}
                onChange={handleChange}
                required
                disabled={loading}
              />
            </div>

            {/* 确认密码 */}
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">确认密码 *</Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                placeholder="再次输入密码"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                disabled={loading}
              />
            </div>

            {/* 联系方式（可选） */}
            <div className="pt-2 border-t">
              <p className="text-sm text-muted-foreground mb-3">
                联系方式（至少填写一项）
              </p>

              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="wechat">微信号</Label>
                  <Input
                    id="wechat"
                    name="wechat"
                    placeholder="你的微信号"
                    value={formData.wechat}
                    onChange={handleChange}
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="qq">QQ 号</Label>
                  <Input
                    id="qq"
                    name="qq"
                    placeholder="你的 QQ 号"
                    value={formData.qq}
                    onChange={handleChange}
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="yy">YY 号</Label>
                  <Input
                    id="yy"
                    name="yy"
                    placeholder="你的 YY 号"
                    value={formData.yy}
                    onChange={handleChange}
                    disabled={loading}
                  />
                </div>
              </div>
            </div>

            {/* 错误提示 */}
            {error && (
              <div className="text-sm text-destructive bg-destructive/10 p-3 rounded">
                {error}
              </div>
            )}

            {/* 提交按钮 */}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  注册中...
                </>
              ) : (
                '注册'
              )}
            </Button>

            {/* 登录链接 */}
            <div className="text-center text-sm">
              已有账号？{' '}
              <Link href="/login" className="text-primary hover:underline">
                立即登录
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
