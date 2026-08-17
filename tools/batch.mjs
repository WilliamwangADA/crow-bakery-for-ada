#!/usr/bin/env node
/* =====================================================================
   批量生成素材（可断点续跑：已存在的文件自动跳过）
   用法: node tools/batch.mjs [chars|breads|misc|bg|all]
   ===================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { generate } from './gen.mjs';
import { STYLE_T, STYLE_BG, CHARS, BREADS, MISC, BG } from './assets.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const P = (...a) => path.join(ROOT, ...a);
const exists = f => fs.existsSync(f) && fs.statSync(f).size > 2000;
const sleep = ms => new Promise(r => setTimeout(r, ms));
let ok = 0, skip = 0, fail = 0;

async function withRetry(fn, label, tries = 3) {
  for (let i = 1; i <= tries; i++) {
    try { return await fn(); }
    catch (e) { console.log(`  ⚠️  ${label} 第${i}次失败: ${e.message.slice(0,140)}`); if (i === tries) { fail++; return null; } await sleep(3500 * i); }
  }
}

// 透明贴纸：品红底 → 连通泛洪抠底 → 裁剪
async function genT(prompt, out, label, ref) {
  if (exists(out)) { skip++; console.log(`  ⏭  跳过 ${label}`); return; }
  const tmp = out.replace(/\.png$/, '_raw.png');
  const opts = ref ? { ref: path.relative(ROOT, ref) } : {};
  const r = await withRetry(() => generate(prompt + '，' + STYLE_T, tmp, '2048x2048', opts), label);
  if (!r) return;
  try {
    execFileSync('magick', [tmp, '-alpha','set','-bordercolor','magenta','-border','1',
      '-fuzz','40%','-fill','none','-draw','alpha 0,0 floodfill',
      '-fuzz','15%','-transparent','#FF00FF','-shave','1x1','-trim','+repage',
      '-resize','512x512', out]);
    fs.unlinkSync(tmp); ok++; console.log(`  ✅ ${label}`);
  } catch (e) { fail++; console.log(`  ❌ 抠图失败 ${label}: ${e.message.slice(0,100)}`); }
}
async function genBG(prompt, out, label) {
  if (exists(out)) { skip++; console.log(`  ⏭  跳过 ${label}`); return; }
  const tmp = out.replace(/\.(png|jpg)$/, '_raw.png');
  const r = await withRetry(() => generate(prompt + '，' + STYLE_BG, tmp, '2560x1440'), label);
  if (!r) return;
  try {
    execFileSync('magick', [tmp, '-resize', '1600x900', '-quality', '85', out]);
    fs.unlinkSync(tmp); ok++; console.log(`  ✅ ${label}`);
  } catch (e) { fail++; console.log(`  ❌ 压缩失败 ${label}: ${e.message.slice(0,100)}`); }
}

async function runSet(name, set, dir, refKey) {
  console.log(`\n=== ${name} ===`);
  const anchor = refKey ? P('assets', dir, `${refKey}.png`) : null;
  for (const [key, prompt] of Object.entries(set)) {
    const out = P('assets', dir, `${key}.png`);
    const ref = anchor && key !== refKey && exists(anchor) ? anchor : undefined;
    await genT(prompt, out, key, ref);
    await sleep(1200);
  }
}

const which = process.argv[2] || 'all';
if (which === 'chars' || which === 'all') await runSet('乌鸦一家', CHARS, 'sprites', 'choco');
if (which === 'breads' || which === 'all') await runSet('造型面包', BREADS, 'sprites');
if (which === 'misc' || which === 'all') await runSet('杂项', MISC, 'sprites');
if (which === 'bg' || which === 'all') {
  console.log('\n=== 背景 ===');
  for (const [key, prompt] of Object.entries(BG)) { await genBG(prompt, P('assets','bg',`${key}.jpg`), key); await sleep(1200); }
}
console.log(`\n完成: ✅${ok} ⏭${skip} ❌${fail}`);
