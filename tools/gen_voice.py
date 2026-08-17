#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""批量生成台词语音（edge-tts）→ assets/audio/<id>.mp3
   同时写出 js/voice_lines.js（前端 SpeechSynthesis 兜底用）。
   用法: python3 tools/gen_voice.py"""
import asyncio, os, json, edge_tts

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'assets', 'audio')
os.makedirs(OUT, exist_ok=True)

NARR = 'zh-CN-XiaoxiaoNeural'   # 温柔旁白
KID  = 'zh-CN-XiaoyiNeural'     # 小乌鸦：活泼

# (id, 文本, 音色, 语速)
LINES = [
    ('title',      '乌鸦面包店开门啦！小帮手Ada，快进来吧～', NARR, '-4%'),
    ('intro1',     '在泉水森林的一棵大树上，开着一家香喷喷的乌鸦面包店。', NARR, '-8%'),
    ('intro2',     '有一天，面包店里出生了四只小乌鸦：小巧克力、小苹果、小柠檬，还有雪白雪白的小年糕！', NARR, '-8%'),
    ('intro3',     '哎呀，爸爸妈妈忙着照顾宝宝，面包都烤焦啦。Ada，快来帮帮忙吧！', NARR, '-6%'),
    ('hub',        '想做什么呀？做面包，开店，还是去看面包墙？', NARR, '-4%'),
    ('mold',       '选一个喜欢的模具吧！想做什么造型的面包呢？', KID, '+0%'),
    ('mold_new',   '叮咚！换到新模具啦，快做个新面包试试！', KID, '+2%'),
    ('no_coin',    '金币还不够呀，先去卖几个面包吧～', NARR, '-4%'),
    ('knead',      '揉呀揉，捏呀捏，把面团拍得软乎乎！多点几下面团吧！', KID, '+0%'),
    ('oven_in',    '面团进烤炉喽！等它变成金黄色，就赶快喊它出炉！', NARR, '-4%'),
    ('early',      '嘻嘻，还是白白的面团呢，再烤一会儿吧～', KID, '+0%'),
    ('perfect',    '叮！烤得金黄金黄，香喷喷！真棒呀！', KID, '+2%'),
    ('burnt',      '呀，冒烟啦！别难过，焦面包也有大用处哦！', NARR, '-4%'),
    ('snack',      '咔嚓咔嚓！小伙伴们把焦面包吃得干干净净，说好香呀，还送你一个金币！', KID, '+0%'),
    ('new_bread',  '哇！做出新面包啦！快贴到面包墙上去喽！', KID, '+4%'),
    ('shop_open',  '开店啦开店啦！看看客人的泡泡里想要哪个面包，再从下面的篮子里挑给它吧！', NARR, '-6%'),
    ('serve_wrong','咦，客人想要的好像不是这个哦，再看看泡泡里的图案吧～', NARR, '-4%'),
    ('c1',         '叮！一个金币！', KID, '+2%'),
    ('c2',         '叮叮！两个金币！', KID, '+2%'),
    ('c3',         '叮叮叮！三个金币！哇！', KID, '+4%'),
    ('crowd',      '不得了啦！客人排成了长长的队，连消防车都呜哇呜哇跑来看热闹啦！', NARR, '-2%'),
    ('day_end',    '今天的面包卖光光！乌鸦爸爸乌鸦妈妈都说，谢谢你呀小帮手！', NARR, '-6%'),
    ('no_bread',   '篮子空空的啦，先去做几个香喷喷的面包吧～', NARR, '-4%'),
    ('gallery',    '这就是我们的面包墙！把它贴得满满的吧！', KID, '+0%'),
]

async def gen():
    for vid, text, voice, rate in LINES:
        out = os.path.join(OUT, f'{vid}.mp3')
        if os.path.exists(out) and os.path.getsize(out) > 1000:
            print(f'⏭  {vid}'); continue
        await edge_tts.Communicate(text, voice, rate=rate).save(out)
        print(f'✅ {vid}')
    # 前端兜底文本
    lines = {vid: text for vid, text, _, _ in LINES}
    with open(os.path.join(ROOT, 'js', 'voice_lines.js'), 'w', encoding='utf-8') as f:
        f.write('window.VOICE_LINES = ' + json.dumps(lines, ensure_ascii=False, indent=2) + ';\n')
    print('✅ js/voice_lines.js')

asyncio.run(gen())
