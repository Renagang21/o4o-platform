/**
 * GlucoseView Service Worker — WO-O4O-GLUCOSEVIEW-SW-CACHE-FIX-V1
 *
 * 캐시 전략:
 *   /             → network-first (항상 최신 HTML)
 *   .js/.css      → stale-while-revalidate + content-type 검증
 *   이미지/폰트    → cache-first
 *   /api/*        → 패스스루 (캐시 없음)
 *
 * __BUILD_HASH__ 는 Dockerfile에서 빌드 해시로 치환됨.
 * 배포마다 SW 파일이 변경 → 브라우저가 자동 업데이트 → 구 캐시 삭제.
 */

const CACHE_NAME = 'glucoseview-__BUILD_HASH__';

const STATIC_ASSETS = [
  '/manifest.json',
  '/icons/icon.svg',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

// ── Install: precache static assets (icons/manifest) ──
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS)),
  );
  self.skipWaiting();
});

// ── Activate: clean old caches ──
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)),
      ),
    ),
  );
  self.clients.claim();
});

/**
 * content-type 검증: serve -s가 없는 JS/CSS에 HTML을 반환하는 문제 방지
 * @returns {boolean} 캐시해도 안전한 응답인지
 */
function isValidAssetResponse(request, response) {
  if (!response || !response.ok) return false;
  const url = new URL(request.url);
  const contentType = response.headers.get('content-type') || '';

  // JS 요청인데 HTML이 돌아온 경우 → 캐시 금지
  if (url.pathname.endsWith('.js') && !contentType.includes('javascript')) {
    return false;
  }
  // CSS 요청인데 HTML이 돌아온 경우 → 캐시 금지
  if (url.pathname.endsWith('.css') && !contentType.includes('css')) {
    return false;
  }
  return true;
}

// ── Fetch handler ──
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET
  if (request.method !== 'GET') return;

  // Skip cross-origin
  if (url.origin !== self.location.origin) return;

  // Skip API calls
  if (url.pathname.startsWith('/api/')) return;

  // ─── Strategy 1: JS/CSS → stale-while-revalidate + content-type 검증 ───
  if (url.pathname.match(/\.(js|css)$/)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const fetchPromise = fetch(request).then((response) => {
          if (isValidAssetResponse(request, response)) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        }).catch(() => cached);

        // stale-while-revalidate: 캐시 있으면 즉시 반환, 백그라운드에서 갱신
        return cached || fetchPromise;
      }),
    );
    return;
  }

  // ─── Strategy 2: 이미지/폰트 → cache-first ───
  if (url.pathname.match(/\.(png|svg|jpg|jpeg|gif|ico|woff2?|ttf|eot)$/)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        });
      }),
    );
    return;
  }

  // ─── Strategy 3: HTML/SPA 라우트 → network-first ───
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      })
      .catch(() => caches.match(request).then((cached) => cached || caches.match('/'))),
  );
});
