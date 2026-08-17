/* =====================================================================
   乌鸦面包店 · 给 Ada 的烘焙经营小游戏
   场景：title → intro → hub → workshop(模具/揉面/烤炉) → shop(卖面包) → wall(图鉴)
   ===================================================================== */
const stage = document.getElementById('stage');
const $ = sel => stage.querySelector(sel);
const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
const breadOf = id => BREADS.find(b => b.id === id);
const rand = arr => arr[Math.floor(Math.random() * arr.length)];

function coinbar() {
  const c = el('div', '', `<img src="${S('coin')}" alt=""><span id="coin-num">${G.coins}</span>`);
  c.id = 'coinbar'; return c;
}
function refreshCoins() { const n = document.getElementById('coin-num'); if (n) n.textContent = G.coins; }
function backBtn(to) { const b = el('div', 'btn back-btn', '🏠'); b.onclick = () => { Sfx.pop(); go(to); }; return b; }

/* ---------- 场景路由 ---------- */
const scenes = {};
function go(name, arg) { stage.innerHTML = ''; scenes[name](arg); }

/* ---------- 标题 ---------- */
scenes.title = () => {
  const sc = el('div', 'scene');
  sc.append(el('img', 'bg')); sc.querySelector('.bg').src = BGI('bg_street');
  sc.append(el('div', 'game-title', '乌鸦面包店'));
  ['choco','apple','lemon','mochi'].forEach((id, i) => {
    const img = el('img', 'sprite bob'); img.src = S(id);
    Object.assign(img.style, { width: '15vmin', height: '17vmin', bottom: '19vmin', left: `${13 + i * 20}%`, animationDelay: `${i * 0.3}s` });
    sc.append(img);
  });
  const start = el('div', 'btn big-btn', '开门喽！');
  start.onclick = () => { Sfx.tada(); G.introDone ? (Voice.play('title'), go('hub')) : go('intro'); };
  sc.append(start);
  stage.append(sc);
};

/* ---------- 开场剧情（首次） ---------- */
scenes.intro = () => {
  const slides = [
    { v: 'intro1', bg: 'bg_street', sprites: ['papa', 'mama'] },
    { v: 'intro2', bg: 'bg_shop', sprites: ['choco', 'apple', 'lemon', 'mochi'] },
    { v: 'intro3', bg: 'bg_shop', sprites: ['papa', 'mama', 'mochi'] },
  ];
  let i = 0;
  const sc = el('div', 'scene'); stage.append(sc);
  function show() {
    if (i >= slides.length) { G.introDone = true; saveGame(); go('hub'); return; }
    const s = slides[i]; sc.innerHTML = '';
    const bg = el('img', 'bg'); bg.src = BGI(s.bg); sc.append(bg);
    s.sprites.forEach((id, k) => {
      const img = el('img', 'sprite bob'); img.src = S(id);
      const w = (id === 'papa' || id === 'mama') ? 22 : 14;
      Object.assign(img.style, { width: `${w}vmin`, height: `${w + 2}vmin`, bottom: '22vmin', left: `${30 + k * 16}%`, animationDelay: `${k * 0.25}s` });
      sc.append(img);
    });
    sc.append(el('div', 'story-text', VOICE_LINES[s.v] + '<br><span style="font-size:3vmin;color:#b06a10">👆 点一下继续</span>'));
    Voice.play(s.v);
    sc.onclick = () => { Sfx.pop(); i++; show(); };
  }
  show();
};

