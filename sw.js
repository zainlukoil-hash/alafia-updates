/* منصة عائلة العافية: عامل الخدمة
   الغاية: أن تفتح المنصة المثبّتة فوراً وحتى بلا إنترنت. الصفحة تُقدَّم من النسخة المحفوظة في الجهاز في الحال (دون انتظار الشبكة إطلاقاً)،
   وبعد الفتح بثوانٍ يُسأل الخادم بطلب شرطي صغير هل تغيّرت الصفحة؛ فإن تغيّرت نُزّلت الجديدة في الخلفية لتُفتح في المرة التالية.
   تحديثات المنصة (latest.json وحزم u*.bin) وكل ما هو خارج هذا العنوان (قاعدة بيانات الختمة، التلاوة) لا يمسّه هذا الملف إطلاقاً.

   الإصدار 146 (يصلح تعذّر «حدّث الآن» على الهاتف):
   · «حدّث الآن» (?b=) صار يمرّر الصفحة الجديدة من الشبكة مباشرة إلى المتصفح أثناء نزولها، ولا ينتظر حفظها في الجهاز ولا يتوقف عليه، فلا يعلق عند
     امتلاء التخزين ولا عند بطء الحفظ؛ وحفظها للمرة القادمة يجري بعدها في الخلفية. وهو يطلب الصفحة بعنوان فريد فلا يردّ عليه خادم وسيط بنسخة قديمة؛
     فإن تعذّر الوصول إلى الشبكة فُتحت النسخة المحفوظة بدل أن يبقى المستخدم بلا شيء.
   · رسالة من الصفحة (afia-refresh) تنزّل الصفحة الجديدة في الخلفية وتُبلغها بالتقدّم ثم بالاكتمال أو بسبب الفشل، فتُطبَّق وحدها دون ضغط.
   · إشعار على الهاتف (للمنصة المثبّتة، وبعد أن يسمح بذلك المستخدم): تفحص الخلفية دورياً رقم آخر إصدار، فإن وُجد أحدث نزّلته وأشعرت. */
