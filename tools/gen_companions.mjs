import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { generate } from './gen.mjs';
const BASE = '一只圆滚滚胖乎乎超级可爱的小乌鸦宝宝，头大身体圆的两头身，圆圆的白色大眼睛配棕色瞳孔，小小的黄色三角尖嘴，头顶有一撮翘起的呆毛，两条细细的小棍腿，开心地笑着，全身正面完整，1970年代日本经典儿童绘本手绘插画风格，水彩与彩色铅笔质感，深棕色朴拙手绘轮廓线，扁平不要3D渲染，主体居中不要接触画面边缘，背景是完全均匀的纯绿色#00FF00，背景绝对不要任何渐变光晕阴影';
const C = {
  choco: '它全身的羽毛是暖暖的巧克力褐色，' + BASE,
  apple: '它全身的羽毛是鲜艳的苹果红色，' + BASE,
  lemon: '它全身的羽毛是明亮的柠檬黄色，' + BASE,
  mochi: '它全身的羽毛是雪白色，' + BASE,
};
for (const [k, p] of Object.entries(C)) {
  const tmp = `assets/companions/${k}_tmp.png`;
  try {
    await generate(p, tmp, '2048x2048', { ref: 'tools/ref/char_sheet.png' });
    execFileSync('magick', [tmp, '-alpha','set','-bordercolor','#00FF00','-border','1',
      '-fuzz','30%','-fill','none','-draw','alpha 0,0 floodfill',
      '-fuzz','12%','-transparent','#00FF00','-shave','1x1','-trim','+repage','-resize','320x320',
      `assets/companions/${k}.png`]);
    fs.unlinkSync(tmp); console.log('✅ ' + k);
  } catch (e) { console.log('❌ ' + k + ': ' + e.message.slice(0,120)); }
  await new Promise(r => setTimeout(r, 1200));
}
