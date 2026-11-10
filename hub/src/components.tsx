import type { ReactNode } from "react"
import logo from "./assets/logo.png"

/** 頁首:上緣紅線、logo、麵包屑、右側一顆按鈕(沿用官網的 71px 頁首) */
export function SiteHeader({ logoHref, logoLabel, crumb, action }: {
  logoHref: string
  logoLabel: string
  crumb: ReactNode
  action: ReactNode
}) {
  return (
    <header className="site-header">
      <div className="container">
        <a className="logo" href={logoHref} aria-label={logoLabel} target="_top">
          <img src={logo} alt="Brobridge" width={145} height={28} />
        </a>
        <span className="crumb">{crumb}</span>
        <span className="spacer" />
        {action}
      </div>
    </header>
  )
}

export function ArrowRight({ size = 18, stroke = 2.25 }: { size?: number; stroke?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} aria-hidden="true">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  )
}

export const CONTACT = "mailto:contact@brobridge.com"
export const DOCS = "https://plasma-docs.brobridge.workers.dev/zh-Hant/"
