#!/usr/bin/env node
/* =====================================================================
   文生视频流水线：Seedream 先出图 → 选定/确认 → Seedance 图生视频
   —— 不做盲目的文生视频，画面先用图控住，再让它动起来。

   用法：
   1) 出候选首帧（默认 4 张，挑一张满意的）
      node t2v.mjs frames "<画面描述>" shots/opening --n 4

   2) 用选定的图生成视频
      node t2v.mjs video "<镜头怎么动>" shots/opening_2.png out/opening.mp4

   3) 首尾帧模式（运镜最可控：起止画面都由你定，中间让模型补）
      node t2v.mjs video "<镜头怎么动>" first.png out/x.mp4 --last last.png

   4) 一条龙：出图 → 自动用第1张 → 生视频 → 转码
      node t2v.mjs auto "<画面描述>" "<镜头怎么动>" out/opening.mp4 --n 4

   依赖 .env.local：IMAGE_API_KEY / IMAGE_MODEL / VIDEO_API_KEY / VIDEO_MODEL
   需要 ffmpeg（转码用）
   ===================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { generate } from './gen.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
function loadEnv() {
  for (const p of [path.join(process.cwd(), '.env.local'), path.join(HERE, '.env.local'), path.join(HERE, '..', '.env.local')]) {
    if (!fs.existsSync(p)) continue;
    const env = {};
    for (const line of fs.readFileSync(p, 'utf8').split('\n')) {
      const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
      if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
    return env;
  }
  return {};
}
const env = loadEnv();
const VKEY = env.VIDEO_API_KEY || env.IMAGE_API_KEY;
const VBASE = (env.VIDEO_BASE_URL || 'https://ark.cn-beijing.volces.com/api/v3').replace(/\/$/, '');
const VMODEL = env.VIDEO_MODEL || 'doubao-seedance-2-5-260628';

const sleep = ms => new Promise(r => setTimeout(r, ms));
const argv = process.argv.slice(2);
const flag = (name, def) => { const i = argv.indexOf('--' + name); return i >= 0 ? argv[i + 1] : def; };
const positional = argv.filter((a, i) => !a.startsWith('--') && !(i > 0 && argv[i - 1].startsWith('--')));

/* ---------- 画风常量：改成你项目的风格，保证图和视频同一个调子 ---------- */
const STYLE = env.ART_STYLE
  || '1970年代日本经典儿童绘本手绘插画风格，水彩与彩色铅笔混合质感，深棕色朴拙手绘轮廓线，'
   + '温暖柔和，扁平不要3D渲染，画面里绝对没有任何文字';

/* ================= 1. 出候选图 ================= */
async function makeFrames(desc, outPrefix, n) {
  fs.mkdirSync(path.dirname(path.resolve(outPrefix)) || '.', { recursive: true });
  const files = [];
  for (let i = 1; i <= n; i++) {
    const f = `${outPrefix}_${i}.png`;
    if (fs.existsSync(f)) { console.log(`  ⏭  已存在 ${f}`); files.push(f); continue; }
    // 同一描述多出几张，靠细微措辞差异拉开构图
    const variant = ['', '，稍微换一个构图角度', '，镜头再拉远一点', '，光线更明亮一些'][(i - 1) % 4];
    const ref = env.CHAR_SHEET && fs.existsSync(env.CHAR_SHEET) ? { ref: env.CHAR_SHEET } : {};
    await generate(`${desc}${variant}，${STYLE}`, f, '2560x1440', ref);
    console.log(`  ✅ ${f}`);
    files.push(f);
    await sleep(1200);
  }
  console.log(`\n👉 打开挑一张满意的，再跑：node t2v.mjs video "<镜头怎么动>" ${outPrefix}_1.png out/x.mp4`);
  return files;
}

/* ================= 2. 图生视频 ================= */
const mime = f => (/\.png$/i.test(f) ? 'image/png' : 'image/jpeg');
const dataUrl = f => `data:${mime(f)};base64,` + fs.readFileSync(f).toString('base64');

