#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""片头旁白配音（edge-tts）→ assets/audio/intro_*.mp3"""
import asyncio, os, json, edge_tts
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'assets', 'audio')
NARR = 'zh-CN-XiaoxiaoNeural'

LINES = [
    ('intro_1', '在很远很远的森林里……', '-16%'),
    ('intro_2', '有一家开在大树里的面包店。', '-14%'),
    ('intro_3', '有一天呀，四只小乌鸦出生啦！', '-10%'),
    ('intro_4', '还有好多好多，好玩又好吃的面包。', '-10%'),
    ('intro_5', '乌鸦面包店，故事开始喽！', '-8%'),
]

async def gen():
    for vid, text, rate in LINES:
        out = os.path.join(OUT, f'{vid}.mp3')
        await edge_tts.Communicate(text, NARR, rate=rate, pitch='+2Hz').save(out)
        print('✅', vid)
    # 合并进 voice_lines.js 兜底文本
    p = os.path.join(ROOT, 'js', 'voice_lines.js')
    src = open(p, encoding='utf-8').read()
    data = json.loads(src[src.index('{'):src.rindex('}')+1])
    for vid, text, _ in LINES: data[vid] = text
    open(p, 'w', encoding='utf-8').write('window.VOICE_LINES = ' + json.dumps(data, ensure_ascii=False, indent=2) + ';\n')
    print('✅ voice_lines.js 已更新')

asyncio.run(gen())