var V = 'afia-app-5';
var PAGE = './__page', META = './__meta', BLD = './__build', TOLD = './__told';
var ICONS = ['manifest.webmanifest', 'icon-v9c-192.png', 'icon-v9c-512.png', 'icon-v9c-maskable-512.png', 'apple-touch-icon.png'];
var OFFLINE = '<meta charset="utf-8"><body style="font:18px system-ui;padding:2em;text-align:center;direction:rtl">لا اتصال بالإنترنت، ولم تُحفظ نسخة بعد. افتح المنصة مرة واحدة وأنت متصل.</body>';
function sigOf(r) { return JSON.stringify({ e: r.headers.get('etag') || '', l: r.headers.get('last-modified') || '', n: r.headers.get('content-length') || '' }); }
function keepPage(c, res) {
  var s = sigOf(res);
  return c.put(PAGE, res).then(function () { return c.put(META, new Response(s)); });
}
/* a unique address for a page that must not come from any cache on the way (a proxy may hold the plain address for some minutes after a new publication) */
function bust(base, tag) { return base + '?v=' + (tag || Date.now()); }
self.addEventListener('install', function (e) {
  self.skipWaiting();
  e.waitUntil(caches.open(V).then(function (c) {
    /* the page itself is kept at once, so that even the very first visit can be reopened quickly and without the internet;
       an update of this file does not download it again when it is already kept */
    var page = c.match(PAGE).then(function (hit) {
      if (hit) return;
      return fetch(bust(self.registration.scope), { credentials: 'same-origin', cache: 'reload' }).then(function (r) { if (r && r.ok) return keepPage(c, r); }).catch(function () {});
    });
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
      return fetch(bust(url, Math.floor(Date.now() / 300000)), { cache: 'no-store', credentials: 'same-origin', headers: h }).then(function (res) {
        if (!res || res.status === 304 || !res.ok) return;
        if (old && !old.e && !old.l && sigOf(res) === JSON.stringify(old)) return;
        return keepPage(c, res);
      });
    });
  }).catch(function () {});
}
/* «Update now»: the new page goes straight from the network to the browser, and is kept for the next time behind it */
function netPage(base, ev) {
  return fetch(bust(base), { cache: 'reload', credentials: 'same-origin' }).then(function (res) {
    if (!res || !res.ok) throw new Error('http');
    var cp = res.clone();
    ev.waitUntil(caches.open(V).then(function (c) { return keepPage(c, cp); }).catch(function () {}));
    return res;
  });
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
        if (fresh) {
          return netPage(base, e).catch(function () {
            /* no network just now: the saved page rather than nothing */
            return hit || new Response(OFFLINE, { status: 503, headers: { 'Content-Type': 'text/html;charset=utf-8' } });
          });
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
/* ---- the page asks: bring the newest page now (with the progress), and the page tells which build it is ---- */
function pull(build, size, say) {
  var base = self.registration.scope;
  return fetch(bust(base, build || Date.now()), { cache: 'reload', credentials: 'same-origin' }).then(function (res) {
    if (!res || !res.ok) throw new Error('http ' + (res ? res.status : 0));
    var tot = size || +res.headers.get('content-length') || 0, got = 0, last = 0, rd = res.clone().body.getReader();
    var prog = (function pump() {
      return rd.read().then(function (x) {
        if (x.done) return;
        got += x.value.length;
        var now = Date.now();
        if (now - last > 200) { last = now; say({ type: 'afia-prog', got: got, tot: tot }); }
        return pump();
      });
    })();
    var keep = caches.open(V).then(function (c) { return keepPage(c, res); });
    return Promise.all([keep, prog]).then(function () { return got; });
  });
}
self.addEventListener('message', function (e) {
  var d = e.data || {}, src = e.source;
  function say(m) { try { if (src) src.postMessage(m); } catch (x) {} }
  if (d.type === 'afia-ping') {
    say({ type: 'afia-pong', v: 146 });
  } else if (d.type === 'afia-refresh') {
    e.waitUntil(pull(d.build, d.size, say).then(function (n) { say({ type: 'afia-ready', build: d.build, bytes: n }); },
      function (err) { say({ type: 'afia-fail', why: String((err && err.message) || err) }); }));
  } else if (d.type === 'afia-build') {
    e.waitUntil(caches.open(V).then(function (c) { return c.put(BLD, new Response(String(d.b || 0))); }).catch(function () {}));
  }
});
/* ---- the notice on the phone: once in a while, in the background, the newest build number is read; if it is newer the page is brought and a notice is shown ---- */
function checkUpdate() {
  var scope = self.registration.scope;
  return fetch(scope + 'latest.json?_=' + Date.now(), { cache: 'no-store' }).then(function (r) { return r.json(); }).then(function (j) {
    return caches.open(V).then(function (c) {
      return Promise.all([c.match(BLD), c.match(TOLD)]).then(function (m) {
        return Promise.all([m[0] ? m[0].text() : '0', m[1] ? m[1].text() : '0']);
      }).then(function (t) {
        var have = +t[0] || 0, told = +t[1] || 0;
        if (!j || !(j.b > have) || told >= j.b) return;
        return pull(j.b, j.n || 0, function () {}).catch(function () {}).then(function () {
          return c.put(TOLD, new Response(String(j.b)));
        }).then(function () {
          return self.registration.showNotification('منصة عائلة العافية', {
            body: 'صدر إصدار أحدث' + (j.v ? ' (' + j.v + ')' : '') + ' وهو جاهز. افتح المنصة ليبدأ.',
            icon: 'icon-v9c-192.png', badge: 'icon-v9c-192.png', tag: 'afia-update', lang: 'ar', dir: 'rtl', renotify: true,
            data: { url: scope + '?b=' + j.b }
          });
        });
      });
    });
  }).catch(function () {});
}
self.addEventListener('periodicsync', function (e) { if (e.tag === 'afia-upd') e.waitUntil(checkUpdate()); });
self.addEventListener('notificationclick', function (e) {
  e.notification.close();
  var url = (e.notification.data && e.notification.data.url) || self.registration.scope;
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (cs) {
    for (var i = 0; i < cs.length; i++) {
      if (cs[i].url.indexOf(self.registration.scope) === 0) {
        try { cs[i].postMessage({ type: 'afia-check' }); } catch (x) {}
        return cs[i].focus();
      }
    }
    return self.clients.openWindow(url);
  }));
});
