/* Service Worker v3（互动绘本 · iPad 优化）
   - html/js/css：网络优先（改版立刻生效，离线回落缓存）
   - 图片/音频：缓存优先（秒开、离线可听）
   - 安装后后台静默预缓存全部素材 → iPad 上第二次打开完全离线可用 */
const CACHE = 'crow-story-v3';
const isDoc = url => /\.(html|js|css|json)$/.test(url) || url.endsWith('/');

// 首屏必需，install 阶段就缓存
const CORE = [
  './', 'index.html', 'manifest.json',
  'css/story.css', 'css/intro.css',
  'js/voice_lines.js', 'js/story-data.js', 'js/intro.js', 'js/story.js',
  'assets/scenes/s01_tree.jpg',
];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).catch(() => {}));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
      .then(precacheAll)          // 后台慢慢把剩下的素材拉全
  );
});

// 后台预缓存全部插画/图标/配音（低并发，不抢首屏带宽）
async function precacheAll() {
  try {
    const res = await fetch('asset-manifest.json', { cache: 'no-cache' });
    if (!res.ok) return;
    const list = await res.json();
    const cache = await caches.open(CACHE);
    const queue = list.slice();
    const worker = async () => {
      while (queue.length) {
        const url = queue.shift();
        if (await cache.match(url)) continue;
        try { const r = await fetch(url, { cache: 'no-cache' }); if (r.ok) await cache.put(url, r); } catch {}
      }
    };
    await Promise.all([worker(), worker(), worker()]);   // 3 条并发
  } catch {}
}

self.addEventListener('message', e => { if (e.data === 'precache') precacheAll(); });

self.addEventListener('fetch', e => {
  const { request } = e;
  if (request.method !== 'GET' || !request.url.startsWith(self.location.origin)) return;

  if (isDoc(request.url)) {
    e.respondWith(
      fetch(request).then(res => {
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(request, clone));
        return res;
      }).catch(() => caches.match(request))
    );
  } else {
    e.respondWith(
      caches.match(request).then(hit => hit || fetch(request).then(res => {
        if (res.ok) { const clone = res.clone(); caches.open(CACHE).then(c => c.put(request, clone)); }
        return res;
      }))
    );
  }
});
