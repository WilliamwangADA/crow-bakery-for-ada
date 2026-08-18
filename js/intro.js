/* =====================================================================
   片头动画：多镜头蒙太奇 + 缓慢运镜 + 光斑/叶片 + 标题浮现
   纯 CSS/JS，无视频文件，iPad 秒开、离线可放。
   （Seedance 开通后可换成 <video>，把 playIntro 内部替换即可）
   ===================================================================== */
const Intro = (() => {
  // 镜头表：[插画, 运镜, 停留毫秒, 字幕, 旁白]
  const SHOTS = [
    { img: 's01_tree',     move: 'push',       ms: 3800, cap: '在很远很远的森林里……',     v: 'intro_1' },
    { img: 's02_inside',   move: 'pan-right',  ms: 3400, cap: '有一家开在大树里的面包店',   v: 'intro_2' },
    { img: 's03_babies',   move: 'push-slow',  ms: 3400, cap: '四只小乌鸦出生啦',           v: 'intro_3' },
    { img: 's14_many',     move: 'pan-left',   ms: 3600, cap: '还有好多好多好玩的面包',     v: 'intro_4' },
    { img: 's28_finale',   move: 'pull',       ms: 4200, cap: '',                          v: 'intro_5' },
  ];

  let timer = null, onDone = null, killed = false;
  let narr = null, music = null;

  /* 轻柔背景音乐：用 WebAudio 现场合成一小段温暖的琶音（无需音频文件） */
  function startMusic() {
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      const ctx = new AC();
      if (ctx.state === 'suspended') ctx.resume();
      const master = ctx.createGain();
      master.gain.value = 0;
      master.gain.linearRampToValueAtTime(0.16, ctx.currentTime + 1.6);
      master.connect(ctx.destination);

      // 柔和的木琴式音色
      const NOTES = [523.25, 659.25, 783.99, 1046.50, 783.99, 659.25];  // C E G C G E
      let i = 0, stopped = false;
      const tick = () => {
        if (stopped || killed) return;
        const t = ctx.currentTime;
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.type = 'triangle';
        o.frequency.value = NOTES[i % NOTES.length] / 2;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.5, t + 0.05);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 1.5);
        o.connect(g).connect(master);
        o.start(t); o.stop(t + 1.6);
        i++;
      };
      tick();
      const iv = setInterval(tick, 900);
      music = {
        fadeOut() {
          stopped = true; clearInterval(iv);
          try {
            master.gain.cancelScheduledValues(ctx.currentTime);
            master.gain.setValueAtTime(master.gain.value, ctx.currentTime);
            master.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + 0.8);
            setTimeout(() => ctx.close().catch(() => {}), 1000);
          } catch {}
        },
      };
    } catch {}
  }

  function say(id) {
    try {
      if (narr) { narr.pause(); narr.currentTime = 0; }
      narr = new Audio(`assets/audio/${id}.mp3`);
      narr.volume = 1;
      narr.play().catch(() => {
        // iOS 未解锁时回落到系统朗读
        const line = window.VOICE_LINES && VOICE_LINES[id];
        if (line && window.speechSynthesis) {
          const u = new SpeechSynthesisUtterance(line);
          u.lang = 'zh-CN'; u.rate = 0.85; speechSynthesis.speak(u);
        }
      });
    } catch {}
  }

  function stop() {
    killed = true;
    if (timer) { clearTimeout(timer); timer = null; }
    if (narr) { narr.pause(); narr.currentTime = 0; narr = null; }
    if (window.speechSynthesis) speechSynthesis.cancel();
    if (music) { music.fadeOut(); music = null; }
  }

  function play(stage, done) {
    killed = false; onDone = done;

    const wrap = document.createElement('div');
    wrap.className = 'intro';
    wrap.innerHTML = `
      <div class="intro-stage"></div>
      <div class="intro-cap"></div>
      <div class="intro-title">
        <h1>乌鸦面包店</h1>
        <p>一个开在大树上的、香喷喷的森林故事</p>
      </div>
      <div class="intro-skip">跳过 ▸</div>
      <div class="intro-vig"></div>
      <div class="intro-gate">
        <img class="gate-poster" src="assets/scenes/s01_tree.jpg" alt="">
        <div class="gate-inner">
          <div class="gate-icon">🔊</div>
          <div class="gate-text">轻轻点一下，故事开始啦</div>
        </div>
      </div>`;
    stage.innerHTML = '';
    stage.appendChild(wrap);

    const shotBox = wrap.querySelector('.intro-stage');
    const capBox  = wrap.querySelector('.intro-cap');
    const titleEl = wrap.querySelector('.intro-title');
    const skipBtn = wrap.querySelector('.intro-skip');
    const gate    = wrap.querySelector('.intro-gate');

    // 预加载所有镜头与旁白，避免中途黑屏/断音
    SHOTS.forEach(s => {
      new Image().src = `assets/scenes/${s.img}.jpg`;
      if (s.v) { const a = new Audio(); a.preload = 'auto'; a.src = `assets/audio/${s.v}.mp3`; }
    });

    // 飘落的小光点（面包屑/阳光尘埃）
    for (let i = 0; i < 14; i++) {
      const d = document.createElement('i');
      d.className = 'mote';
      d.style.left = `${Math.random() * 100}%`;
      d.style.animationDelay = `${Math.random() * 8}s`;
      d.style.animationDuration = `${7 + Math.random() * 7}s`;
      d.style.setProperty('--s', `${0.5 + Math.random() * 1.1}`);
      wrap.appendChild(d);
    }

    const finish = () => { if (killed) return; stop(); wrap.classList.add('fade-out'); setTimeout(() => onDone && onDone(), 620); };
    skipBtn.onclick = e => { e.stopPropagation(); finish(); };

    // iOS/iPad 必须有用户手势才允许出声：轻点后才开始播
    const begin = () => {
      gate.classList.add('gone');
      setTimeout(() => gate.remove(), 500);
      startMusic();
      nextShot();
    };
    gate.addEventListener('pointerdown', e => { e.stopPropagation(); begin(); }, { once: true });

    let i = 0;
    function nextShot() {
      if (killed) return;
      if (i >= SHOTS.length) { finish(); return; }
      const s = SHOTS[i];

      const layer = document.createElement('div');
      layer.className = `shot ${s.move}`;
      const im = document.createElement('img');
      im.src = `assets/scenes/${s.img}.jpg`;
      im.decoding = 'async';
      layer.appendChild(im);
      shotBox.appendChild(layer);
      requestAnimationFrame(() => layer.classList.add('in'));

      // 上一个镜头淡出并移除，始终只留 2 层
      const prev = shotBox.children[shotBox.children.length - 2];
      if (prev) { prev.classList.add('out'); setTimeout(() => prev.remove(), 1300); }

      capBox.textContent = s.cap || '';
      capBox.classList.toggle('show', !!s.cap);
      if (s.v) say(s.v);

      // 最后一个镜头浮出标题
      if (i === SHOTS.length - 1) setTimeout(() => titleEl.classList.add('show'), 700);

      i++;
      timer = setTimeout(nextShot, s.ms);
    }
  }

  return { play, stop };
})();
