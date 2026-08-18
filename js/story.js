/* =====================================================================
   故事引擎：整页插画 + 旁白配音 + 分支选择
   ===================================================================== */
const stage = document.getElementById('stage');
const el = (t, c, h) => { const e = document.createElement(t); if (c) e.className = c; if (h != null) e.innerHTML = h; return e; };
const SC = id => `assets/scenes/${id}.jpg`;

/* 插画缺失时的临时替身（图片加载失败才启用；补齐原图后自动恢复，无需改代码） */
const FALLBACK = {
  s23a_show: 's22_fire_crows', s23b_smell: 's22_fire_crows', s23c_offer: 's22_fire_crows',
  s24_laugh: 's16a_song', s25_storm: 's06_empty', s26a_rope: 's19_bend',
  s26b_shelter: 's02_inside', s26c_rescue: 's14_many', s27_rainbow: 's01_tree',
  s28_finale: 's16a_song', s29_night: 's09_owl',
  // v3 新增章节
  s30a_sign: 's01_tree', s30b_sign: 's01_tree', s30c_sign: 's01_tree',
  s31_manager: 's02_inside', s32_soldout: 's02_inside',
  s33a_deliver: 's20c_basket', s33b_deliver: 's17_sparrows', s33c_deliver: 's15_oriole',
  s34a_hedge: 's09_owl', s34b_hedge: 's02_inside', s34c_hedge: 's02_inside',
  s35_contest: 's16a_song', s36_trophy: 's16a_song', s37_wall: 's14_many',
};
// 20 种造型面包的插画若还没生成，统一回落到"满桌面包"那张
function fallbackOf(id) {
  if (FALLBACK[id]) return FALLBACK[id];
  if (/^b_/.test(id)) return 's14_many';
  return 's01_tree';
}
function setScene(img, id) {
  img.src = SC(id);
  img.onerror = () => { img.onerror = null; img.src = SC(fallbackOf(id)); };
}

let companion = null;           // 当前选的小伙伴对象
let currentAudio = null;
let visited = [];               // 走过的节点，供"上一页"
let made = [];                  // 这一趟做过的造型面包

/* ---- 进度存档：睡前没听完，下次接着讲 ---- */
const SAVE_KEY = 'crowStory.v2';
function saveProgress(id) {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify({ id, companion: companion && companion.id, visited, made })); } catch {}
}
function loadProgress() {
  try { return JSON.parse(localStorage.getItem(SAVE_KEY) || 'null'); } catch { return null; }
}
function clearProgress() { try { localStorage.removeItem(SAVE_KEY); } catch {} }

/* ---- 预加载下一页插画，翻页不闪白 ---- */
function preloadNext(node) {
  const ids = node.choice ? node.choice.options.map(o => o.next) : (node.next ? [node.next] : []);
  ids.forEach(nid => { const n = STORY[nid]; if (n && n.scene) new Image().src = SC(n.scene); });
}

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
/* ---- 该节点的配音 id（带 {C} 的用伙伴变体；tv 可指定复用别的配音）---- */
const voiceOf = (id, node) => (node.c && companion) ? `${id}_${companion.id}` : (node.tv || id);

/* =========== 封面 =========== */
function showTitle() {
  stage.innerHTML = '';
  const sc = el('div', 'page');
  const bg = el('img', 'bg'); setScene(bg, 's01_tree');
  const veil = el('div', 'title-veil');
  const box = el('div', 'title-box',
    `<h1>乌鸦面包店</h1><p class="sub">一个开在大树上的、香喷喷的森林故事</p>`);
  const btn = el('div', 'big-btn', '开始讲故事 🥐');
  btn.onclick = () => { Sfx.start(); clearProgress(); companion = null; visited = []; made = []; go('n01'); };
  box.append(btn);

  // 上次没听完 → 接着讲
  const save = loadProgress();
  if (save && save.id && STORY[save.id] && save.id !== 'n01') {
    const cont = el('div', 'small-btn', '接着上次讲 ▶');
    cont.onclick = () => {
      Sfx.start();
      companion = COMPANIONS.find(c => c.id === save.companion) || null;
      visited = Array.isArray(save.visited) ? save.visited.slice(0, -1) : [];
      made = Array.isArray(save.made) ? save.made : [];
      go(save.id);
    };
    box.append(cont);
  }
  sc.append(bg, veil, box);
  stage.append(sc);
}

/* =========== 渲染一个节点 =========== */
function go(id) {
  const node = STORY[id];
  if (!node) return showTitle();
  visited.push(id);
  if (node.made && !made.includes(node.made)) made.push(node.made);
  saveProgress(id);
  preloadNext(node);
  stage.innerHTML = '';

  const page = el('div', 'page' + (node.text ? ' with-text' : ''));
  // 细进度条（大约进度，给爸妈心里有数）
  const bar = el('div', 'progress'); const fillp = el('div', 'progress-fill');
  fillp.style.width = Math.min(100, visited.length / 60 * 100) + '%';
  bar.append(fillp); page.append(bar);
  const art = el('div', 'art');
  const bg = el('img', 'bg'); setScene(bg, node.scene);
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

  if (ch.grid) row.classList.add('grid');

  ch.options.forEach((opt, i) => {
    const card = el('div', 'choice-card');
    if (ch.pick === 'companion') {
      const c = COMPANIONS.find(x => x.id === opt.companion);
      card.innerHTML = `<img src="assets/companions/${c.id}.png" alt=""><span>${c.name}</span>`;
      card.style.setProperty('--accent', c.color);
    } else if (opt.icon) {
      // 面包图标；图还没生成时自动退回 emoji，不会显示裂图
      card.classList.add('bread-card');
      if (made.includes(opt.icon)) card.classList.add('done');
      const img = el('img'); img.src = `assets/breads/${opt.icon}.png`; img.alt = '';
      img.onerror = () => { img.replaceWith(el('div', 'emo', opt.emoji)); };
      card.append(img, el('span', '', opt.label));
    } else {
      card.innerHTML = `<div class="emo">${opt.emoji}</div><span>${opt.label}</span>`;
    }
    card.style.animationDelay = `${Math.min(i, 12) * 0.045}s`;
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
  playVoice(ch.qv || `q_${id}`);
}

/* =========== 结尾 =========== */
function showEnd() {
  stage.innerHTML = '';
  const page = el('div', 'page');
  const bg = el('img', 'bg'); setScene(bg, 's29_night');
  page.append(bg, el('div', 'title-veil'));
  const box = el('div', 'title-box', `<h1>故事讲完啦</h1><p class="sub">晚安，Ada 🌙</p>`);

  // 今天做过的面包，摆出来看看
  if (made.length) {
    const shelf = el('div', 'bread-shelf');
    shelf.append(el('div', 'shelf-title', `今天你一共做了 ${made.length} 种面包！`));
    const row = el('div', 'shelf-row');
    made.forEach(b => {
      const it = BREADS[b]; if (!it) return;
      row.append(el('div', 'shelf-item', `<span class="be">${it.emoji}</span><span class="bn">${it.name}</span>`));
    });
    shelf.append(row);
    box.append(shelf);
  }

  const again = el('div', 'big-btn', '再讲一遍 📖');
  again.onclick = () => { Sfx.start(); clearProgress(); companion = null; visited = []; made = []; go('n01'); };
  box.append(again);
  page.append(box);
  stage.append(page);
  playVoice('the_end');
}

/* 调试：?node=n18 直接跳页（默认给个伙伴，避免 {C} 空着） */
const _q = new URLSearchParams(location.search).get('node');
if (_q && STORY[_q]) { companion = COMPANIONS[0]; go(_q); }
else showTitle();
