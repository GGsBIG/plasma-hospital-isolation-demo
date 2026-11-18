import type { ReactNode } from "react"
import {
  Activity, ChevronDown, ChevronRight, ChevronsUpDown, Download, Globe, Lock, PanelLeft, Pause, RefreshCw,
  Search, Server, ShieldCheck, ShieldX, SlidersHorizontal, Trash2, Wifi, X,
} from "lucide-react"
import type { DemoState, Page } from "@/demo/store"
import { PAY_POD, PAY_POD_2, SUS_HOST, VULNS, WORKLOADS } from "@/demo/data"
import { cn } from "@/lib/utils"
import logo from "@/assets/sentinel-logo.svg"

/* ───────── 外框:側邊欄與頁首(照真正的 K8s Sentinel 前端) ───────── */

const TOP: { label: string; page: Page }[] = [
  { label: "Dashboard", page: "dashboard" },
  { label: "Network Topology", page: "topology" },
]
const GROUPS: { label: string; items: { label: string; pages: Page[] }[] }[] = [
  { label: "Vulnerabilities", items: [{ label: "Workloads", pages: ["vulns"] }, { label: "Registries", pages: [] }] },
  {
    label: "Policies", items: [
      { label: "Tracing Policy", pages: ["policies", "policy-new"] }, { label: "Behavior Discovery", pages: ["discovery"] },
      { label: "Templates", pages: [] }, { label: "Admission Policy", pages: ["vap-new"] }, { label: "Network Policy", pages: ["netpol-new"] },
      { label: "Quarantine", pages: ["quarantine"] },
    ],
  },
  { label: "Notifications", items: [{ label: "Security Events", pages: ["events"] }, { label: "Admission Events", pages: [] }, { label: "Audit Log", pages: ["audit"] }] },
  { label: "Cluster", items: [{ label: "Event Sources", pages: [] }] },
  { label: "Settings", items: [{ label: "Users", pages: [] }, { label: "Alerts", pages: [] }, { label: "Syslog", pages: [] }, { label: "Event Retention", pages: [] }] },
]

export const CRUMBS: Record<Page, string[]> = {
  dashboard: ["Dashboard"], discovery: ["Policies", "Behavior Discovery"], "policy-new": ["Policies", "Tracing Policy", "New Policy"],
  policies: ["Policies", "Tracing Policy"], events: ["Notifications", "Security Events"], quarantine: ["Policies", "Quarantine"],
  topology: ["Network Topology"], "netpol-new": ["Policies", "Network Policy", "New Policy"], vulns: ["Vulnerabilities", "Workloads"],
  "vap-new": ["Policies", "Admission Policy", "New Policy"], audit: ["Notifications", "Audit Log"],
}

export function Sidebar({ page }: { page: Page }) {
  const item = (label: string, on: boolean, sub = false) => (
    <div key={label} className={cn("flex items-center rounded-md px-2", sub ? "ml-3 h-8 text-[13px]" : "h-9 text-[14px] font-medium", on ? "bg-white/10 text-white" : "text-white/80")}>{label}</div>
  )
  return (
    <aside className="flex w-[232px] shrink-0 flex-col bg-[#1b2a3b] px-2 text-white">
      <div className="flex items-center gap-2.5 px-2 py-3">
        <img src={logo} alt="" className="size-8 shrink-0 rounded-md bg-white p-0.5" />
        <span className="text-base font-bold text-white/90">K8s Sentinel</span>
      </div>
      <div className="mt-1 space-y-0.5">{TOP.map((t) => item(t.label, t.page === page))}</div>
      <div className="mt-2 space-y-0.5">
        {GROUPS.map((g) => {
          const open = g.items.some((i) => i.pages.includes(page))
          return (
            <div key={g.label}>
              <div className="flex h-9 items-center justify-between px-2 text-[14px] font-medium text-white/80">
                {g.label}<ChevronRight className={cn("size-4 opacity-70 transition-transform", open && "rotate-90")} />
              </div>
              {open && <div className="space-y-0.5 pb-1">{g.items.map((i) => item(i.label, i.pages.includes(page), true))}</div>}
            </div>
          )
        })}
      </div>
      <span className="mt-auto px-2 pb-3 text-[11px] text-white/40">v0.81.0</span>
    </aside>
  )
}

export function Header({ crumbs, mode }: { crumbs: string[]; mode: DemoState["mode"] }) {
  const all = ["Home", ...crumbs]
  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b bg-background px-4">
      <PanelLeft className="-ml-1 size-4 text-foreground/80" />
      <nav className="ml-2 flex items-center gap-1.5 text-[14px]">
        {all.map((c, i) => (
          <span key={i} className="flex items-center gap-1.5">
            {i > 0 && <ChevronRight className="size-3.5 text-muted-foreground" />}
            <span className={i === 0 ? "text-muted-foreground" : "text-foreground"}>{c}</span>
          </span>
        ))}
      </nav>
      <div className="ml-auto flex items-center gap-2">
        <span data-t="mode-badge" className={cn("rounded-full border px-2 py-0.5 text-[11px] font-semibold",
          mode === "PROTECT" ? "border-transparent bg-red-600 text-white" : mode === "MIXED" ? "border-transparent bg-secondary" : "")}>{mode}</span>
        <span className="text-xs text-muted-foreground">admin</span>
        <span className="px-2 text-xs font-medium">Sign out</span>
      </div>
    </header>
  )
}

