#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""小视频（预告片）旁白配音（edge-tts）→ out/trailer/voice/v1..v5.mp3"""
import asyncio, os, edge_tts

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'out', 'trailer', 'voice')
os.makedirs(OUT, exist_ok=True)
NARR = 'zh-CN-XiaoxiaoNeural'

LINES = [
    ('v1', '在一棵好大好大的老树里呀，藏着一家面包店。', '-16%'),
    ('v2', '乌鸦爸爸把面包铲出炉，热气呼呼地冒出来。', '-12%'),
    ('v3', '小恐龙、小飞机、小星星，全都做成了面包！', '-8%'),
    ('v4', '咦，天忽然黑了——呼，暴风雨来啦。', '-10%'),
    ('v5', '雨停了，云散开，彩虹悄悄爬上天空。', '-12%'),
    ('v6', '大家在一起，面包店的灯呀，一直亮着。', '-16%'),
]

async def gen():
    for vid, text, rate in LINES:
        out = os.path.join(OUT, f'{vid}.mp3')
        await edge_tts.Communicate(text, NARR, rate=rate, pitch='+2Hz').save(out)
        print('✅', vid, text)

asyncio.run(gen())