/* ---------- 大厅 ---------- */
scenes.hub = () => {
  const sc = el('div', 'scene');
  const bg = el('img', 'bg'); bg.src = BGI('bg_shop'); sc.append(bg, coinbar());
  const btns = [
    { t: '做面包', icon: 'dough_gold', go: 'workshop', left: '14%' },
    { t: '开店啦', icon: 'coin', go: 'shop', left: '50%' },
    { t: '面包墙', icon: 'b_star', go: 'wall', left: '86%' },
  ];
  btns.forEach(b => {
    const d = el('div', 'btn hub-btn', `<img src="${S(b.icon)}" alt=""><span>${b.t}</span>`);
    Object.assign(d.style, { left: b.left, top: '55%', transform: 'translate(-50%,-50%)' });
    d.onclick = () => { Sfx.pop(); go(b.go); };
    sc.append(d);
  });
  const mama = el('img', 'sprite bob'); mama.src = S('mama');
  Object.assign(mama.style, { width: '20vmin', height: '22vmin', bottom: '3vmin', left: '3%' });
  sc.append(mama);
  stage.append(sc);
  Voice.play('hub');
};

/* ---------- 工坊：选模具 ---------- */
scenes.workshop = () => {
  const sc = el('div', 'scene');
  const bg = el('img', 'bg'); bg.src = BGI('bg_shop'); sc.append(bg, coinbar(), backBtn('hub'));
  sc.append(el('div', 'scene-title', '选一个模具吧'));
  const grid = el('div', 'mold-grid');
  BREADS.forEach(b => {
    const owned = G.molds.includes(b.id);
    const cell = el('div', 'mold-cell' + (owned ? '' : ' locked'),
      `<img src="${S(b.id)}" alt=""><span class="mname">${b.name}</span>` +
      (owned ? '' : `<span class="price"><img src="${S('coin')}" alt="">${b.cost}</span>`));
    cell.onclick = () => {
      if (owned) { Sfx.pop(); go('knead', b.id); }
      else if (G.coins >= b.cost) {
        G.coins -= b.cost; G.molds.push(b.id); saveGame(); refreshCoins();
        Sfx.tada(); Voice.play('mold_new'); go('workshop');
      } else { Sfx.wrong(); Voice.play('no_coin'); }
    };
    grid.append(cell);
  });
  sc.append(grid); stage.append(sc);
  Voice.play('mold');
};

/* ---------- 工坊：揉面 ---------- */
scenes.knead = breadId => {
  const sc = el('div', 'scene');
  const bg = el('img', 'bg'); bg.src = BGI('bg_shop'); sc.append(bg, backBtn('workshop'));
  sc.append(el('div', 'scene-title', '揉呀揉，捏呀捏'));
  const dough = el('div', 'dough', `<img src="${S('dough_raw')}" alt="">`);
  sc.append(dough); stage.append(sc);
  Voice.play('knead');
  let taps = 0;
  dough.onpointerdown = () => {
    Sfx.pop(); taps++;
    dough.classList.remove('squishing'); void dough.offsetWidth; dough.classList.add('squishing');
    dough.style.transform = `translate(-50%,-50%) scale(${1 + taps * 0.06})`;
    if (taps >= 5) { dough.onpointerdown = null; setTimeout(() => go('bake', breadId), 400); }
  };
};

