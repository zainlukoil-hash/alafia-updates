/* منصة عائلة العافية: عامل الخدمة
   الغاية: أن تفتح المنصة المثبّتة فوراً وحتى بلا إنترنت. الصفحة تُقدَّم من النسخة المحفوظة في الجهاز في الحال (دون انتظار الشبكة إطلاقاً)،
   وبعد الفتح بثوانٍ يُسأل الخادم بطلب شرطي صغير هل تغيّرت الصفحة؛ فإن تغيّرت نُزّلت الجديدة في الخلفية لتُفتح في المرة التالية.
   تحديثات المنصة (latest.json وحزم u*.bin) وكل ما هو خارج هذا العنوان (قاعدة بيانات الختمة، التلاوة) لا يمسّه هذا الملف إطلاقاً. */
var V = 'afia-app-5';
var PAGE = './__page', META = './__meta';
var ICONS = ['manifest.webmanifest', 'icon-v9c-192.png', 'icon-v9c-512.png', 'icon-v9c-maskable-512.png', 'apple-touch-icon.png'];
var OFFLINE = '<meta charset="utf-8"><body style="font:18px system-ui;padding:2em;text-align:center;direction:rtl">لا اتصال بالإنترنت، ولم تُحفظ نسخة بعد. افتح المنصة مرة واحدة وأنت متصل.</body>';
function sigOf(r) { return JSON.stringify({ e: r.headers.get('etag') || '', l: r.headers.get('last-modified') || '', n: r.headers.get('content-length') || '' }); }
function keepPage(c, res) {
  var s = sigOf(res);
  return c.put(PAGE, res).then(function () { return c.put(META, new Response(s)); });
}
self.addEventListener('install', function (e) {
  self.skipWaiting();
  e.waitUntil(caches.open(V).then(function (c) {
    /* the page itself is kept at once, so that even the very first visit can be reopened quickly and without the internet */
    var page = fetch(self.registration.scope, { credentials: 'same-origin' }).then(function (r) { if (r && r.ok) return keepPage(c, r); }).catch(function () {});
    var ic = Promise.all(ICONS.map(function (u) { return fetch(new Request(u, { cache: 'reload' })).then(function (r) { if (r && r.ok) return c.put(u, r); }).catch(function () {}); }));
    return Promise.all([ic, page]);
  }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.filter(function (k) { return k !== V; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
/* has the page changed? a small conditional request (a 304 carries no body); only a changed page is downloaded again */
var inflight = null;
function refresh(url) {
  if (inflight) return inflight;
  inflight = refresh1(url).then(function (x) { inflight = null; return x; }, function () { inflight = null; });
  return inflight;
}
function refresh1(url) {
  return caches.open(V).then(function (c) {
    return c.match(META).then(function (m) { return m ? m.json() : null; }).catch(function () { return null; }).then(function (old) {
      var h = {};
      if (old && old.e) h['If-None-Match'] = old.e; else if (old && old.l) h['If-Modified-Since'] = old.l;
      return fetch(url, { cache: 'no-store', credentials: 'same-origin', headers: h }).then(function (res) {
        if (!res || res.status === 304 || !res.ok) return;
        if (old && !old.e && !old.l && sigOf(res) === JSON.stringify(old)) return;
        return keepPage(c, res);
      });
    });
  }).catch(function () {});
}
self.addEventListener('fetch', function (e) {
  var r = e.request, u = new URL(r.url);
  if (r.method !== 'GET' || u.origin !== self.location.origin) return;
  if (/\/latest\.json$/.test(u.pathname) || /\/u\d+\.bin$/.test(u.pathname) || /\/sw\.js$/.test(u.pathname)) return;
  if (r.mode === 'navigate') {
    var base = u.origin + u.pathname;
    /* «Update now» in the app reloads with ?b=<build>: that one must get the newest page, never the saved one */
    var fresh = u.searchParams.has('b');
    e.respondWith(caches.open(V).then(function (c) {
      return c.match(PAGE).then(function (hit) {
        if (hit && fresh) {
          var w = refresh(base);
          e.waitUntil(w);
          return w.then(function () { return c.match(PAGE); }).then(function (x) { return x || hit; });
        }
        if (hit) {
          /* instant: the saved page; the check for a newer one waits a few seconds so that it never competes with the opening */
          e.waitUntil(new Promise(function (ok) { setTimeout(ok, 6000); }).then(function () { return refresh(base); }));
          return hit;
        }
        return fetch(base, { credentials: 'same-origin' }).then(function (res) {
          if (res && res.ok) { var cp = res.clone(); keepPage(c, cp).catch(function () {}); }
          return res;
        }).catch(function () { return new Response(OFFLINE, { status: 503, headers: { 'Content-Type': 'text/html;charset=utf-8' } }); });
      });
    }));
    return;
  }
  if (/\.(png|ico|webmanifest)$/.test(u.pathname)) {
    /* icons and the manifest: the network first (so a changed icon or manifest reaches an installed app), the saved copy only when offline */
    e.respondWith(fetch(r, { cache: 'no-cache' }).then(function (res) {
      if (res && res.ok) { var cp = res.clone(); caches.open(V).then(function (c) { return c.put(r, cp); }).catch(function () {}); }
      return res;
    }).catch(function () { return caches.match(r).then(function (x) { return x || Response.error(); }); }));
  }
});
