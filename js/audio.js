/* ==== 语音（预生成MP3）+ 简单音效 ==== */
const Voice = (() => {
  const cache = {};
  let current = null;
  function play(id) {
    try {
      if (current) { current.pause(); current.currentTime = 0; }
      if (!cache[id]) cache[id] = new Audio(`assets/audio/${id}.mp3`);
      current = cache[id];
      current.play().catch(() => fallback(id));
      return current;
    } catch { fallback(id); }
  }
  function fallback(id) {
    if (!window.VOICE_LINES || !window.speechSynthesis) return;
    const line = VOICE_LINES[id]; if (!line) return;
    const u = new SpeechSynthesisUtterance(line);
    u.lang = 'zh-CN'; u.rate = 0.9; speechSynthesis.speak(u);
  }
  return { play };
})();

const Sfx = (() => {
  let ctx = null;
  const ac = () => (ctx = ctx || new (window.AudioContext || window.webkitAudioContext)());
  function tone(freq, dur, type = 'sine', vol = 0.18, when = 0) {
    const c = ac(), o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(vol, c.currentTime + when);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + when + dur);
    o.connect(g).connect(c.destination);
    o.start(c.currentTime + when); o.stop(c.currentTime + when + dur);
  }
  return {
    pop()  { tone(420, 0.09, 'sine', 0.22); tone(640, 0.07, 'sine', 0.14, 0.03); },
    ding() { tone(880, 0.35, 'triangle', 0.2); tone(1320, 0.3, 'triangle', 0.1, 0.02); },
    coin(i = 0) { tone(988 + i * 120, 0.18, 'square', 0.08, i * 0.16); },
    wrong() { tone(220, 0.25, 'sawtooth', 0.08); },
    siren() { for (let i = 0; i < 5; i++) { tone(700, 0.28, 'square', 0.06, i * 0.56); tone(520, 0.28, 'square', 0.06, i * 0.56 + 0.28); } },
    tada() { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.32, 'triangle', 0.16, i * 0.12)); },
  };
})();
