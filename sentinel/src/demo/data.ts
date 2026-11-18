// 示範用的假叢集:線上購物平台,namespace shop
export const PAY_POD = "payment-api-6b7c9-x2kq"
export const PAY_POD_2 = "payment-api-6b7c9-m4ts"
export const SUS_HOST = "203.0.113.50"

// Behavior Discovery 學到的各服務程式
export const WORKLOADS = [
  { kind: "Deployment", name: "storefront", pods: 2, procs: ["nginx", "storefront"], since: "2d" },
  { kind: "Deployment", name: "cart", pods: 2, procs: ["cart-svc"], since: "2d" },
  { kind: "Deployment", name: "payment-api", pods: 2, procs: ["payment-server", "healthcheck"], since: "2d", key: "payment" },
  { kind: "StatefulSet", name: "orders-db", pods: 1, procs: ["postgres", "pg_isready"], since: "2d" },
]

// 弱點清單(Workloads):對外暴露且有 Critical 的排最前
export const VULNS = [
  { kind: "Deployment", name: "storefront", ns: "shop", image: "shop/storefront:2.3.1", c: 3, h: 21, m: 40, l: 12, fix: 52, exposed: true },
  { kind: "Deployment", name: "payment-api", ns: "shop", image: "shop/payment-api:1.8.0", c: 2, h: 14, m: 33, l: 9, fix: 41, exposed: false },
  { kind: "Deployment", name: "cart", ns: "shop", image: "shop/cart:3.0.4", c: 1, h: 9, m: 27, l: 15, fix: 30, exposed: false },
  { kind: "StatefulSet", name: "orders-db", ns: "shop", image: "postgres:15.4", c: 0, h: 6, m: 18, l: 22, fix: 19, exposed: false },
  { kind: "Deployment", name: "ingress-nginx", ns: "ingress-nginx", image: "controller:v1.9.4", c: 0, h: 12, m: 51, l: 8, fix: 47, exposed: true },
  { kind: "Deployment", name: "coredns", ns: "kube-system", image: "coredns:v1.11.1", c: 0, h: 4, m: 11, l: 3, fix: 12, exposed: false },
  { kind: "DaemonSet", name: "cilium", ns: "kube-system", image: "cilium:v1.16.3", c: 0, h: 9, m: 64, l: 30, fix: 58, exposed: false },
]