/* ───────── 小元件 ───────── */

const Btn = ({ children, t, primary, className }: { children: ReactNode; t?: string; primary?: boolean; className?: string }) => (
  <span data-t={t} className={cn("inline-flex h-8 items-center gap-1.5 rounded-lg border px-3 text-[13px] font-medium [&_svg]:size-3.5",
    primary ? "border-transparent bg-[#171717] text-white" : "bg-background", className)}>{children}</span>
)
const Box = ({ children, className, t }: { children: ReactNode; className?: string; t?: string }) => (
  <div data-t={t} className={cn("rounded-2xl border bg-background", className)}>{children}</div>
)
const Field = ({ v, ph, className, select, t, mono }: { v?: string; ph?: string; className?: string; select?: boolean; t?: string; mono?: boolean }) => (
  <div data-t={t} className={cn("flex h-9 items-center justify-between rounded-full border bg-background px-3 text-[14px]", mono && "font-mono text-[13px]", className)}>
    <span className={v ? "" : "text-muted-foreground"}>{v || ph}</span>
    {select && <ChevronsUpDown className="size-3.5 text-muted-foreground" />}
  </div>
)
const PageHead = ({ title, sub, right }: { title: string; sub?: string; right?: ReactNode }) => (
  <div className="flex items-start justify-between">
    <div><h1 className="text-[22px] font-bold tracking-tight">{title}</h1>{sub && <p className="mt-0.5 text-[14px] text-muted-foreground">{sub}</p>}</div>
    <div className="flex items-center gap-2">{right}</div>
  </div>
)
const Toolbar = ({ children }: { children?: ReactNode }) => (
  <div className="mt-4 flex items-center gap-2">
    <div className="flex h-9 w-56 items-center gap-2 rounded-full border px-3 text-[14px] text-muted-foreground"><Search className="size-3.5" />Search…</div>
    <Field v="All namespaces" select className="w-48" />
    {children}
  </div>
)
const Chip = ({ children, className }: { children: ReactNode; className?: string }) => (
  <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium", className)}>{children}</span>
)
const Sev = ({ v }: { v: "Warning" | "Critical" }) =>
  <Chip className={v === "Critical" ? "bg-red-100 text-red-700" : "bg-orange-100 text-orange-700"}>{v}</Chip>
const Th = ({ children, className }: { children?: ReactNode; className?: string }) => <th className={cn("h-11 px-3 text-left text-[13px] font-semibold", className)}>{children}</th>
const Td = ({ children, className }: { children?: ReactNode; className?: string }) => <td className={cn("h-11 whitespace-nowrap px-3 text-[13px]", className)}>{children}</td>
const Wrap = ({ children }: { children: ReactNode }) => <div className="flex-1 overflow-hidden px-8 py-6">{children}</div>

/* ───────── Dashboard ───────── */

export function DashboardPage({ s }: { s: DemoState }) {
  const crit = s.events.filter((e) => e.severity === "Critical").length
  const stat = (icon: ReactNode, tint: string, label: string, v: string, sub: string) => (
    <Box className="flex items-center gap-5 overflow-hidden p-0">
      <div className={cn("flex h-24 w-14 items-center justify-center", tint)}>{icon}</div>
      <div><p className="text-[14px] text-muted-foreground">{label}</p><p className="text-[24px] font-bold leading-tight">{v}</p><p className="text-[12px] text-muted-foreground">{sub}</p></div>
    </Box>
  )
  return (
    <Wrap>
      <PageHead title="Overview" sub="Kubernetes security management" right={<Btn><RefreshCw />Refresh</Btn>} />
      <div className="mt-6 grid grid-cols-2 gap-4">
        {stat(<Server className="size-5 text-green-600" />, "bg-green-50", "Tetragon Agents", "3 / 3", "All nodes online")}
        {stat(<Activity className="size-5 text-amber-500" />, "bg-amber-50", "Security Events", String(s.events.length), `Critical: ${crit} / Warning: ${s.events.length - crit}`)}
        {stat(<ShieldX className="size-5 text-violet-500" />, "bg-violet-50", "Admission Events", "0", "Critical: 0 / Warning: 0")}
        {stat(<Lock className="size-5 text-green-600" />, "bg-green-50", "Global Protect Mode", "OFF", "Monitoring only")}
      </div>
      <Box className="mt-6">
        <div className="flex items-center justify-between border-b px-6 py-4"><div><p className="font-semibold">Vulnerabilities</p><p className="text-[13px] text-muted-foreground">6 critical · 75 high · 1 critical and exposed</p></div><span className="text-[14px] font-medium">View all →</span></div>
        <table className="w-full"><tbody>
          {VULNS.slice(0, 4).map((v) => (
            <tr key={v.name} className="border-b last:border-0"><Td className="pl-6">{v.name}{v.exposed && <Chip className="ml-2 bg-orange-100 text-orange-700">Exposed</Chip>}</Td><Td>{v.ns}</Td><Td className="text-red-600">{v.c}</Td><Td className="text-orange-600">{v.h}</Td><Td>{v.fix}</Td></tr>
          ))}
        </tbody></table>
      </Box>
    </Wrap>
  )
}

