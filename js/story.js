/* =====================================================================
   故事引擎：整页插画 + 旁白配音 + 分支选择
   ===================================================================== */
const stage = document.getElementById('stage');
const el = (t, c, h) => { const e = document.createElement(t); if (c) e.className = c; if (h != null) e.innerHTML = h; return e; };
const SC = id => `assets/scenes/${id}.jpg`;

let companion = null;           // 当前选的小伙伴对象
let currentAudio = null;
let visited = [];               // 走过的节点，供"上一页"

/* ---- 配音 ---- */
function playVoice(id) {
  stopVoice();
  const a = new Audio(`assets/audio/${id}.mp3`);
  currentAudio = a;
  a.play().catch(() => speak(id));
  return a;
}
function stopVoice() { if (currentAudio) { currentAudio.pause(); currentAudio.currentTime = 0; currentAudio = null; } if (window.speechSynthesis) speechSynthesis.cancel(); }
function speak(id) {
  const line = window.VOICE_LINES && VOICE_LINES[id];
  if (!line || !window.speechSynthesis) return;
  const u = new SpeechSynthesisUtterance(line);
  u.lang = 'zh-CN'; u.rate = 0.88; speechSynthesis.speak(u);
}

/* ---- 轻音效 ---- */
const Sfx = (() => {
  let ctx = null;
  const ac = () => (ctx = ctx || new (window.AudioContext || window.webkitAudioContext)());
  const tone = (f, d, type = 'sine', v = 0.15, w = 0) => {
    const c = ac(), o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.value = f;
    g.gain.setValueAtTime(v, c.currentTime + w);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + w + d);
    o.connect(g).connect(c.destination); o.start(c.currentTime + w); o.stop(c.currentTime + w + d);
  };
  return {
    page() { tone(520, 0.08, 'sine', 0.1); },
    pick() { tone(660, 0.12, 'triangle', 0.16); tone(990, 0.14, 'triangle', 0.1, 0.08); },
    start() { [523, 659, 784].forEach((f, i) => tone(f, 0.25, 'triangle', 0.14, i * 0.1)); },
  };
})();

/* ---- 文本里的 {C} 替换 ---- */
const fill = t => t.replace(/\{C\}/g, companion ? companion.name : '小乌鸦');
/* ---- 该节点的配音 id（带 {C} 的用伙伴变体）---- */
const voiceOf = (id, node) => (node.c && companion) ? `${id}_${companion.id}` : id;

/* =========== 封面 =========== */
function showTitle() {
  stage.innerHTML = '';
  const sc = el('div', 'page');
  const bg = el('img', 'bg'); bg.src = SC('s01_forest');
  const veil = el('div', 'title-veil');
  const box = el('div', 'title-box',
    `<h1>乌鸦面包店</h1><p class="sub">一个香喷喷的森林故事</p>`);
  const btn = el('div', 'big-btn', '开始讲故事 🥐');
  btn.onclick = () => { Sfx.start(); visited = []; go('n01'); };
  box.append(btn);
  sc.append(bg, veil, box);
  stage.append(sc);
}

/* =========== 渲染一个节点 =========== */
function go(id) {
  const node = STORY[id];
  if (!node) return showTitle();
  visited.push(id);
  stage.innerHTML = '';

  const page = el('div', 'page' + (node.text ? ' with-text' : ''));
  const art = el('div', 'art');
  const bg = el('img', 'bg'); bg.src = SC(node.scene);
  art.append(bg, el('div', 'vignette'));

  // 小伙伴徽章
  if (companion) {
    const badge = el('div', 'companion-badge', `<img src="assets/companions/${companion.id}.png" alt=""><span>${companion.name}</span>`);
    art.append(badge);
  }
  page.append(art);

  // 旁白文字（画面下方独立文字条，不遮挡插画）
  if (node.text) {
    const panel = el('div', 'narration');
    const p = el('p', '', fill(node.text));
    panel.append(p);
    const replay = el('div', 'replay-btn', '🔊');
    replay.onclick = e => { e.stopPropagation(); playVoice(voiceOf(id, node)); };
    panel.append(replay);
    page.append(panel);
    playVoice(voiceOf(id, node));
  }

  // 选择题 or 继续
  if (node.choice) {
    const delay = node.text ? 1200 : 0;
    setTimeout(() => showChoice(page, id, node), delay);
  } else {
    const tapHint = el('div', 'tap-hint', '轻轻点一下，翻到下一页 👉');
    art.append(tapHint);
    page.onclick = () => {
      Sfx.page();
      stopVoice();
      node.next ? go(node.next) : showEnd();
    };
  }

  // 返回上一页（小按钮，不打断）
  if (visited.length > 1) {
    const back = el('div', 'back-btn', '↩');
    back.onclick = e => { e.stopPropagation(); Sfx.page(); stopVoice(); visited.pop(); go(visited.pop()); };
    page.append(back);
  }

  stage.append(page);
}

/* =========== 选择面板 =========== */
function showChoice(page, id, node) {
  const ch = node.choice;
  const wrap = el('div', 'choice-wrap pop');
  wrap.append(el('div', 'choice-q', fill(ch.q)));
  const row = el('div', 'choice-row');

  ch.options.forEach((opt, i) => {
    const card = el('div', 'choice-card');
    if (ch.pick === 'companion') {
      const c = COMPANIONS.find(x => x.id === opt.companion);
      card.innerHTML = `<img src="assets/companions/${c.id}.png" alt=""><span>${c.name}</span>`;
      card.style.setProperty('--accent', c.color);
    } else {
      card.innerHTML = `<div class="emo">${opt.emoji}</div><span>${opt.label}</span>`;
    }
    card.style.animationDelay = `${i * 0.09}s`;
    card.onclick = e => {
      e.stopPropagation();
      Sfx.pick(); stopVoice();
      if (opt.companion) companion = COMPANIONS.find(x => x.id === opt.companion);
      go(opt.next);
    };
    row.append(card);
  });

  wrap.append(row);
  page.append(wrap);
  page.onclick = null;
  playVoice(`q_${id}`);
}

/* =========== 结尾 =========== */
function showEnd() {
  stage.innerHTML = '';
  const page = el('div', 'page');
  const bg = el('img', 'bg'); bg.src = SC('s17_night');
  page.append(bg, el('div', 'title-veil'));
  const box = el('div', 'title-box', `<h1>故事讲完啦</h1><p class="sub">晚安，Ada 🌙</p>`);
  const again = el('div', 'big-btn', '再讲一遍 📖');
  again.onclick = () => { Sfx.start(); companion = null; visited = []; go('n01'); };
  box.append(again);
  page.append(box);
  stage.append(page);
  playVoice('the_end');
}

/* 调试：?node=n18 直接跳页（默认给个伙伴，避免 {C} 空着） */
const _q = new URLSearchParams(location.search).get('node');
if (_q && STORY[_q]) { companion = COMPANIONS[0]; go(_q); }
else showTitle();
