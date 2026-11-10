import { User, Keyboard, EyeOff } from "lucide-react"
import loginLogo from "@/assets/plasma-logo-login.svg"
import { Button, Input } from "@/components/ui"
import brandLogo from "@/assets/brobridge-logo.png"
import type { DemoState } from "@/demo/store"

// 登入頁（Brobridge 識別）：左 35% 品牌紅版面，右側登入表單
export function LoginPage({ s }: { s: DemoState }) {
  return (
    <div className="flex h-full">
      {/* 左：品牌紅色版面（企業識別手冊：整片紅、白字、粗墨線） */}
      <div className="hidden lg:flex lg:w-[35%] flex-col justify-between p-10 bg-red text-paper relative overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-[6px] bg-ink" aria-hidden="true" />
        <div className="z-10 flex flex-col gap-3">
          <img src={brandLogo} alt="Brobridge" className="h-7 w-auto self-start brightness-0 invert" />
          <div className="flex items-center gap-2 border-t-2 border-paper pt-3">
            <img src={loginLogo} alt="Plasma" className="h-6 brightness-0 invert" />
          </div>
        </div>

        <div className="z-10">
          <div className="mb-5 h-1 w-16 bg-paper" aria-hidden="true" />
          <h1 className="text-[2.5rem] font-black tracking-[-0.02em] leading-[1.08]" style={{ fontStretch: "85%" }}>
            <span className="block">Every Team.</span>
            <span className="block">Every Data Source.</span>
            <span className="block">One Integrated Platform.</span>
          </h1>
          <p className="mt-5 text-paper text-base leading-relaxed max-w-[30em]">
            Explore, transform, and automate data workflows across all your systems — so insights reach the people who need them.
          </p>
        </div>

        <div className="flex items-center gap-2 z-10 border-t-2 border-paper pt-3 t-label text-paper">
          <span className="inline-block w-2 h-2 bg-paper shrink-0" />
          <span>All systems operational · v0.0.36</span>
        </div>
      </div>

      {/* 右：登入表單 */}
      <div className="flex flex-1 items-center justify-center p-8 lg:p-16 bg-paper">
        <div className="w-full max-w-sm flex flex-col gap-8">
          <div className="flex flex-col gap-2 border-t-4 border-ink pt-4">
            <h2 className="text-3xl font-black tracking-[-0.01em]">Sign in</h2>
            <p className="text-sm text-ink-soft">Welcome back. Enter your credentials to continue.</p>
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-3 mt-6">
              <label className="t-label">Email or Username</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-ink pointer-events-none" strokeWidth={1.5} />
                <Input data-t="login-user" className="pl-10 h-11 bg-paper border-2" value={s.loginUser} readOnly />
              </div>
            </div>

            <div className="flex flex-col gap-3 mt-2">
              <label className="t-label">Password</label>
              <div className="relative">
                <Keyboard className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-ink pointer-events-none" strokeWidth={1.5} />
                <Input data-t="login-pass" type="password" className="pl-10 pr-10 h-11 bg-paper border-2" value={s.loginPass} readOnly />
                <EyeOff className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-soft" />
              </div>
            </div>

            <Button data-t="login-submit" variant="brand" className="w-full mt-4 h-12 text-[15px]">
              {s.loggingIn ? "Logging in..." : "Sign in"}
            </Button>
          </div>

          <p className="text-center text-sm text-ink-soft">
            Need access? <span className="text-red font-bold underline decoration-2 underline-offset-4">Contact your administrator</span>
          </p>
        </div>
      </div>
    </div>
  )
}
