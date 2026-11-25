/* Офлайн-режим: файлы сайта сохраняются в браузере после первого открытия.
   После правок сайта увеличьте VERSION, чтобы у игроков обновились файлы. */
var VERSION = "momenty-v20";
var FILES = [
  "./", "index.html", "styles.css", "app.js", "home.js", "cards.js", "manifest.webmanifest",
  "img/back-common.svg", "img/back-family.svg", "img/back-pair.svg",
  "img/common-top.svg", "img/common-bot.svg", "img/family-top.svg", "img/family-bot.svg",
  "img/pair-top.svg", "img/pair-bot.svg",
  "img/sky/try-wide.svg", "img/sky/try-narrow.svg",
  "fonts/Geologica-Variable.woff2", "fonts/Dudka_Bold.woff2", "img/favicon.svg", "img/icon-192.png", "img/icon-512.png"
];
self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(VERSION).then(function (c) { return c.addAll(FILES); }).then(function () { return self.skipWaiting(); }));
});
// при обновлении удаляем только старые кэши игры («momenty-…»), чужие кэши на том же адресе не трогаем
self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k.indexOf("momenty-") === 0 && k !== VERSION; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
// Сначала сеть (свежие вопросы), без сети берём из кэша.
self.addEventListener("fetch", function (e) {
  if (e.request.method !== "GET" || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(
    fetch(e.request).then(function (r) {
      var copy = r.clone();
      caches.open(VERSION).then(function (c) { c.put(e.request, copy); });
      return r;
    }).catch(function () {
      return caches.match(e.request, { ignoreSearch: true }).then(function (m) { return m || caches.match("index.html"); });
    })
  );
});
