import Link from 'next/link'
import { Heart } from 'lucide-react'

export function Footer() {
  return (
    <footer className="border-t bg-muted/40">
      <div className="container py-8 md:py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* 关于 */}
          <div>
            <h3 className="font-semibold text-lg mb-3">关于咚咚组队</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              一个为游戏玩家打造的组队平台，让你轻松找到志同道合的队友。
            </p>
          </div>

          {/* 快速链接 */}
          <div>
            <h3 className="font-semibold text-lg mb-3">快速链接</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/teams" className="text-muted-foreground hover:text-primary transition-colors">
                  找队友
                </Link>
              </li>
              <li>
                <Link href="/feedback" className="text-muted-foreground hover:text-primary transition-colors">
                  月度反馈
                </Link>
              </li>
              <li>
                <Link href="/about" className="text-muted-foreground hover:text-primary transition-colors">
                  关于我们
                </Link>
              </li>
            </ul>
          </div>

          {/* 联系方式 */}
          <div>
            <h3 className="font-semibold text-lg mb-3">联系我们</h3>
            <p className="text-sm text-muted-foreground">
              有问题或建议？<br />
              <Link href="mailto:contact@dongdong.com" className="hover:text-primary transition-colors">
                contact@dongdong.com
              </Link>
            </p>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t text-center text-sm text-muted-foreground">
          <p className="flex items-center justify-center gap-1">
            Made with <Heart className="h-4 w-4 text-red-500 fill-red-500" /> by 咚咚团队
          </p>
        </div>
      </div>
    </footer>
  )
}