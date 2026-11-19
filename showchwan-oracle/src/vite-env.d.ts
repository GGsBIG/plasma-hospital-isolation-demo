/// <reference types="vite/client" />
declare module "*.svg" {
  const src: string
  export default src
}
interface ImportMetaEnv {
  /** "1" = 單獨上傳成一頁(build.sh 的「秀傳Oracle減壓」);沒設 = 放在秀傳網站的 oracle/ 底下 */
  readonly VITE_STANDALONE?: string
}
