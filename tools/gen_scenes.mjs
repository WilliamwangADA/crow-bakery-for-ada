#!/usr/bin/env node
/* =====================================================================
   生成绘本分镜插画（可断点续跑：已存在的自动跳过）
   用法: node tools/gen_scenes.mjs [sheet|scenes|all]
   ===================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { generate } from './gen.mjs';
import { CHAR_SHEET, SCENES } from './scenes.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const P = (...a) => path.join(ROOT, ...a);
const exists = f => fs.existsSync(f) && fs.statSync(f).size > 4000;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const SHEET = P('tools', 'ref', 'char_sheet.png');
let ok = 0, skip = 0, fail = 0;

async function withRetry(fn, label, tries = 3) {
  for (let i = 1; i <= tries; i++) {
    try { return await fn(); }
    catch (e) { console.log(`  ⚠️  ${label} 第${i}次: ${e.message.slice(0,130)}`); if (i === tries) { fail++; return null; } await sleep(4000 * i); }
  }
}

// 场景大图：生成 → 压到 1600x900 jpg
async function genScene(prompt, out, label, ref) {
  if (exists(out)) { skip++; console.log(`  ⏭  ${label}`); return; }
  const tmp = out.replace(/\.jpg$/, '_tmp.png');
  const opts = ref && fs.existsSync(ref) ? { ref: path.relative(ROOT, ref) } : {};
  const r = await withRetry(() => generate(prompt, tmp, '2560x1440', opts), label);
  if (!r) return;
  try {
    execFileSync('magick', [tmp, '-resize', '1600x900^', '-gravity', 'center', '-extent', '1600x900', '-quality', '86', out]);
    fs.unlinkSync(tmp); ok++; console.log(`  ✅ ${label}`);
  } catch (e) { fail++; console.log(`  ❌ 压缩失败 ${label}: ${e.message.slice(0,100)}`); }
}

const which = process.argv[2] || 'all';

if (which === 'sheet' || which === 'all') {
  console.log('\n=== 角色定妆图 ===');
  fs.mkdirSync(P('tools', 'ref'), { recursive: true });
  if (exists(SHEET)) console.log('  ⏭  char_sheet 已存在');
  else {
    const r = await withRetry(() => generate(CHAR_SHEET, SHEET, '2048x2048'), 'char_sheet');
    if (r) console.log('  ✅ char_sheet');
  }
}

if (which === 'scenes' || which === 'all') {
  console.log('\n=== 分镜插画 ===');
  for (const [key, prompt] of Object.entries(SCENES)) {
    await genScene(prompt, P('assets', 'scenes', `${key}.jpg`), key, SHEET);
    await sleep(1500);
  }
}
console.log(`\n完成: ✅${ok} ⏭${skip} ❌${fail}`);