/* ---------- 工坊：烤炉火候 ---------- */
scenes.bake = breadId => {
  const sc = el('div', 'scene');
  const bg = el('img', 'bg'); bg.src = BGI('bg_shop'); sc.append(bg);
  sc.append(el('div', 'oven-glow'), el('div', 'scene-title', '金黄的时候喊它出炉！'));
  const dough = el('div', 'dough', `<img src="${S('dough_raw')}" alt="">`);
  const barWrap = el('div', 'oven-bar'); const fill = el('div', 'oven-fill'); barWrap.append(fill);
  const btn = el('div', 'btn big-btn', '出炉！');
  sc.append(dough, barWrap, btn); stage.append(sc);
  Voice.play('oven_in');

  const GOLD_FROM = 4500, GOLD_TO = 8000, BURNT_AT = 9500;
  const t0 = performance.now();
  let done = false;
  const img = dough.querySelector('img');
  const timer = setInterval(() => {
    const t = performance.now() - t0;
    fill.style.width = Math.min(100, t / BURNT_AT * 100) + '%';
    if (t >= GOLD_FROM && t < GOLD_TO) img.src = S('dough_gold');
    else if (t >= GOLD_TO) img.src = S('dough_burnt');
    if (t >= BURNT_AT && !done) finish('burnt');
  }, 100);
  btn.onclick = () => {
    if (done) return;
    const t = performance.now() - t0;
    finish(t < GOLD_FROM ? 'early' : t < GOLD_TO ? 'perfect' : 'burnt');
  };
  function finish(result) {
    if (result === 'early') { Sfx.wrong(); Voice.play('early'); return; } // 没关系，继续烤
    done = true; clearInterval(timer);
    if (result === 'perfect') {
      Sfx.ding();
      img.src = S(breadId); dough.classList.add('hop');
      const isNew = !G.found.includes(breadId);
      if (isNew) G.found.push(breadId);
      G.inv[breadId] = (G.inv[breadId] || 0) + 1; saveGame();
      Voice.play('perfect');
      setTimeout(() => {
        if (isNew) { Sfx.tada(); Voice.play('new_bread'); setTimeout(() => go('wall'), 2600); }
        else go('workshop');
      }, 2000);
    } else {
      img.src = S('dough_burnt'); Voice.play('burnt');
      setTimeout(() => {
        // 焦面包不浪费：小伙伴来吃，送1金币
        const basket = el('img', 'sprite pop-in'); basket.src = S('snack_basket');
        Object.assign(basket.style, { width: '22vmin', height: '20vmin', bottom: '18vmin', left: '62%' });
        const friend = el('img', 'sprite hop'); friend.src = S(rand(['cust1','cust2','cust3']));
        Object.assign(friend.style, { width: '14vmin', height: '16vmin', bottom: '18vmin', left: '76%' });
        sc.append(basket, friend);
        Voice.play('snack'); Sfx.coin(0);
        G.coins += 1; saveGame(); refreshCoins();
        setTimeout(() => go('workshop'), 4200);
      }, 2200);
    }
  }
};

