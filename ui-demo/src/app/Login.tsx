import { User, Keyboard, EyeOff } from "lucide-react"
import loginLogo from "@/assets/plasma-logo-login.svg"
import { Button, Input } from "@/components/ui"
import Aurora from "./login/Aurora"
import type { DemoState } from "@/demo/store"

// 對齊 Plasma 真實登入頁：左 35% 黑底 + Aurora 動態漸層，右側登入表單
export function LoginPage({ s }: { s: DemoState }) {
  return (
    <div className="flex min-h-screen h-full">
      {/* 左：黑底 + Aurora 背景 */}
      <div className="hidden lg:flex lg:w-[35%] flex-col justify-between p-10 bg-black relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
          <Aurora colorStops={["#3A29FF", "#9B6DFF", "#FF94B4"]} amplitude={1.2} blend={2.0} speed={0.4} />
        </div>

        <div className="z-10">
          <img src={loginLogo} alt="Plasma" className="h-9" />
        </div>

        <div className="z-10 text-white">
          <h1 className="text-4xl font-bold tracking-tight leading-snug">
            <span className="block">Every Team.</span>
            <span className="block">Every Data Source.</span>
            <span className="block">One Integrated Platform.</span>
          </h1>
          <p className="mt-4 text-white/60 text-base leading-relaxed">
            Explore, transform, and automate data workflows across all your systems — so insights reach the people who need them.
          </p>
        </div>

        <div className="flex items-center gap-2 text-sm text-white/50 z-10">
          <span className="inline-block w-2 h-2 rounded-full bg-green-400 shrink-0" />
          <span>All systems operational · v0.0.36</span>
        </div>
      </div>

      {/* 右：登入表單 */}
      <div className="flex flex-1 items-center justify-center p-8 lg:p-16 bg-muted/40">
        <div className="w-full max-w-sm flex flex-col gap-8">
          <div className="flex flex-col gap-1">
            <h2 className="text-2xl font-bold tracking-tight">Sign in</h2>
            <p className="text-sm text-muted-foreground">Welcome back. Enter your credentials to continue.</p>
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-3 mt-6">
              <label className="text-sm font-medium">Email or Username</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" strokeWidth={1.5} />
                <Input data-t="login-user" className="pl-10 h-10 bg-background" value={s.loginUser} readOnly />
              </div>
            </div>

            <div className="flex flex-col gap-3 mt-2">
              <label className="text-sm font-medium">Password</label>
              <div className="relative">
                <Keyboard className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" strokeWidth={1.5} />
                <Input data-t="login-pass" type="password" className="pl-10 pr-10 h-10 bg-background" value={s.loginPass} readOnly />
                <EyeOff className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" />
              </div>
            </div>

            <Button data-t="login-submit" variant="brand" className="w-full mt-4 h-10">
              {s.loggingIn ? "Logging in..." : "Sign in"}
            </Button>
          </div>

          <p className="text-center text-sm text-muted-foreground">
            Need access? <span className="text-foreground font-medium">Contact your administrator</span>
          </p>
        </div>
      </div>
    </div>
  )
}