/* ───────── Behavior Discovery ───────── */

export function DiscoveryPage() {
  return (
    <Wrap>
      <PageHead title="Behavior Discovery" sub="Process behaviors learned from the Tetragon base sensor." right={<Btn><Trash2 />Clear All</Btn>} />
      <div className="mt-4 flex items-center gap-2">
        <Field v="shop" select className="w-48" />
        <div className="flex h-9 w-48 items-center gap-2 rounded-full border px-3 text-[14px] text-muted-foreground"><Search className="size-3.5" />Search pod...</div>
        <span className="ml-auto text-[14px] text-muted-foreground">4 workloads · 7 pods total</span>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-4">
        {WORKLOADS.map((w) => (
          <Box key={w.name} t={w.key === "payment" ? "disc-payment" : undefined}>
            <div className="flex items-start justify-between border-b px-5 py-4">
              <div>
                <p className="flex items-center gap-2"><Chip className="bg-secondary font-mono text-[10px]">{w.kind}</Chip><span className="text-[16px] font-semibold">{w.name}</span></p>
                <p className="mt-0.5 text-[13px] text-muted-foreground">shop · {w.pods} pods</p>
              </div>
              <Btn t={w.key === "payment" ? "disc-create" : undefined}>Create Policy</Btn>
            </div>
            <div className="px-5 py-4">
              <p className="flex items-center justify-between text-[13px] font-semibold">Process<span className="flex size-5 items-center justify-center rounded-full bg-secondary text-[11px]">{w.procs.length}</span></p>
              <div className="mt-2 flex gap-1.5">{w.procs.map((p) => <code key={p} className="rounded bg-secondary px-1.5 py-0.5 text-[11px]">{p}</code>)}</div>
              <p className="mt-4 border-t pt-3 text-[13px] text-muted-foreground">since {w.since} ago</p>
            </div>
          </Box>
        ))}
      </div>
    </Wrap>
  )
}

/* ───────── Tracing Policy:New Policy(表單 + Generated YAML) ───────── */

const Yaml = ({ lines, t, kind }: { lines: string[]; t?: string; kind: string }) => (
  <Box t={t} className="flex flex-col overflow-hidden">
    <div className="flex items-center justify-between border-b px-5 py-3"><span className="font-semibold">Generated YAML</span><Chip className="bg-secondary font-mono text-[10px]">{kind}</Chip></div>
    <pre className="flex-1 overflow-hidden bg-[#1e1e1e] px-5 py-4 font-mono text-[12px] leading-[1.6] text-[#d4d4d4]">{lines.join("\n")}</pre>
  </Box>
)
const Section = ({ title, children, t }: { title: string; children: ReactNode; t?: string }) => (
  <Box t={t}><p className="border-b px-5 py-3 font-semibold">{title}</p><div className="space-y-2 px-5 py-4">{children}</div></Box>
)

export function PolicyNewPage({ s }: { s: DemoState }) {
  const yaml = [
    "apiVersion: cilium.io/v1alpha1", "kind: TracingPolicyNamespaced", "metadata:", `  name: ${s.peName}`, "  namespace: shop", "spec:",
    "  podSelector:", "    matchLabels:", "      app: payment-api", "  kprobes:", "  - call: sys_execve", "    syscall: true", "    args:",
    "    - index: 0", "      type: string", "    selectors:", "    - matchArgs:", "      - index: 0", "        operator: NotEqual", "        values:",
    ...s.peRules.map((r) => `        - ${r}`), "      matchActions:", "      - action: Post",
  ]
  return (
    <Wrap>
      <PageHead title="New Policy" right={<>
        <span className="text-[14px] text-muted-foreground">Mode</span><Field t="pe-mode" v="Monitoring" select className="w-36" />
        <Btn>Cancel</Btn><Btn t="pe-apply" primary>Apply</Btn>
      </>} />
      <div className="mt-5 grid grid-cols-2 gap-5">
        <div className="space-y-4">
          <Section title="Basic Information">
            <div className="grid grid-cols-2 gap-3">
              <div><p className="mb-1.5 text-[13px] font-medium">Policy Name <span className="text-red-500">*</span></p><Field v={s.peName} /></div>
              <div><p className="mb-1.5 text-[13px] font-medium">Namespace</p><Field v="shop" select /></div>
            </div>
          </Section>
          <Section title="Pod Selector">
            <div className="flex gap-2"><Field v="app" className="w-28" /><Field v="payment-api" className="flex-1" /></div>
            <p className="text-[12px] text-green-700">Selects 2 pods in shop: {PAY_POD}, {PAY_POD_2}</p>
          </Section>
          <Section title="Process Rules" t="pe-rules">
            <p className="text-[12px] font-semibold">Mode</p><Field v="Whitelist" select className="w-56" />
            <p className="text-[12px] text-muted-foreground">Whitelist: only the binaries you list may run. Everything else is reported.</p>
            {s.peRules.map((r) => <div key={r} className="flex items-center gap-3"><Field v={r} className="flex-1" mono /><X className="size-3.5 text-muted-foreground" /></div>)}
          </Section>
        </div>
        <Yaml t="pe-yaml" lines={yaml} kind="TracingPolicyNamespaced" />
      </div>
    </Wrap>
  )
}

/* ───────── Tracing Policy 列表(Mode 可在列表直接切換) ───────── */

