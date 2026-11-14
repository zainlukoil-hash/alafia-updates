/* منصة عائلة العافية: عامل الخدمة
   الغاية: أن تفتح المنصة المثبّتة حتى بلا إنترنت. الصفحة نفسها تُجلب من الشبكة أولاً (بعد التحقق من أنها لم تتغيّر، فلا يُعاد تنزيلها كاملة)،
   وتُحفظ نسخة منها للاستعمال عند انقطاع الاتصال. تحديثات المنصة (latest.json وحزم u*.bin) وكل ما هو خارج هذا العنوان
   (قاعدة بيانات الختمة، التلاوة) لا يمسّه هذا الملف إطلاقاً. */
var V = 'afia-app-2';
var PAGE = './__page';
self.addEventListener('install', function (e) {
  self.skipWaiting();
  e.waitUntil(caches.open(V).then(function (c) {
    /* the page itself is kept at once (the browser usually has it already, so this costs no second download), so that even the very first visit can be reopened without the internet */
    var page = fetch(self.registration.scope, { credentials: 'same-origin' }).then(function (r) { if (r && r.ok) return c.put(PAGE, r); }).catch(function () {});
    return Promise.all([c.addAll(['manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png', 'apple-touch-icon.png']).catch(function () {}), page]);
  }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.filter(function (k) { return k !== V; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener('fetch', function (e) {
  var r = e.request, u = new URL(r.url);
  if (r.method !== 'GET' || u.origin !== self.location.origin) return;
  if (/\/latest\.json$/.test(u.pathname) || /\/u\d+\.bin$/.test(u.pathname) || /\/sw\.js$/.test(u.pathname)) return;
  if (r.mode === 'navigate') {
    e.respondWith(
      fetch(u.origin + u.pathname, { cache: 'no-cache', credentials: 'same-origin' }).then(function (res) {
        if (res && res.ok) { var cp = res.clone(); caches.open(V).then(function (c) { return c.put(PAGE, cp); }).catch(function () {}); }
        return res;
      }).catch(function () {
        return caches.match(PAGE).then(function (x) {
          return x || new Response('<meta charset="utf-8"><body style="font:18px system-ui;padding:2em;text-align:center;direction:rtl">لا اتصال بالإنترنت، ولم تُحفظ نسخة بعد. افتح المنصة مرة واحدة وأنت متصل.</body>', { status: 503, headers: { 'Content-Type': 'text/html;charset=utf-8' } });
        });
      })
    );
    return;
  }
  if (/\.(png|ico|webmanifest)$/.test(u.pathname)) {
    e.respondWith(caches.match(r).then(function (x) { return x || fetch(r); }));
  }
});
