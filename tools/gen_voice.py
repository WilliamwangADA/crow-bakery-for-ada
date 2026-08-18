#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""从 tools/voice_manifest.json 批量生成旁白 MP3（edge-tts）
   先跑 node tools/build_voice_manifest.mjs 生成清单。
   用法: python3 tools/gen_voice.py [--force]"""
import asyncio, os, json, sys, edge_tts

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'assets', 'audio')
os.makedirs(OUT, exist_ok=True)
FORCE = '--force' in sys.argv

NARR = 'zh-CN-XiaoxiaoNeural'   # 温柔妈妈嗓，讲睡前故事
RATE = '-12%'                    # 放慢，适合4-5岁听
PITCH = '+2Hz'

with open(os.path.join(ROOT, 'tools', 'voice_manifest.json'), encoding='utf-8') as f:
    LINES = json.load(f)

async def gen():
    ok = skip = 0
    for vid, text in LINES.items():
        out = os.path.join(OUT, f'{vid}.mp3')
        if not FORCE and os.path.exists(out) and os.path.getsize(out) > 1000:
            skip += 1; continue
        await edge_tts.Communicate(text, NARR, rate=RATE, pitch=PITCH).save(out)
        ok += 1; print(f'✅ {vid}')
    print(f'完成: 新增{ok} 跳过{skip} 共{len(LINES)}')

asyncio.run(gen())
