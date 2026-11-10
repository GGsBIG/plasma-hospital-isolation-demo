#!/usr/bin/env python3
"""plasma-ui-demo 繁中真人配音生成。

從 src/demo/scenes.ts 抓出所有字幕（sub / subtitle 字串），逐句轉成 mp3，
輸出到 public/audio/NN.mp3，並寫 public/audio/manifest.json（字幕文字 → 檔名）。
前端 voice.ts 就照字幕文字查表播對應音檔。改完文案重跑即可，音檔覆蓋生效。

引擎（自動選）：
  --eleven 且有 key（ELEVEN_API_KEY 或 ../animation_demo/.eleven_key）→ ElevenLabs
  其餘 → edge-tts（免費 zh-TW 原生神經語音，預設）

用法：
  python3 scripts/make_audio.py                 # edge-tts 女聲 zh-TW-HsiaoChenNeural
  VOICE=zh-TW-YunJheNeural python3 scripts/make_audio.py   # 換男聲
  python3 scripts/make_audio.py --eleven        # 改用 ElevenLabs
"""
import json, os, pathlib, re, shutil, subprocess, sys, urllib.request

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parent
SCENES = ROOT / "src" / "demo" / "scenes.ts"
OUT = ROOT / "public" / "audio"

EDGE_TTS = shutil.which("edge-tts") or str(pathlib.Path.home() / ".local/bin/edge-tts")
VOICE = os.environ.get("VOICE", "zh-TW-HsiaoChenNeural")  # 女聲；男聲 zh-TW-YunJheNeural
RATE = os.environ.get("RATE", "+0%")

USE_ELEVEN = "--eleven" in sys.argv
ELEVEN_KEY = os.environ.get("ELEVEN_API_KEY") or (
    (pathlib.Path.home() / "Desktop/Brobridge/demos/animation_demo/.eleven_key").read_text().strip()
    if (pathlib.Path.home() / "Desktop/Brobridge/demos/animation_demo/.eleven_key").exists() else "")
ELEVEN_VOICE_ID = os.environ.get("ELEVEN_VOICE_ID", "hpp4J3VqNfWAUOO0d1Us")  # Bella-女溫暖


def extract_lines():
    """抓 scenes.ts 裡所有 sub: "..." 與 subtitle: "..." 的字串，保序去重。"""
    text = SCENES.read_text(encoding="utf-8")
    lines, seen = [], set()
    for m in re.finditer(r'(?:sub|subtitle):\s*"([^"]+)"', text):
        s = m.group(1)
        if s and s not in seen:
            seen.add(s)
            lines.append(s)
    return lines


def tts_edge(text, out):
    subprocess.run([EDGE_TTS, "--voice", VOICE, "--rate", RATE,
                    "--text", text, "--write-media", str(out)], check=True)


def tts_eleven(text, out):
    req = urllib.request.Request(
        f"https://api.elevenlabs.io/v1/text-to-speech/{ELEVEN_VOICE_ID}?output_format=mp3_44100_128",
        data=json.dumps({"text": text, "model_id": "eleven_multilingual_v2"}).encode(),
        headers={"xi-api-key": ELEVEN_KEY, "Content-Type": "application/json"})
    with urllib.request.urlopen(req) as r:
        out.write_bytes(r.read())


def main():
    if USE_ELEVEN and not ELEVEN_KEY:
        sys.exit("需要 ElevenLabs key（ELEVEN_API_KEY 或 animation_demo/.eleven_key）")
    lines = extract_lines()
    if not lines:
        sys.exit(f"在 {SCENES} 找不到任何字幕，請確認路徑/格式")
    if OUT.exists():
        shutil.rmtree(OUT)
    OUT.mkdir(parents=True)
    engine = "ElevenLabs" if USE_ELEVEN else f"edge-tts ({VOICE})"
    print(f"engine: {engine} · {len(lines)} 句")
    manifest = {}
    for i, text in enumerate(lines):
        fn = f"{i:02d}.mp3"
        out = OUT / fn
        (tts_eleven if USE_ELEVEN else tts_edge)(text, out)
        manifest[text] = fn
        print(f"  audio/{fn}  {text[:24]}…")
    (OUT / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=0), encoding="utf-8")
    print(f"done → public/audio/ ({len(lines)} mp3 + manifest.json)")


if __name__ == "__main__":
    main()
