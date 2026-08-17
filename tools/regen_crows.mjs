#!/usr/bin/env node
/* =====================================================================
   乌鸦角色二代：以原著封面 tools/ref/cover.jpg 为参考图，
   保留原著标志特征（大黄尖嘴/白圆眼/蓬松羽尖/细棍腿），Q版化更可爱。
   用法: node tools/regen_crows.mjs
   ===================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { generate } from './gen.mjs';
import { STYLE_T } from './assets.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const P = (...a) => path.join(ROOT, ...a);
const REF = 'tools/ref/cover.jpg';
const sleep = ms => new Promise(r => setTimeout(r, ms));

// 参考图特征描述 + Q版化
const BASE = '严格参考图片里乌鸦的造型特征来画：又大又长、非常醒目的亮黄色三角形大尖嘴（占脸的一半），圆圆的白色大眼睛配黑色小瞳孔，羽毛末端有几撮蓬松翘起的锯齿状羽毛尖，两条细细的小棍腿。在此基础上画成更可爱的Q版幼儿绘本角色：头大大的、身体圆滚滚胖乎乎的两头身，表情天真甜美';

const CROWS = {
  papa:  `一只可爱的Q版卡通乌鸦爸爸厨师，${BASE}，黑色羽毛，戴白色高高的厨师帽，系米色围裙，一只翅膀端着放面包的木托盘，慈祥地咧嘴笑，全身正面`,
  mama:  `一只温柔可爱的Q版卡通乌鸦妈妈，${BASE}，黑色羽毛，长长的可爱睫毛，戴白色厨师帽，系浅粉色围裙，翅膀捧着大面碗，温柔微笑，全身正面`,
  choco: `一只超级可爱的Q版小乌鸦宝宝，${BASE}，全身暖暖的巧克力褐色羽毛，开心大笑，全身正面`,
  apple: `一只超级可爱的Q版小乌鸦宝宝，${BASE}，全身苹果红色羽毛，好奇地歪着头，全身正面`,
  lemon: `一只超级可爱的Q版小乌鸦宝宝，${BASE}，全身柠檬黄色羽毛（嘴是更深的橙黄色），兴奋地张开小翅膀，全身正面`,
  mochi: `一只超级可爱的Q版小乌鸦宝宝，${BASE}，全身雪白色羽毛，害羞甜甜地微笑，全身正面`,
  cust1: `一只可爱的Q版小乌鸦，${BASE}，黑色羽毛，脖子上围天蓝色小围巾，全身正面`,
  cust2: `一只可爱的Q版小乌鸦，${BASE}，黑色羽毛，戴绿色小贝雷帽，全身正面`,
  cust3: `一只可爱的Q版小乌鸦，${BASE}，深灰色羽毛，脖子上围橙色小围巾，全身正面`,
};

// 备份旧版
const bak = P('tools', 'backup_v1');
fs.mkdirSync(bak, { recursive: true });
for (const k of Object.keys(CROWS)) {
  const f = P('assets', 'sprites', `${k}.png`);
  if (fs.existsSync(f) && !fs.existsSync(path.join(bak, `${k}.png`))) fs.copyFileSync(f, path.join(bak, `${k}.png`));
}

let ok = 0, fail = 0;
for (const [key, prompt] of Object.entries(CROWS)) {
  const out = P('assets', 'sprites', `${key}.png`);
  const tmp = out.replace(/\.png$/, '_tmp.png');
  let done = false;
  for (let i = 1; i <= 3 && !done; i++) {
    try {
      await generate(prompt + '，' + STYLE_T, tmp, '2048x2048', { ref: REF });
      execFileSync('magick', [tmp, '-alpha','set','-bordercolor','magenta','-border','1',
        '-fuzz','40%','-fill','none','-draw','alpha 0,0 floodfill',
        '-fuzz','15%','-transparent','#FF00FF','-shave','1x1','-trim','+repage',
        '-resize','512x512', out]);
      fs.unlinkSync(tmp); ok++; done = true; console.log(`✅ ${key}`);
    } catch (e) { console.log(`⚠️ ${key} 第${i}次失败: ${e.message.slice(0,120)}`); if (i === 3) fail++; await sleep(3500 * i); }
  }
  await sleep(1200);
}
console.log(`完成: ✅${ok} ❌${fail}（旧版备份在 tools/backup_v1/）`);
