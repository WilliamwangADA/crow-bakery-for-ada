/* 从 js/story-data.js 导出配音清单 → tools/voice_manifest.json + js/voice_lines.js
   支持复用：node.tv 指定复用别的正文配音；choice.qv 指定复用别的问题配音（多处共用同一句） */
import fs from 'node:fs';

const src = fs.readFileSync('js/story-data.js', 'utf8');
const { COMPANIONS, STORY } = new Function(src + '; return { COMPANIONS, STORY };')();

const out = {};
for (const [id, n] of Object.entries(STORY)) {
  if (n.text && !n.tv) {                       // tv 表示复用别处的配音，不再单独生成
    if (n.c) for (const c of COMPANIONS) out[`${id}_${c.id}`] = n.text.replace(/\{C\}/g, c.name);
    else out[id] = n.text;
  }
  if (n.choice) {
    const vid = n.choice.qv || `q_${id}`;      // qv 让多个节点共用一条问题配音
    const q = n.choice.q;
    if (/\{C\}/.test(q)) for (const c of COMPANIONS) out[`${vid}_${c.id}`] = q.replace(/\{C\}/g, c.name);
    else out[vid] = q;
  }
}
out['the_end'] = '故事讲完啦。想再听一遍吗？点一下那本小书就好啦。';

fs.writeFileSync('tools/voice_manifest.json', JSON.stringify(out, null, 2));
fs.writeFileSync('js/voice_lines.js', 'window.VOICE_LINES = ' + JSON.stringify(out, null, 2) + ';\n');
console.log('条目数:', Object.keys(out).length);