export function PoliciesPage({ s }: { s: DemoState }) {
  const anyProtect = s.policies.some((p) => p.mode === "Protect")
  return (
    <Wrap>
      <PageHead title="Tracing Policy" right={<><Btn><RefreshCw />Refresh</Btn><Btn>+ New YAML</Btn><Btn primary>+ New Policy</Btn></>} />
      <div className="mt-4 flex items-center justify-between rounded-xl border bg-secondary/60 px-4 py-3 text-[13px]">
        <span className="flex items-center gap-2"><ShieldCheck className="size-4 text-muted-foreground" />Protect mode is off - monitoring only, no blocking{anyProtect && <span className="text-muted-foreground">（個別政策已開啟 Protect）</span>}</span>
        <Btn>Turn On</Btn>
      </div>
      <Box className="mt-4 overflow-visible">
        <table className="w-full">
          <thead className="border-b"><tr><Th className="pl-5">Name</Th><Th>Scope</Th><Th>Mode</Th><Th>Namespace</Th><Th>Created By</Th><Th>Created Time</Th><Th>Actions</Th></tr></thead>
          <tbody>
            {s.policies.map((p, i) => (
              <tr key={p.name} data-t={`pl-row-${i}`} className="border-b last:border-0">
                <Td className="pl-5 font-medium">{p.name}</Td>
                <Td><Chip className="bg-blue-50 text-blue-700">{p.scope}</Chip></Td>
                <Td>
                  <div className="relative w-32">
                    <div data-t={`pl-mode-${i}`} className={cn("flex h-8 items-center justify-between rounded-full border px-3 text-[13px]", p.mode === "Protect" && "border-red-200 bg-red-50 text-red-700")}>
                      {p.mode}<ChevronDown className="size-3.5 opacity-60" />
                    </div>
                    {i === 0 && s.modeOpen && (
                      <div className="absolute left-0 top-9 z-10 w-36 rounded-xl border bg-background p-1 text-[13px] shadow-lg">
                        <div className="rounded-md bg-secondary px-2 py-1.5">Monitoring</div>
                        <div data-t="pl-mode-protect" className="px-2 py-1.5">Protect</div>
                      </div>
                    )}
                  </div>
                </Td>
                <Td>{p.ns}</Td><Td>{p.by}</Td><Td className="font-mono text-[12px]">{p.created}</Td>
                <Td><span className="mr-3 font-medium">Edit</span><span className="font-medium text-red-600">Delete</span></Td>
              </tr>
            ))}
          </tbody>
        </table>
      </Box>
    </Wrap>
  )
}

/* ───────── Security Events ───────── */

export function EventsPage({ s }: { s: DemoState }) {
  const crit = s.events.filter((e) => e.severity === "Critical").length
  return (
    <Wrap>
      <PageHead title="Security Events" right={<><span className="flex items-center gap-1.5 text-[14px] text-green-600"><Wifi className="size-4" />Live</span><Btn><Pause />Pause</Btn><Btn>Export CSV</Btn></>} />
      <Toolbar><Btn className="h-9 rounded-full"><SlidersHorizontal />Filter</Btn></Toolbar>
      <Box className="mt-4 overflow-hidden">
        <p className="flex gap-5 border-b px-5 py-4 text-[14px]">
          <span className="text-muted-foreground">{s.events.length} events</span>
          <span className="text-orange-600">● {s.events.length - crit} warning</span>
          <span className="text-red-600">● {crit} critical</span>
        </p>
        <table className="w-full">
          <thead className="border-b"><tr><Th className="w-10" /><Th>Severity</Th><Th>Rule / Detail</Th><Th>Namespace</Th><Th>Pod / Container</Th><Th>Policy</Th><Th>Time</Th></tr></thead>
          <tbody>
            {s.events.map((e) => {
              const open = s.expanded === e.id
              return [
                <tr key={e.id} data-t={`ev-row-${e.id}`} className={cn("border-b", e.id === "xmrig" && "ev-new", open && "bg-secondary/50")}>
                  <Td className="pl-4">{open ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}</Td>
                  <Td><Sev v={e.severity} /></Td>
                  <Td><Chip className="mr-2 bg-violet-100 text-violet-700">{e.rule}</Chip><code className="text-[13px]">{e.detail}</code></Td>
                  <Td>{e.ns}</Td>
                  <Td>{e.pod} <span className="text-muted-foreground">/ {e.container}</span></Td>
                  <Td><code className="rounded-full border px-2 py-0.5 text-[11px]">{e.policy}</code></Td>
                  <Td className="font-mono text-[12px]">{e.time}</Td>
                </tr>,
                open && (
                  <tr key={`${e.id}-d`} className="border-b bg-secondary/50">
                    <td colSpan={7} className="px-12 pb-4 pt-1">
                      <div data-t="ev-detail" className="inline-block space-y-0.5 font-mono text-[12px]">
                        {([["Binary", e.binary], ["Parent", e.parent], ["User", e.user], ["Pod / Container", `${e.pod} / ${e.container}`], ["Policy", e.policy], ["Function", e.fn], ["Hook", e.hook], ["Node", e.node], ["Time", e.at]] as const).map(([k, v]) => (
                          <p key={k}><span className="font-sans text-muted-foreground">{k}: </span>{v}</p>
                        ))}
                      </div>
                      <div className="mt-3">
                        {s.quarantined
                          ? <Chip className="bg-red-100 text-red-700"><Lock className="mr-1 size-3" />Quarantined</Chip>
                          : <span data-t="ev-quarantine" className="inline-flex h-8 items-center rounded-full border border-red-300 px-3 text-[13px] font-medium text-red-600">Quarantine this pod</span>}
                      </div>
                    </td>
                  </tr>
                ),
              ]
            })}
          </tbody>
        </table>
      </Box>
      {s.confirmOpen && (
        <div className="absolute inset-0 z-30 flex items-start justify-center bg-black/10 pt-[150px] backdrop-blur-[3px]">
          <div data-t="dlg-q" className="w-[420px] overflow-hidden rounded-2xl border bg-background shadow-xl">
            <div className="px-5 pb-4 pt-5">
              <p className="text-[17px] font-semibold">Quarantine this pod?</p>
              <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground"><code className="text-foreground">shop/{PAY_POD}</code> loses all network access. The container keeps running, so anything it serves stops. Release it from Policies → Quarantine.</p>
            </div>
            <div className="flex justify-end gap-2 border-t bg-secondary/40 px-5 py-3"><Btn>Cancel</Btn><span data-t="dlg-q-ok" className="inline-flex h-8 items-center rounded-lg bg-red-100 px-3 text-[13px] font-medium text-red-700">Quarantine</span></div>
          </div>
        </div>
      )}
    </Wrap>
  )
}

