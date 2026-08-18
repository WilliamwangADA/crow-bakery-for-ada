/* 从 js/story-data.js 导出配音清单 → tools/voice_manifest.json */
import fs from 'node:fs';
const src = fs.readFileSync('js/story-data.js', 'utf8');
const mod = new Function(src + '; return { COMPANIONS, STORY };')();
const { COMPANIONS, STORY } = mod;
const out = {};
for (const [id, n] of Object.entries(STORY)) {
  if (n.text) {
    if (n.c) for (const c of COMPANIONS) out[`${id}_${c.id}`] = n.text.replace(/\{C\}/g, c.name);
    else out[id] = n.text;
  }
  if (n.choice) {
    const q = n.choice.q;
    if (/\{C\}/.test(q)) for (const c of COMPANIONS) out[`q_${id}_${c.id}`] = q.replace(/\{C\}/g, c.name);
    else out[`q_${id}`] = q;
  }
}
out['the_end'] = '故事讲完啦。想再听一遍吗？点一下那本小书就好啦。';
fs.writeFileSync('tools/voice_manifest.json', JSON.stringify(out, null, 2));
fs.writeFileSync('js/voice_lines.js', 'window.VOICE_LINES = ' + JSON.stringify(out, null, 2) + ';\n');
console.log('条目数:', Object.keys(out).length);
