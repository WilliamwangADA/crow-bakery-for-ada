/* =====================================================================
   片头动画：多镜头蒙太奇 + 缓慢运镜 + 光斑/叶片 + 标题浮现
   纯 CSS/JS，无视频文件，iPad 秒开、离线可放。
   （Seedance 开通后可换成 <video>，把 playIntro 内部替换即可）
   ===================================================================== */
const Intro = (() => {
  // 镜头表：[插画, 运镜, 停留毫秒, 字幕]
  const SHOTS = [
    { img: 's01_tree',     move: 'push',       ms: 3600, cap: '在很远很远的森林里……' },
    { img: 's02_inside',   move: 'pan-right',  ms: 3000, cap: '有一家开在大树里的面包店' },
    { img: 's03_babies',   move: 'push-slow',  ms: 3000, cap: '四只小乌鸦出生啦' },
    { img: 's14_many',     move: 'pan-left',   ms: 3000, cap: '还有好多好多好玩的面包' },
    { img: 's28_finale',   move: 'pull',       ms: 3200, cap: '' },
  ];

  let timer = null, onDone = null, killed = false;

  function stop() {
    killed = true;
    if (timer) { clearTimeout(timer); timer = null; }
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
      <div class="intro-vig"></div>`;
    stage.innerHTML = '';
    stage.appendChild(wrap);

    const shotBox = wrap.querySelector('.intro-stage');
    const capBox  = wrap.querySelector('.intro-cap');
    const titleEl = wrap.querySelector('.intro-title');
    const skipBtn = wrap.querySelector('.intro-skip');

    // 预加载所有镜头，避免中途黑屏
    SHOTS.forEach(s => { new Image().src = `assets/scenes/${s.img}.jpg`; });

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

      // 最后一个镜头浮出标题
      if (i === SHOTS.length - 1) setTimeout(() => titleEl.classList.add('show'), 700);

      i++;
      timer = setTimeout(nextShot, s.ms);
    }
    nextShot();
  }

  return { play, stop };
})();