/* ---------- 开店卖面包 ---------- */
scenes.shop = () => {
  const stock = Object.entries(G.inv).filter(([, n]) => n > 0);
  if (!stock.length) { Voice.play('no_bread'); go('workshop'); return; }

  const sc = el('div', 'scene');
  const bg = el('img', 'bg'); bg.src = BGI('bg_street'); sc.append(bg, coinbar(), backBtn('hub'));
  sc.append(el('div', 'scene-title', '客人来啦！'));
  const tray = el('div', 'tray'); sc.append(tray); stage.append(sc);
  Voice.play('shop_open');

  let selected = null, servedToday = 0, crowdShown = false;
  const DAY_GOAL = 6;

  function refreshTray() {
    tray.innerHTML = '';
    Object.entries(G.inv).filter(([, n]) => n > 0).forEach(([id, n]) => {
      const it = el('div', 'tray-item', `<img src="${S(id)}" alt=""><span class="cnt">${n}</span>`);
      it.dataset.bread = id;
      it.onclick = () => {
        Sfx.pop();
        tray.querySelectorAll('.tray-item').forEach(x => x.classList.remove('selected'));
        if (selected === id) { selected = null; } else { selected = id; it.classList.add('selected'); }
      };
      tray.append(it);
    });
    if (!tray.children.length) setTimeout(() => { Voice.play('no_bread'); go('workshop'); }, 800);
  }

  const slots = ['14%', '40%', '66%'];
  const busy = [false, false, false];
  function spawnCustomer(slot) {
    const wantPool = Object.keys(G.inv).filter(id => G.inv[id] > 0);
    if (!wantPool.length) return;
    busy[slot] = true;
    const want = rand(wantPool);
    const c = el('div', 'customer pop-in',
      `<div class="bubble"><img src="${S(want)}" alt=""></div><img class="body" src="${S(rand(CUSTOMERS))}" alt="">`);
    c.style.left = slots[slot]; c.dataset.want = want;
    c.onclick = () => {
      if (!selected) return;
      if (selected === c.dataset.want) serve(c, slot);
      else { Sfx.wrong(); Voice.play('serve_wrong'); }
    };
    sc.insertBefore(c, tray);
  }
  function serve(c, slot) {
    const id = selected;
    G.inv[id]--; selected = null; saveGame(); refreshTray();
    c.querySelector('.body').classList.add('hop');
    c.querySelector('.bubble').innerHTML = '💛';
    const pay = 1 + Math.floor(Math.random() * 3);
    for (let i = 0; i < pay; i++) {
      Sfx.coin(i);
      const coin = el('img', 'coin-fly'); coin.src = S('coin');
      coin.style.left = `calc(${c.style.left} + ${6 + i * 4}vmin)`; coin.style.bottom = '40vmin';
      coin.style.animationDelay = `${i * 0.18}s`;
      sc.append(coin); setTimeout(() => coin.remove(), 1400);
    }
    Voice.play('c' + pay);
    G.coins += pay; G.served++; servedToday++; saveGame();
    setTimeout(refreshCoins, 600);
    setTimeout(() => { c.remove(); busy[slot] = false; tick(); }, 1600);
    if (servedToday === 3 && !crowdShown) { crowdShown = true; setTimeout(crowdEvent, 1800); }
    if (servedToday >= DAY_GOAL) setTimeout(dayEnd, 2600);
  }
  function crowdEvent() {
    // 绘本名场面：排起长队，消防车呜哇呜哇来看热闹
    Sfx.siren(); Voice.play('crowd');
    sc.append(el('div', 'red-flash'));
    for (let i = 0; i < 5; i++) {
      const f = el('img', 'sprite pop-in'); f.src = S(rand(CUSTOMERS));
      Object.assign(f.style, { width: '9vmin', height: '10vmin', bottom: '22vmin', right: `${2 + i * 7}vmin`, animationDelay: `${i * 0.2}s` });
      sc.append(f);
    }
  }
  function dayEnd() {
    Sfx.tada(); Voice.play('day_end');
    setTimeout(() => go('hub'), 3200);
  }
  function tick() {
    if (servedToday >= DAY_GOAL) return;
    const free = busy.findIndex(b => !b);
    if (free >= 0 && Object.values(G.inv).some(n => n > 0)) setTimeout(() => spawnCustomer(free), 500 + Math.random() * 900);
  }
  refreshTray();
  spawnCustomer(0);
  setTimeout(() => tick(), 2200);
  setTimeout(() => tick(), 4200);
};

/* ---------- 面包图鉴墙 ---------- */
scenes.wall = () => {
  const sc = el('div', 'scene');
  const bg = el('img', 'bg'); bg.src = BGI('bg_shop'); sc.append(bg, backBtn('hub'));
  sc.append(el('div', 'scene-title', '我们的面包墙'));
  const wall = el('div', 'wall');
  BREADS.forEach(b => {
    const known = G.found.includes(b.id);
    wall.append(el('div', 'wall-cell' + (known ? '' : ' unknown'),
      `<img src="${S(b.id)}" alt=""><span class="wname">${known ? b.name : '？？？'}</span>`));
  });
  sc.append(wall); stage.append(sc);
  Voice.play('gallery');
};

/* ---------- 启动（?scene=xxx 供调试直达场景，?give=1 塞测试面包） ---------- */
const qs = new URLSearchParams(location.search);
if (qs.get('give')) { G.inv = { b_croissant: 2, b_dino: 1, b_star: 1 }; G.found = ['b_croissant', 'b_dino', 'b_star']; }
const dbgScene = qs.get('scene');
go(dbgScene && scenes[dbgScene] ? dbgScene : 'title', qs.get('arg') || undefined);
