#!/usr/bin/env node
/* =====================================================================
   20 种造型面包的「选择图标」（透明底小图，用在做面包的选择界面）
   要求：一眼看出是香喷喷的面包/蛋糕，可爱好看
   用法: node tools/gen_bread_icons.mjs
   ===================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { generate } from './gen.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const P = (...a) => path.join(ROOT, ...a);
const OUT = P('assets', 'breads');
fs.mkdirSync(OUT, { recursive: true });
const exists = f => fs.existsSync(f) && fs.statSync(f).size > 2000;
const sleep = ms => new Promise(r => setTimeout(r, ms));

// 统一：烤得金黄油亮、香喷喷、可爱、绿底好抠图
const STYLE = '这是一个真正的烘焙面包（不是玩具不是模型）：表面烤成诱人的金黄色和焦糖色，油亮有光泽，有淡淡深浅不均的烘烤色斑和一点点面粉，看起来松软香喷喷让人想咬一口，造型圆润胖乎乎非常可爱讨喜，1970年代日本经典儿童绘本手绘插画风格，水彩与彩色铅笔质感，深棕色朴拙手绘轮廓线，扁平不要3D渲染不要照片，俯视平铺视角，主体完整居中不要接触画面边缘，背景是完全均匀的纯绿色#00FF00，背景绝对不要有任何渐变、阴影、光晕或其他物体';

const ICONS = {
  dino:      `一个恐龙形状的可爱面包，胖乎乎的小恐龙侧影，背上有一排小三角，用黑芝麻做眼睛，${STYLE}`,
  plane:     `一个小飞机形状的可爱面包，有胖胖的机身、两只机翼和小尾翼，${STYLE}`,
  penguin:   `一个企鹅形状的可爱面包，胖企鹅站着，肚子是颜色浅一点的白面团，用黑芝麻做眼睛，${STYLE}`,
  bird:      `一只小鸟形状的可爱面包，张开两只小翅膀，用葡萄干做眼睛，${STYLE}`,
  turtle:    `一只小乌龟形状的可爱面包，圆圆的龟壳上烤出格子花纹，伸出四条小短腿和小脑袋，${STYLE}`,
  hippo:     `一只河马形状的可爱面包，胖胖的大脑袋张着大嘴巴，鼻子上两个小孔，用黑芝麻做眼睛，${STYLE}`,
  star:      `一颗五角星形状的可爱面包，表面撒着白色的糖粒，${STYLE}`,
  flower:    `一朵花朵形状的可爱面包，五片胖胖的花瓣围成一圈，中间是一圈红色果酱，${STYLE}`,
  moon:      `一个弯弯月牙形状的可爱面包，表面刷得金黄油亮，${STYLE}`,
  fish:      `一条小鱼形状的可爱面包，摆着尾巴，身上烤出一片片鳞纹，用黑芝麻做眼睛，${STYLE}`,
  butterfly: `一只蝴蝶形状的可爱面包，两对张开的翅膀上撒着彩色糖珠，${STYLE}`,
  cat:       `一只小猫脸形状的可爱面包，圆脸上两只小尖耳朵，用巧克力线条画出三根胡须和笑脸，${STYLE}`,
  rabbit:    `一只兔子形状的可爱面包，两只长长的耳朵竖起来，圆圆的身子和小尾巴，${STYLE}`,
  crab:      `一只螃蟹形状的可爱面包，圆身子配两只大钳子和八条小腿，${STYLE}`,
  elephant:  `一只大象形状的可爱面包，长鼻子卷起来，两只大耳朵像扇子，${STYLE}`,
  snail:     `一个蜗牛卷形状的可爱面包，一圈一圈的螺旋卷酥皮，前面伸出两根小触角，${STYLE}`,
  heart:     `一个爱心形状的可爱面包，圆鼓鼓的心形，表面刷了亮亮的糖浆，${STYLE}`,
  car:       `一辆小汽车形状的可爱面包，四个圆圆的轮子和一扇小车窗，${STYLE}`,
  crown:     `一顶皇冠形状的可爱小蛋糕面包，一排尖尖的小角，每个尖上点着红色果酱当宝石，${STYLE}`,
  bear:      `一只小熊脸形状的可爱面包，圆脑袋上两只圆耳朵，用黑芝麻做眼睛和鼻子，${STYLE}`,
};

let ok = 0, skip = 0, fail = 0;
for (const [key, prompt] of Object.entries(ICONS)) {
  const out = path.join(OUT, `${key}.png`);
  if (exists(out)) { skip++; console.log(`  ⏭  ${key}`); continue; }
  const tmp = path.join(OUT, `${key}_tmp.png`);
  let done = false;
  for (let i = 1; i <= 3 && !done; i++) {
    try {
      await generate(prompt, tmp, '2048x2048');
      execFileSync('magick', [tmp, '-alpha', 'set', '-bordercolor', '#00FF00', '-border', '1',
        '-fuzz', '28%', '-fill', 'none', '-draw', 'alpha 0,0 floodfill',
        '-fuzz', '12%', '-transparent', '#00FF00', '-shave', '1x1', '-trim', '+repage',
        '-resize', '320x320', out]);
      fs.unlinkSync(tmp); ok++; done = true; console.log(`  ✅ ${key}`);
    } catch (e) {
      console.log(`  ⚠️  ${key} 第${i}次: ${e.message.slice(0, 110)}`);
      if (i === 3) fail++; else await sleep(3500 * i);
    }
  }
  await sleep(1200);
}
console.log(`\n完成: ✅${ok} ⏭${skip} ❌${fail}`);
