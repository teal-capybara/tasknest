/* ==========================================================================
   SERVICE WORKER: makes the app open with no internet.

   What it does:
   1. On install, it saves every app file (HTML, CSS, JS, icons) in a cache.
   2. When the app asks for a file, it answers from that cache immediately and
      refreshes the cache in the background ("stale-while-revalidate").
   3. It also keeps the Firebase code files (from Google's CDN) so sign-in and
      the database code load offline too.
   It does NOT touch your data. Tasks are stored by Firestore itself.

   *** EVERY TIME YOU CHANGE ANY APP FILE, bump VERSION below (v1 -> v2 ...) ***
   That makes phones notice the update and show the "Reload" banner.

   If you add a new file to the app, add it to SHELL_FILES too.
   ========================================================================== */

const VERSION = "v2-phase2";
const SHELL_CACHE = `tasknest-shell-${VERSION}`;
const SDK_CACHE = "tasknest-firebase-sdk"; // Firebase files are versioned by URL, so this one is kept

// Paths are relative to this file, so it works under /your-repo-name/ on GitHub Pages.
const SHELL_FILES = [
  "./",
  "index.html",
  "manifest.webmanifest",
  "css/base.css",
  "css/components.css",
  "css/layout.css",
  "css/themes.css",
  "css/views.css",
  "js/auth.js",
  "js/config.js",
  "js/constants.js",
  "js/data.js",
  "js/db/courses.js",
  "js/db/helpers.js",
  "js/db/settings.js",
  "js/db/syncTest.js",
  "js/db/taskTypes.js",
  "js/db/tasks.js",
  "js/firebase.js",
  "js/logic/filters.js",
  "js/logic/format.js",
  "js/logic/timing.js",
  "js/logic/urgency.js",
  "js/logic/validate.js",
  "js/main.js",
  "js/router.js",
  "js/session.js",
  "js/state.js",
  "js/sync-status.js",
  "js/theme.js",
  "js/ui/dialogs.js",
  "js/ui/dom.js",
  "js/ui/install.js",
  "js/ui/screens.js",
  "js/ui/taskActions.js",
  "js/ui/taskCard.js",
  "js/ui/themePicker.js",
  "js/views/manageView.js",
  "js/views/settingsView.js",
  "js/views/taskDetailView.js",
  "js/views/taskFormView.js",
  "js/views/tasksView.js",
  "icons/favicon.svg",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/icon-maskable-512.png",
  "icons/icon.svg",
].map((path) => new URL(path, self.registration.scope).href);

const INDEX_URL = new URL("index.html", self.registration.scope).href;

/* ---- Install: save all the app files ---- */
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) =>
      // cache: "reload" skips the browser's own cache so we store the newest files
      Promise.all(SHELL_FILES.map((url) =>
        cache.add(new Request(url, { cache: "reload" }))
      ))
    )
  );
  // We do NOT skipWaiting here: the page shows a "Reload" banner instead, so an
  // update never swaps files while you are in the middle of something.
});

/* ---- Activate: delete caches from older versions ---- */
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(
        names
          .filter((n) => n.startsWith("tasknest-shell-") && n !== SHELL_CACHE)
          .map((n) => caches.delete(n))
      ))
      .then(() => self.clients.claim())
  );
});

/* ---- Messages from the page ---- */
self.addEventListener("message", (event) => {
  const data = event.data || {};
  if (data.type === "SKIP_WAITING") self.skipWaiting();

  // The page tells us which Firebase files it loaded, so we can keep them for offline.
  if (data.type === "CACHE_URLS" && Array.isArray(data.urls)) {
    event.waitUntil(
      caches.open(SDK_CACHE).then((cache) =>
        Promise.all(data.urls
          .filter((u) => u.startsWith("https://www.gstatic.com/firebasejs/"))
          .map((u) => cache.add(u).catch(() => {})))
      )
    );
  }
});

/* ---- Fetch: decide where each file comes from ---- */
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  if (url.origin === self.location.origin) {
    event.respondWith(appFileStrategy(event, req));
    return;
  }
  if (url.hostname === "www.gstatic.com" && url.pathname.startsWith("/firebasejs/")) {
    event.respondWith(cacheFirst(req));
    return;
  }
  // Everything else (database traffic, Google sign-in pages) goes straight to the network.
});

/** App files: answer from cache instantly, refresh in the background. */
async function appFileStrategy(event, req) {
  const cache = await caches.open(SHELL_CACHE);
  const cached =
    (await cache.match(req, { ignoreSearch: true })) ||
    (req.mode === "navigate" ? await cache.match(INDEX_URL) : undefined);

  const refresh = fetch(req)
    .then((res) => {
      if (res && res.ok && res.type === "basic") cache.put(req, res.clone());
      return res;
    })
    .catch(() => null);

  if (cached) {
    event.waitUntil(refresh);
    return cached;
  }
  return (await refresh) || new Response("You're offline and this file isn't saved yet.", { status: 503 });
}

/** Firebase code files never change for a given URL, so cache-first is safe. */
async function cacheFirst(req) {
  const cache = await caches.open(SDK_CACHE);
  const cached = await cache.match(req);
  if (cached) return cached;
  const res = await fetch(req);
  if (res && res.ok) cache.put(req, res.clone());
  return res;
}