async function makeVideo(motion, firstFrame, out, lastFrame) {
  if (!fs.existsSync(firstFrame)) { console.error('❌ 首帧不存在:', firstFrame); process.exit(1); }
  // ★ 确认闸门：首帧（哪怕是项目里现成的插画）必须先给用户看过、用户点头，才准烧视频
  if (argv.indexOf('--ok') < 0) {
    console.error('⛔ 先把首帧给用户确认，用户点头后再加 --ok 重跑：\n' +
      `   把首帧拼成 contact sheet → open 打开 → 说明镜头怎么动 → 等回复\n` +
      `   node t2v.mjs video "<镜头怎么动>" ${firstFrame} ${out} --ok`);
    process.exit(1);
  }

  // ★ 图生视频/首尾帧都不能传 --ratio（比例跟随首帧），传了会 TaskTypeConstraint 失败
  const content = [
    { type: 'text', text: `${motion}。保持画面原有的${STYLE}，画面稳定不要变形 --resolution 1080p --duration 5` },
    { type: 'image_url', image_url: { url: dataUrl(firstFrame) }, role: 'first_frame' },
  ];
  if (lastFrame) {
    if (!fs.existsSync(lastFrame)) { console.error('❌ 尾帧不存在:', lastFrame); process.exit(1); }
    content.push({ type: 'image_url', image_url: { url: dataUrl(lastFrame) }, role: 'last_frame' });
  }

  console.log(`🎬 ${VMODEL} | ${lastFrame ? '首尾帧' : '图生视频'} | 首帧 ${path.basename(firstFrame)}`);
  const created = await (await fetch(`${VBASE}/contents/generations/tasks`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${VKEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: VMODEL, content }),
  })).json();
  if (!created.id) { console.error('❌ 创建任务失败:', JSON.stringify(created).slice(0, 400)); process.exit(1); }
  console.log('任务:', created.id, '（通常 1~3 分钟）');

  for (let i = 0; i < 300; i++) {
    await sleep(5000);
    const q = await (await fetch(`${VBASE}/contents/generations/tasks/${created.id}`, {
      headers: { Authorization: `Bearer ${VKEY}` },
    })).json();
    if (q.status === 'succeeded') {
      const raw = out.replace(/\.mp4$/, '_raw_hevc.mp4');
      fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
      fs.writeFileSync(raw, Buffer.from(await (await fetch(q.content.video_url)).arrayBuffer()));
      transcode(raw, out);
      return out;
    }
    if (q.status === 'failed') { console.error('❌ 失败:', JSON.stringify(q.error || q).slice(0, 400)); process.exit(1); }
    if (i % 6 === 0) console.log('  ...', q.status);
  }
  console.error('❌ 超时'); process.exit(1);
}

/* ================= 3. 转码（网页/iPad 必做） ================= */
function transcode(raw, out) {
  const mb = f => (fs.statSync(f).size / 1048576).toFixed(1);
  try {
    execFileSync('ffmpeg', ['-v', 'error', '-i', raw, '-an', '-vf', 'scale=1280:720',
      '-c:v', 'libx264', '-profile:v', 'main', '-pix_fmt', 'yuv420p',
      '-crf', '27', '-preset', 'slow', '-movflags', '+faststart', '-y', out]);
    execFileSync('ffmpeg', ['-v', 'error', '-i', raw, '-frames:v', '1',
      '-vf', 'scale=1280:720', '-y', out.replace(/\.mp4$/, '_poster.jpg')]);
    console.log(`✅ ${out}  ${mb(raw)}MB(HEVC) → ${mb(out)}MB(H.264 720p) ，另出海报图`);
    fs.unlinkSync(raw);
  } catch {
    console.log(`⚠️  没装 ffmpeg，保留原始 ${raw}（${mb(raw)}MB，HEVC 太大不适合网页，请手动转码）`);
  }
}

/* ================= CLI ================= */
const cmd = positional[0];
if (cmd === 'frames') {
  await makeFrames(positional[1], positional[2] || 'frames/shot', +flag('n', 4));
} else if (cmd === 'video') {
  await makeVideo(positional[1], positional[2], positional[3] || 'out.mp4', flag('last'));
} else if (cmd === 'auto') {
  console.error('⛔ auto 已废弃：它绕过"首帧给用户确认"这道闸门。\n' +
    '   请分两步：先 frames 出图 → 拼图给用户看 → 用户点头后 video ... --ok');
  process.exit(1);
} else {
  console.log(`用法（★ 首帧必须先给用户确认，video 才准带 --ok 跑）：
  node t2v.mjs frames "<画面描述>" <输出前缀> [--n 4]
  # → 拼 contact sheet、open 打开、等用户确认
  node t2v.mjs video  "<镜头怎么动>" <首帧.png> <输出.mp4> --ok [--last <尾帧.png>]`);
}
