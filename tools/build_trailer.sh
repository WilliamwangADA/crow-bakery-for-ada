#!/usr/bin/env bash
# 把 5 个 5 秒镜头 + 5 句旁白拼成一支预告小视频（720p H.264，iPad/网页可直接播）
set -euo pipefail
cd "$(dirname "$0")/.."

SHOTS=(out/anim/a1.mp4 out/anim/a2.mp4 out/anim/a3.mp4 out/anim/a4.mp4 out/anim/a5.mp4 out/anim/a6.mp4)
VOICES=(out/trailer/voice/v1.mp3 out/trailer/voice/v2.mp3 out/trailer/voice/v3.mp3 out/trailer/voice/v4.mp3 out/trailer/voice/v5.mp3 out/trailer/voice/v6.mp3)
TAIL=1.6            # 结尾定格时长
LEAD=300            # 每句旁白比镜头晚 0.3s 进
OUT=assets/video/trailer.mp4

dur() { ffprobe -v error -show_entries format=duration -of csv=p=0 "$1"; }

# 每个镜头的起始时间（毫秒），用来给旁白排班
offsets=(); acc=0
for s in "${SHOTS[@]}"; do
  offsets+=("$acc")
  acc=$(python3 -c "print(int(round($acc + $(dur "$s")*1000)))")
done
TOTAL=$(python3 -c "print(round($acc/1000 + $TAIL, 3))")
FADE_OUT=$(python3 -c "print(round($TOTAL - 1.2, 3))")

inputs=(); vf=""; amix=""
for i in "${!SHOTS[@]}"; do
  inputs+=(-i "${SHOTS[$i]}")
  vf+="[$i:v]scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:-1:-1:color=black,fps=24,setsar=1[v$i];"
done
for i in "${!VOICES[@]}"; do
  idx=$(( i + ${#SHOTS[@]} ))
  inputs+=(-i "${VOICES[$i]}")
  d=$(( ${offsets[$i]} + LEAD ))
  vf+="[$idx:a]adelay=${d}|${d},aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo[a$i];"
  amix+="[a$i]"
done
vf+="$(for i in "${!SHOTS[@]}"; do printf "[v%s]" "$i"; done)concat=n=${#SHOTS[@]}:v=1:a=0[vc];"
vf+="[vc]tpad=stop_mode=clone:stop_duration=${TAIL},fade=t=in:st=0:d=0.7,fade=t=out:st=${FADE_OUT}:d=1.2[v];"
vf+="${amix}amix=inputs=${#VOICES[@]}:normalize=0,volume=1.6,afade=t=out:st=${FADE_OUT}:d=1.2[a]"

ffmpeg -v error "${inputs[@]}" -filter_complex "$vf" -map "[v]" -map "[a]" \
  -c:v libx264 -profile:v main -pix_fmt yuv420p -crf 24 -preset slow \
  -c:a aac -b:a 128k -movflags +faststart -t "$TOTAL" -y "$OUT"

ffmpeg -v error -i "$OUT" -frames:v 1 -ss 1 -y "${OUT%.mp4}_poster.jpg"
echo "✅ $OUT  ${TOTAL}s  $(du -h "$OUT" | cut -f1)"