/** Slack 告警通知(Webhook 推送) */
export function SlackToast() {
  return (
    <div data-t="slack" className="slack-toast absolute right-5 top-16 z-40 w-[360px] rounded-xl border bg-background p-4 shadow-xl">
      <p className="flex items-center gap-2 text-[12px] text-muted-foreground"><span className="flex size-5 items-center justify-center rounded bg-[#4a154b] text-[10px] font-bold text-white">#</span>Slack · #sec-alerts</p>
      <p className="mt-2 flex items-center gap-2 text-[14px] font-semibold"><img src={logo} alt="" className="size-5" />K8s Sentinel<Chip className="bg-secondary text-[10px]">APP</Chip><span className="text-[11px] font-normal text-muted-foreground">02:13</span></p>
      <div className="mt-2 border-l-4 border-red-500 pl-3 text-[13px] leading-relaxed">
        <p className="font-semibold text-red-600">Critical · Process Rule</p>
        <p><code>xmrig</code> blocked in <code>shop/{PAY_POD}</code></p>
        <p className="text-muted-foreground">Policy: payment-api-allowlist · Node: w2</p>
      </div>
    </div>
  )
}

/* ───────── Quarantine ───────── */

export function QuarantinePage() {
  return (
    <Wrap>
      <PageHead title="Quarantine" sub="Pods cut off from the network. Processes keep running for investigation." right={<Btn><RefreshCw />Refresh</Btn>} />
      <Box className="mt-5 overflow-hidden">
        <table className="w-full">
          <thead className="border-b"><tr><Th className="pl-5">Pod</Th><Th>Namespace</Th><Th>Node</Th><Th>Quarantined By</Th><Th>Since</Th><Th>Actions</Th></tr></thead>
          <tbody>
            <tr data-t="q-row"><Td className="pl-5 font-medium"><Lock className="mr-1.5 inline size-3.5 text-red-600" />{PAY_POD}</Td><Td>shop</Td><Td>w2</Td><Td>oncall</Td><Td className="font-mono text-[12px]">2026/11/19 02:16</Td><Td><Btn>Release</Btn></Td></tr>
          </tbody>
        </table>
      </Box>
    </Wrap>
  )
}

/* ───────── Network Topology ───────── */

type TNode = { id: string; x: number; y: number; ns?: string; name: string; tone?: "ext" | "node"; exposed?: boolean; locked?: boolean; t?: string }
const TNODES: TNode[] = [
  { id: "world", x: 0, y: 170, ns: "External", name: "world via w1", tone: "ext" },
  { id: "store", x: 200, y: 170, ns: "shop", name: "storefront-7d9f8", exposed: true },
  { id: "pay2", x: 400, y: 70, ns: "shop", name: PAY_POD_2 },
  { id: "pay1", x: 400, y: 270, ns: "shop", name: PAY_POD, locked: true, t: "topo-q" },
  { id: "db", x: 680, y: 170, ns: "shop", name: "orders-db-0" },
  { id: "sus", x: 720, y: 0, ns: "External", name: SUS_HOST, tone: "ext" },
]
const NW = 170
const NH = 64
function tEdge(a: TNode, b: TNode) {
  const x1 = a.x + NW, y1 = a.y + NH / 2, x2 = b.x, y2 = b.y + NH / 2
  const m = (x2 - x1) / 2
  return `M ${x1} ${y1} C ${x1 + m} ${y1} ${x2 - m} ${y2} ${x2} ${y2}`
}

