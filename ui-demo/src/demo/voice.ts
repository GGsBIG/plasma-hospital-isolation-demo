// 繁體中文真人配音：優先播放 public/audio 內預先產生的 mp3（edge-tts zh-TW 神經語音，
// 由 scripts/make_audio.py 產生，字幕文字 → 檔名對照在 audio/manifest.json）。
// 找不到對應音檔、或瀏覽器擋自動播放時，才退回內建 TTS。
// ponytail: 要更高品質改跑 `make_audio.py --eleven` 重生成 mp3 覆蓋即可，前端不用動。

const BASE = import.meta.env.BASE_URL // 通常是 "/"
const audio = typeof Audio !== "undefined" ? new Audio() : null
let manifest: Record<string, string> | null = null

// 內建 TTS 後備
let picked: SpeechSynthesisVoice | null = null
function pickVoice() {
  const voices = window.speechSynthesis?.getVoices?.() ?? []
  picked =
    voices.find((v) => v.lang === "zh-TW") ||
    voices.find((v) => /zh[-_]?(TW|Hant|HK)/i.test(v.lang)) ||
    voices.find((v) => v.lang?.toLowerCase().startsWith("zh")) ||
    null
}

export function initVoices() {
  if ("speechSynthesis" in window) {
    pickVoice()
    window.speechSynthesis.onvoiceschanged = pickVoice
  }
  fetch(`${BASE}audio/manifest.json`)
    .then((r) => (r.ok ? r.json() : null))
    .then((m) => { manifest = m })
    .catch(() => { manifest = null })
}

function speakTTS(text: string) {
  if (!("speechSynthesis" in window)) return
  const synth = window.speechSynthesis
  synth.cancel()
  const u = new SpeechSynthesisUtterance(text)
  u.lang = "zh-TW"
  if (picked) u.voice = picked
  synth.speak(u)
}

export function speak(text: string) {
  if (!text) return
  const file = manifest?.[text]
  if (file && audio) {
    window.speechSynthesis?.cancel()
    audio.pause()
    audio.src = `${BASE}audio/${file}`
    audio.currentTime = 0
    audio.play().catch(() => speakTTS(text)) // 自動播放被擋 → 退回 TTS
    return
  }
  speakTTS(text) // 沒有對應音檔（新文案還沒重生成）→ 退回 TTS
}

export const stopSpeaking = () => {
  audio?.pause()
  window.speechSynthesis?.cancel()
}
export const pauseSpeaking = () => {
  if (audio && !audio.paused) audio.pause()
  window.speechSynthesis?.pause()
}
export const resumeSpeaking = () => {
  if (audio && audio.src && audio.paused && !audio.ended) audio.play().catch(() => {})
  window.speechSynthesis?.resume()
}
