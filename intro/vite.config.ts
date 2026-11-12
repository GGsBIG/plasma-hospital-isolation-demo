import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import path from "path"

// 三個版本(主管、各產業、醫院)同一份程式,各一個頁面
export default defineConfig({
  base: "./",
  plugins: [react()],
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
  build: {
    rollupOptions: {
      input: {
        index: path.resolve(__dirname, "index.html"),
        exec: path.resolve(__dirname, "exec/index.html"),
        general: path.resolve(__dirname, "general/index.html"),
        hospital: path.resolve(__dirname, "hospital/index.html"),
      },
    },
  },
})
