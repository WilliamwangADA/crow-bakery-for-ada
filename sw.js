/* Service Worker v2（互动绘本版）
   - html/js/css：网络优先（保证改版能立刻生效，离线时回落缓存）
   - 图片/音频：缓存优先（秒开、离线可听）
   注意：旧版游戏的缓存会在 activate 时全部清掉 */
const CACHE = 'crow-story-v2';
const isDoc = url => /\.(html|js|css|json)$/.test(url) || url.endsWith('/');

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const { request } = e;
  if (request.method !== 'GET' || !request.url.startsWith(self.location.origin)) return;

  if (isDoc(request.url)) {
    // 网络优先
    e.respondWith(
      fetch(request).then(res => {
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(request, clone));
        return res;
      }).catch(() => caches.match(request))
    );
  } else {
    // 缓存优先（图片/音频）
    e.respondWith(
      caches.match(request).then(hit => hit || fetch(request).then(res => {
        if (res.ok) { const clone = res.clone(); caches.open(CACHE).then(c => c.put(request, clone)); }
        return res;
      }))
    );
  }
});