export function TopologyPage({ s }: { s: DemoState }) {
  const by = Object.fromEntries(TNODES.map((n) => [n.id, n]))
  const edges: [string, string][] = [["world", "store"], ["store", "pay2"], ["pay2", "db"]]
  return (
    <Wrap>
      <PageHead title="Network Topology" right={<><Chip className="bg-blue-50 text-blue-600">Cilium · L7</Chip><Btn>Auto Layout</Btn><Btn><RefreshCw />Refresh</Btn></>} />
      <div className="mt-4 flex items-center gap-2">
        <Field v="shop" select className="w-48" />
        <div className="flex h-9 w-48 items-center gap-2 rounded-full border px-3 text-[14px] text-muted-foreground"><Search className="size-3.5" />Pod name...</div>
        <Btn className="h-9 rounded-full"><SlidersHorizontal />View</Btn>
        <span className="ml-auto flex gap-4 text-[12px] text-muted-foreground">
          <span>▢ Pod</span><span className="text-amber-600">▢ External</span><span className="text-amber-600"><Globe className="inline size-3" /> Exposed</span><span className="text-red-600">- - Denied</span>
        </span>
      </div>
      <div className="relative mt-4 h-[430px] overflow-hidden rounded-2xl border bg-[radial-gradient(#d4d4d8_1px,transparent_1px)] [background-size:18px_18px]">
        <div className="absolute left-[30px] top-[30px]" style={{ width: 890, height: 340 }}>
          <svg className="absolute inset-0 overflow-visible" width={890} height={340}>
            <defs>
              <marker id="ta" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0 L10 5 L0 10z" fill="#6366f1" /></marker>
              <marker id="tr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0 L10 5 L0 10z" fill="#dc2626" /></marker>
            </defs>
            {edges.map(([a, b]) => <path key={a + b} d={tEdge(by[a], by[b])} fill="none" stroke="#6366f1" strokeWidth={2} strokeDasharray="6 5" markerEnd="url(#ta)" className="topo-flow" />)}
            <path d={tEdge(by.pay2, by.sus)} fill="none" stroke={s.denied ? "#dc2626" : "#6366f1"} strokeWidth={2.2} strokeDasharray={s.denied ? "4 6" : "6 5"} markerEnd={s.denied ? "url(#tr)" : "url(#ta)"} className={s.denied ? "" : "topo-flow"} />
          </svg>
          <div data-t="topo-sus" className={cn("absolute rounded-full border px-2 py-0.5 text-[11px] font-medium shadow-sm", s.denied ? "border-red-200 bg-red-50 text-red-700" : "bg-background text-foreground")} style={{ left: 655, top: 74, transform: "translateX(-50%)" }}>
            {s.denied ? "Denied · TCP 4444 ×37" : "TCP 4444 ×37"}
          </div>
          {TNODES.map((n) => (
            <div key={n.id} data-t={n.t} className={cn("absolute flex flex-col items-center justify-center rounded-2xl border-2 bg-background text-center shadow-sm",
              n.tone === "ext" && "border-amber-300 bg-amber-50", n.locked && "border-red-500")} style={{ left: n.x, top: n.y, width: NW, height: NH }}>
              <span className={cn("text-[12px]", n.tone === "ext" ? "text-amber-600" : "text-muted-foreground")}>{n.ns}</span>
              <span className={cn("max-w-[150px] truncate text-[15px] font-medium", n.tone === "ext" && "font-mono text-[14px]")}>{n.name}</span>
              {n.exposed && <Globe className="absolute right-2 top-2 size-3.5 text-amber-500" />}
              {n.locked && <span className="absolute -right-2 -top-2 flex size-6 items-center justify-center rounded-full bg-red-600"><Lock className="size-3.5 text-white" /></span>}
            </div>
          ))}
        </div>
        {s.edgeOpen && (
          <div data-t="topo-detail" className="absolute right-3 top-3 w-[280px] rounded-xl border bg-background p-5 shadow-lg">
            <p className="font-semibold">Connection Detail</p>
            <dl className="mt-4 space-y-3 text-[13px]">
              {([["Source", `shop/${PAY_POD_2}`], ["Destination", `${SUS_HOST} (External)`], ["Ports", "4444/TCP ×37"], ["Verdict", "Denied"], ["Denied by", "payment-api-allow"]] as const).map(([k, v]) => (
                <div key={k}><dt className="text-muted-foreground">{k}</dt><dd className={cn("font-mono", (k === "Verdict" || k === "Denied by") && "font-semibold text-red-600")}>{v}</dd></div>
              ))}
            </dl>
          </div>
        )}
      </div>
    </Wrap>
  )
}

/* ───────── Network Policy:New Policy ───────── */

