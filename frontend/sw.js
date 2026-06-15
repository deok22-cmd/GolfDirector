/*
 * 골프총무 Service Worker (PWA)
 * 설계 원칙(중요): 라이브 서버 + scp 재배포 환경이라 "옛 화면 박제"를 막는 게 최우선.
 *  - /api/ · 인증 · 외부(환율/AdSense/CDN)는 절대 가로채지 않음(network-only).
 *  - 앱 셸(HTML/JS/CSS)은 network-first → 항상 최신, 오프라인일 때만 캐시 폴백.
 *  - 아이콘/이미지만 cache-first(잘 안 변하므로).
 *  - 캐시 버전을 올리면 활성화 시 옛 캐시 자동 삭제.
 */
const VERSION = "gd-v1";
const SHELL = "shell-" + VERSION;
const ASSETS = "assets-" + VERSION;

// 설치 즉시 활성화 대기 없이 교체
self.addEventListener("install", (e) => {
  self.skipWaiting();
});

// 활성화 시 옛 버전 캐시 정리 + 즉시 제어
self.addEventListener("activate", (e) => {
  e.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((k) => k !== SHELL && k !== ASSETS).map((k) => caches.delete(k))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return; // POST/PUT/DELETE(인증·CRUD)는 건드리지 않음

  const url = new URL(req.url);

  // 1) 다른 출처(환율 API·AdSense·Tailwind/Pretendard CDN)는 그대로 통과
  if (url.origin !== self.location.origin) return;

  // 2) API 호출은 절대 캐싱하지 않음(로그인/저장 깨짐 방지)
  if (url.pathname.includes("/api/")) return;

  // 3) 아이콘/이미지: cache-first (자주 안 변함)
  if (/\.(png|jpg|jpeg|webp|gif|svg|ico)$/i.test(url.pathname)) {
    e.respondWith(
      caches.open(ASSETS).then(async (cache) => {
        const hit = await cache.match(req);
        if (hit) return hit;
        const res = await fetch(req);
        if (res.ok) cache.put(req, res.clone());
        return res;
      })
    );
    return;
  }

  // 4) 그 외 앱 셸(HTML/JS/CSS/manifest): network-first, 실패 시 캐시 폴백
  e.respondWith(
    (async () => {
      try {
        const res = await fetch(req);
        if (res.ok) {
          const cache = await caches.open(SHELL);
          cache.put(req, res.clone());
        }
        return res;
      } catch (err) {
        const cache = await caches.open(SHELL);
        const hit = await cache.match(req);
        if (hit) return hit;
        // 네비게이션이면 시작 페이지로 폴백
        if (req.mode === "navigate") {
          const home = await cache.match("./");
          if (home) return home;
        }
        throw err;
      }
    })()
  );
});
