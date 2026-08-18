#!/usr/bin/env node
/* =====================================================================
   Seedance 片头视频：以 s01_tree 为首帧做图生视频
   用法: node tools/gen_intro_video.mjs
   开通 Seedance 后即可直接跑；未开通会明确报 ModelNotOpen。
   ===================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const env = Object.fromEntries(
  fs.readFileSync(path.join(ROOT, '.env.local'), 'utf8').split('\n')
    .map(l => l.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
    .map(m => [m[1], m[2].replace(/^["']|["']$/g, '')])
);
const KEY = env.VIDEO_API_KEY || env.IMAGE_API_KEY;
const BASE = (env.VIDEO_BASE_URL || 'https://ark.cn-beijing.volces.com/api/v3').replace(/\/$/, '');
const MODEL = env.VIDEO_MODEL || 'doubao-seedance-1-0-pro-250528';

const PROMPT = '镜头缓缓向前推进，穿过森林的晨雾靠近这棵开着面包店的大树；'
  + '阳光透过树叶洒下光斑，树叶和藤蔓被微风轻轻吹动，'
  + '几只小鸟从画面左侧飞过，烟囱里飘出淡淡的白色蒸汽，'
  + '橱窗里的暖黄灯光渐渐亮起来。'
  + '画面保持1970年代日本手绘绘本的水彩质感，温暖宁静，不要出现任何文字';

const sleep = ms => new Promise(r => setTimeout(r, ms));
const toDataUrl = p => 'data:image/jpeg;base64,' + fs.readFileSync(p).toString('base64');

const res = await fetch(`${BASE}/contents/generations/tasks`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({
    model: MODEL,
    content: [
      { type: 'text', text: PROMPT + ' --resolution 1080p --duration 5 --ratio 16:9' },
      { type: 'image_url', image_url: { url: toDataUrl(path.join(ROOT, 'assets/scenes/s01_tree.jpg')) } },
    ],
  }),
});
const created = await res.json();
if (!created.id) {
  console.error('❌ 创建任务失败:', JSON.stringify(created).slice(0, 300));
  process.exit(1);
}
console.log('任务已创建:', created.id, '，等待生成（通常 1~3 分钟）...');

for (let i = 0; i < 90; i++) {
  await sleep(5000);
  const q = await (await fetch(`${BASE}/contents/generations/tasks/${created.id}`, {
    headers: { Authorization: `Bearer ${KEY}` },
  })).json();
  if (q.status === 'succeeded') {
    const url = q.content?.video_url;
    console.log('✅ 生成成功，下载中...');
    const buf = Buffer.from(await (await fetch(url)).arrayBuffer());
    fs.mkdirSync(path.join(ROOT, 'assets/video'), { recursive: true });
    const out = path.join(ROOT, 'assets/video/intro.mp4');
    fs.writeFileSync(out, buf);
    console.log('✅ 已保存', out, (buf.length / 1048576).toFixed(1) + 'MB');
    process.exit(0);
  }
  if (q.status === 'failed') { console.error('❌ 生成失败:', JSON.stringify(q).slice(0, 300)); process.exit(1); }
  if (i % 6 === 0) console.log('  ...', q.status);
}
console.error('❌ 超时');
process.exit(1);