export function NetpolNewPage({ s }: { s: DemoState }) {
  const st = s.npStep
  const yaml = [
    "apiVersion: cilium.io/v2", "kind: CiliumNetworkPolicy", "metadata:", `  name: ${s.npName}`, "  namespace: shop", "spec:", "  endpointSelector:", "    matchLabels:", "      app: payment-api",
    ...(st >= 3 ? ["  ingress:", "  - fromEndpoints:", "    - matchLabels:", "        app: storefront", "    toPorts:", "    - ports:", "      - port: \"8080\"", "        protocol: TCP", "  - fromEntities:", "    - host", "    - health"] : []),
    ...(st >= 4 ? ["  egress:", "  - toEndpoints:", "    - matchLabels:", "        app: orders-db", "    toPorts:", "    - ports:", "      - port: \"5432\"", "        protocol: TCP"] : []),
  ]
  const rule = (dir: string, kind: string, v: string, port: string, extra?: string) => (
    <div className="space-y-2 rounded-xl border p-3">
      <div className="grid grid-cols-[110px_1fr] gap-2"><Field v={kind} select /><Field v={v} /></div>
      <div className="flex items-center gap-2 text-[12px] text-muted-foreground"><span>{dir} Ports</span><Field v={port} className="h-8 w-28 text-[13px]" />{extra && <span>{extra}</span>}</div>
    </div>
  )
  return (
    <Wrap>
      <PageHead title="New Network Policy" right={<><Btn>Cancel</Btn><Btn t="np-apply" primary>Apply</Btn></>} />
      <div className="mt-5 grid grid-cols-2 gap-5">
        <div className="space-y-3">
          <Section title="Basic Information">
            <div className="grid grid-cols-2 gap-3">
              <div><p className="mb-1.5 text-[13px] font-medium">Name <span className="text-red-500">*</span></p><Field t="np-name" v={s.npName} /></div>
              <div><p className="mb-1.5 text-[13px] font-medium">Namespace</p><Field v="shop" select /></div>
            </div>
            <div data-t="np-applies" className={cn("space-y-1.5 transition-opacity", st < 2 && "opacity-40")}>
              <p className="text-[13px] font-medium">Applies to <span className="text-red-500">*</span></p>
              <div className="flex gap-2"><Field v={st >= 2 ? "app" : ""} ph="key" className="w-28" /><Field v={st >= 2 ? "payment-api" : ""} ph="value" className="flex-1" /></div>
              {st >= 2 && <p className="text-[12px] text-green-700">Selects 2 pods in shop: {PAY_POD}, {PAY_POD_2}</p>}
            </div>
          </Section>
          <Section title="Ingress" t="np-ingress">
            {st >= 3 ? <>
              <Field v="Whitelist" select className="w-48" />
              {rule("To", "Labels", "app=storefront", "8080/TCP")}
              <p className="text-[12px] text-muted-foreground">+ Entity host（kubelet 探測）、Entity health（Cilium 健康檢查）</p>
            </> : <p className="text-[13px] text-muted-foreground">No rules</p>}
          </Section>
          <Section title="Egress" t="np-egress">
            {st >= 4 ? <>
              <Field v="Whitelist" select className="w-48" />
              {rule("To", "Labels", "app=orders-db", "5432/TCP")}
            </> : <p className="text-[13px] text-muted-foreground">No rules</p>}
          </Section>
        </div>
        <Yaml lines={yaml} kind="CiliumNetworkPolicy" />
      </div>
    </Wrap>
  )
}

/* ───────── Vulnerabilities(Workloads) ───────── */

export function VulnsPage({ s }: { s: DemoState }) {
  const rows = s.vFilter ? VULNS.filter((v) => v.exposed && v.fix > 0) : VULNS
  const sum = (k: "c" | "h") => VULNS.reduce((n, v) => n + v[k], 0)
  const total = VULNS.reduce((n, v) => n + v.c + v.h + v.m + v.l, 0)
  return (
    <Wrap>
      <PageHead title="Vulnerabilities" right={<><Btn><Download />Export CSV</Btn><Btn><RefreshCw />Refresh</Btn></>} />
      <Toolbar>
        <Btn t="v-filter" className={cn("h-9 rounded-full", s.vFilter && "border-foreground")}><SlidersHorizontal />Filter{s.vFilter && <span className="rounded-full bg-foreground px-1.5 text-[10px] text-background">2</span>}</Btn>
        {s.vFilter && <><Chip className="bg-orange-100 text-orange-700">Exposed</Chip><Chip className="bg-green-100 text-green-700">Fix available</Chip></>}
      </Toolbar>
      <Box t="v-table" className="mt-4 overflow-hidden">
        <p data-t="v-summary" className="flex gap-5 border-b px-5 py-4 text-[14px]">
          <span className="text-muted-foreground">{VULNS.length} workloads · {total.toLocaleString()} findings</span>
          <span className="text-red-600">● {sum("c")} critical</span><span className="text-orange-600">● {sum("h")} high</span>
          <span className="text-red-600">1 critical and exposed</span>
        </p>
        <table className="w-full">
          <thead className="border-b"><tr><Th className="w-8" /><Th>Workload</Th><Th>Namespace</Th><Th>Image</Th><Th className="text-right">Critical</Th><Th className="text-right">High</Th><Th className="text-right">Medium</Th><Th className="text-right">Low</Th><Th className="text-right">Fixable</Th><Th>Scanned</Th></tr></thead>
          <tbody>
            {rows.map((v, i) => (
              <tr key={v.name} data-t={`v-row-${i}`} className="border-b last:border-0">
                <Td className="pl-4"><ChevronRight className="size-4" /></Td>
                <Td><span className="text-muted-foreground">{v.kind} / </span><span className="font-medium">{v.name}</span>{v.exposed && <Chip className="ml-2 bg-orange-100 text-orange-700">Exposed</Chip>}</Td>
                <Td>{v.ns}</Td><Td className="font-mono text-[12px]">{v.image}</Td>
                <Td className={cn("text-right", v.c ? "text-red-600" : "text-muted-foreground")}>{v.c}</Td>
                <Td className="text-right text-orange-600">{v.h}</Td><Td className="text-right text-orange-700/80">{v.m}</Td><Td className="text-right">{v.l}</Td>
                <Td className="text-right font-medium">{v.fix}</Td><Td className="font-mono text-[12px]">1h ago</Td>
              </tr>
            ))}
          </tbody>
        </table>
      </Box>
    </Wrap>
  )
}

