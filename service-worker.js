const CACHE = "mathmaster-shell-v36";
const SHELL = ["./", "./index.html", "./admin.html", "./styles.css", "./styles.css?v=36", "./manifest.webmanifest", "./src/math-toolbox.js", "./src/progress-reset.js", "./src/cloud-config.js", "./src/cloud.js", "./src/admin-accounts.js", "./src/student-guide.js", "./src/study-plan.js", "./src/streak-flame.js", "./src/local-time.js", "./src/preferences.js", "./src/support-chat.js", "./src/support-guide.js", "./src/math-equivalence.js", "./src/marking-assistant.js", "./src/marking-assistant-ui.js", "./src/mark-scheme-index.js", "./src/app.js", "./src/app.js?v=36", "./src/data.js", "./src/portal-session.js", "./src/past-paper-catalog.js", "./src/past-papers.js", "./src/past-paper-structure.js", "./src/past-paper-ui.js", "./src/bank-expansion.js", "./src/question-bank.js", "./src/curriculum.js", "./src/storage.js", "./src/math-engine.js", "./src/exam-content.js", "./src/working-review.js", "./src/work-uploads.js", "./src/working-ui.js", "./src/calculation-checker.js"];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key)))));
  self.clients.claim();
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET" || new URL(event.request.url).origin !== self.location.origin) return;
  event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request).then(response => {
    if (response.ok) caches.open(CACHE).then(cache => cache.put(event.request, response.clone()));
    return response;
  }).catch(() => caches.match("./index.html"))));
});
