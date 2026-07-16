const CACHE_NAME = "ppn-ifp-v2.2.0";
const OFFLINE_URL = "./offline.html";
const ASSETS = [
  './.nojekyll',
  './admin.html',
  './analytics.html',
  './auth.html',
  './culture.html',
  './dashboard.html',
  './data/games.json',
  './error.html',
  './game.html',
  './games.html',
  './games/congklak-cerdas/data/questions.json',
  './games/congklak-cerdas/index.html',
  './games/congklak-cerdas/js/engine.js',
  './games/congklak-cerdas/js/game.js',
  './games/egrang-nusantara/data/questions.json',
  './games/egrang-nusantara/index.html',
  './games/egrang-nusantara/js/game.js',
  './games/engklek-pintar/data/questions.json',
  './games/engklek-pintar/index.html',
  './games/engklek-pintar/js/game.js',
  './games/gobak-sodor/assets/img/icon-144.png',
  './games/gobak-sodor/assets/img/icon-180.png',
  './games/gobak-sodor/assets/img/icon-192.png',
  './games/gobak-sodor/assets/img/icon-256.png',
  './games/gobak-sodor/assets/img/icon-32.png',
  './games/gobak-sodor/assets/img/icon-48.png',
  './games/gobak-sodor/assets/img/icon-512.png',
  './games/gobak-sodor/assets/img/icon-96.png',
  './games/gobak-sodor/assets/img/icon-maskable-512.png',
  './games/gobak-sodor/assets/img/social-preview.png',
  './games/gobak-sodor/css/game.css',
  './games/gobak-sodor/css/style.css',
  './games/gobak-sodor/culture.html',
  './games/gobak-sodor/data/questions.json',
  './games/gobak-sodor/game.html',
  './games/gobak-sodor/index.html',
  './games/gobak-sodor/js/accessibility.js',
  './games/gobak-sodor/js/app.js',
  './games/gobak-sodor/js/audio.js',
  './games/gobak-sodor/js/culture.js',
  './games/gobak-sodor/js/difficulty.js',
  './games/gobak-sodor/js/effects.js',
  './games/gobak-sodor/js/enemy.js',
  './games/gobak-sodor/js/game.js',
  './games/gobak-sodor/js/gamification.js',
  './games/gobak-sodor/js/leaderboard.js',
  './games/gobak-sodor/js/map.js',
  './games/gobak-sodor/js/player.js',
  './games/gobak-sodor/js/quiz.js',
  './games/gobak-sodor/leaderboard.html',
  './games/gobak-sodor/offline.html',
  './games/gobak-sodor/tutorial.html',
  './games/jelajah-nusantara/data/questions.json',
  './games/jelajah-nusantara/index.html',
  './games/jelajah-nusantara/js/game.js',
  './index.html',
  './leaderboard.html',
  './manifest.json',
  './offline-check.html',
  './offline.html',
  './play.html',
  './players.html',
  './profile.html',
  './question-editor.html',
  './results.html',
  './service-worker.js',
  './setup.html',
  './shared/assets/icons/icon-144.png',
  './shared/assets/icons/icon-180.png',
  './shared/assets/icons/icon-192.png',
  './shared/assets/icons/icon-256.png',
  './shared/assets/icons/icon-32.png',
  './shared/assets/icons/icon-48.png',
  './shared/assets/icons/icon-512.png',
  './shared/assets/icons/icon-96.png',
  './shared/assets/icons/icon-maskable-512.png',
  './shared/assets/social-preview.png',
  './shared/css/dashboard.css',
  './shared/css/game-bridge.css',
  './shared/css/hardening.css',
  './shared/css/mini-games.css',
  './shared/css/portal.css',
  './shared/js/analytics.js',
  './shared/js/data-utils.js',
  './shared/js/db.js',
  './shared/js/game-quiz.js',
  './shared/js/game-sync.js',
  './shared/js/games.js',
  './shared/js/leaderboard.js',
  './shared/js/offline-check.js',
  './shared/js/play.js',
  './shared/js/player-session.js',
  './shared/js/players.js',
  './shared/js/portal.js',
  './shared/js/question-editor.js',
  './shared/js/results.js',
  './shared/js/teacher-auth.js',
  './shared/js/teacher.js',
  './student.html',
  './teacher.html',
  './tutorial.html',
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  if (event.request.mode === "navigate") {
    event.respondWith((async () => {
      const cached = await caches.match(event.request, { ignoreSearch: true });
      if (cached) return cached;
      try {
        const response = await fetch(event.request);
        if (response.ok) {
          const cache = await caches.open(CACHE_NAME);
          cache.put(event.request, response.clone());
        }
        return response;
      } catch {
        return (await caches.match(OFFLINE_URL)) || Response.error();
      }
    })());
    return;
  }

  event.respondWith((async () => {
    const cached = await caches.match(event.request, { ignoreSearch: true });
    if (cached) return cached;
    const response = await fetch(event.request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(event.request, response.clone());
    }
    return response;
  })());
});

self.addEventListener("message", event => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});