/* ───────── Admission Policy:Vulnerability Limit + Binding ───────── */

export function VapNewPage({ s }: { s: DemoState }) {
  const st = s.vapStep
  return (
    <Wrap>
      <PageHead title="New Admission Policy" right={<><Btn>Cancel</Btn><Btn t="vap-save" primary>Save</Btn></>} />
      <div className="mt-5 grid max-w-[760px] gap-4">
        <Section title="Policy">
          <div className="grid grid-cols-2 gap-3">
            <div><p className="mb-1.5 text-[13px] font-medium">Policy Name <span className="text-red-500">*</span></p><Field t="vap-name" v={s.vapName} /></div>
            <div><p className="mb-1.5 text-[13px] font-medium">Rule Type</p><Field t="vap-type" v={st >= 2 ? "Vulnerability Limit" : ""} ph="Select a rule type" select /></div>
          </div>
          <div><p className="mb-1.5 text-[13px] font-medium">Apply To</p><Field v="All Workloads" select className="w-56" /></div>
          {st >= 3 && (
            <div data-t="vap-critical" className="space-y-2 rounded-xl border p-3">
              <div className="grid grid-cols-2 gap-3">
                <div><p className="mb-1.5 text-[13px] font-medium">Critical allowed</p><Field v="0" /></div>
                <div><p className="mb-1.5 text-[13px] font-medium">High allowed</p><Field ph="Not counted" /></div>
              </div>
              <p className="flex items-center gap-2 text-[13px]"><span className="flex size-4 items-center justify-center rounded border bg-foreground text-[10px] text-background">✓</span>Count only vulnerabilities with a fix available</p>
            </div>
          )}
        </Section>
        <Section title="Binding" t="vap-binding">
          {st >= 4 ? (
            <div className="grid grid-cols-2 gap-3">
              <div><p className="mb-1.5 text-[13px] font-medium">Namespaces</p><Field v="Only these namespaces: shop" select /></div>
              <div><p className="mb-1.5 text-[13px] font-medium">Action</p><Field v="Deny" select /></div>
            </div>
          ) : <p className="text-[13px] text-muted-foreground">Not bound yet</p>}
        </Section>
      </div>
      {s.terminal > 0 && (
        <div data-t="term" className="term absolute left-8 right-8 top-[88px] z-20 rounded-xl bg-[#0f1419] px-5 py-4 font-mono text-[13px] leading-relaxed text-[#d4d4d4] shadow-2xl">
          <p className="mb-2 text-[11px] text-white/40">開發人員部署新版本</p>
          <p><span className="text-green-400">dev@ci</span>:<span className="text-blue-400">~/shop</span>$ kubectl apply -f storefront-2.4.0.yaml</p>
          {s.terminal > 1 && <p className="mt-1 text-[#ff7b72]">Error from server (Forbidden): error when creating "storefront-2.4.0.yaml": deployments.apps "storefront" is forbidden: ValidatingAdmissionPolicy 'block-critical-images' with binding 'block-critical-images-shop' denied request: image shop/storefront:2.4.0 is over the vulnerability limit: 2 critical, 9 high with a fix available</p>}
        </div>
      )}
    </Wrap>
  )
}

/* ───────── Audit Log ───────── */

const BASE_AUDIT = [
  { time: "2026/11/16 13:58", user: "admin", action: "Sign in", target: "10.20.1.15", status: "Success" },
  { time: "2026/11/15 22:41", user: "root", action: "Sign in", target: "198.51.100.23", status: "Rate limited" },
  { time: "2026/11/15 22:40", user: "root", action: "Sign in", target: "198.51.100.23", status: "Rejected" },
]

export function AuditPage({ s }: { s: DemoState }) {
  const rows = [...s.audit, ...BASE_AUDIT]
  return (
    <Wrap>
      <PageHead title="Audit Log" sub="Every operation performed through K8s Sentinel." right={<><Btn t="audit-export"><Download />Export CSV</Btn><Btn><RefreshCw />Refresh</Btn></>} />
      <Toolbar />
      <Box t="audit-table" className="mt-4 overflow-hidden">
        <table className="w-full">
          <thead className="border-b"><tr><Th className="pl-5">Time</Th><Th>User</Th><Th>Action</Th><Th>Target</Th><Th>Status</Th></tr></thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-b last:border-0">
                <Td className="pl-5 font-mono text-[12px]">{r.time}</Td><Td>{r.user}</Td><Td className="font-medium">{r.action}</Td>
                <Td className="font-mono text-[12px]">{r.target}</Td>
                <Td><Chip className={r.status === "Success" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}>{r.status}</Chip></Td>
              </tr>
            ))}
          </tbody>
        </table>
      </Box>
      {s.exported && (
        <div className="slack-toast absolute bottom-6 right-6 flex items-center gap-2 rounded-xl border bg-background px-4 py-3 text-[14px] shadow-lg">
          <Download className="size-4 text-green-600" />audit-log.csv 已下載（{rows.length} 筆）
        </div>
      )}
    </Wrap>
  )
}
