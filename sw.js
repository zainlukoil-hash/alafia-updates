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
/* الإصدار 160 (علاج بطء الفتح الأول وانقطاع التنزيل على الإنترنت الضعيف):
   · حين لا توجد نسخة محفوظة في الهاتف لا يُترك المستخدم أمام شاشة الإقلاع دقيقتين: تُعرض فوراً صفحة صغيرة فيها شريط تقدّم، وتُنزَّل المنصة وراءها على قطع (مليون بايت لكل قطعة)
     تُحفظ كل قطعة فور وصولها؛ فإن انقطع الاتصال أو أُغلق التطبيق تكمل المرة التالية من حيث توقفت (طلب Range)، ثم تُجمع القطع وتُحفظ نسخة كاملة وتُفتح المنصة.
   · إن لم يدعم الخادم الطلب الجزئي نُزّلت الصفحة بالتدفق نفسه وقُسّمت إلى قطع (لا يُحجز في الذاكرة ملف من 22 ميغابايت دفعة واحدة).
   · لا يُنزَّل شيء أثناء التثبيت بعد الآن (كان يزاحم تنزيل الفتحة الأولى ويتجاوز مهلة التثبيت على الإنترنت البطيء).
   · فحص الإصدار الجديد صار برقم الإصدار من latest.json (لا بترويسات الخادم) ويُنزَّل الجديد بالطريقة نفسها في الخلفية.
   · لا يلتقط عامل الخدمة إلا صفحة المنصة نفسها (فتح ملف آخر من العنوان لم يعد يُحفظ بدل الصفحة). */
var V = 'afia-app-5';
var PAGE = './__page', META = './__meta', BLD = './__build', TOLD = './__told', DL = './__dl', PART = './__p/';
var CH = 1048576;
var ICONS = ['manifest.webmanifest', 'icon-v9c-192.png', 'icon-v9c-512.png', 'icon-v9c-maskable-512.png', 'icon-v11-maskable-512.png', 'apple-touch-icon.png'];
var OFFLINE = '<meta charset="utf-8"><body style="font:18px system-ui;padding:2em;text-align:center;direction:rtl">لا اتصال بالإنترنت، ولم تُحفظ نسخة بعد. افتح المنصة مرة واحدة وأنت متصل.</body>';
function sigOf(r) { return JSON.stringify({ e: r.headers.get('etag') || '', l: r.headers.get('last-modified') || '', n: r.headers.get('content-length') || '' }); }
function keepPage(c, res, b) {
  var o = JSON.parse(sigOf(res)); if (b) o.b = +b;      /* b = the build this copy is (so that the check for a newer one is by build number) */
  return c.put(PAGE, res).then(function () { return c.put(META, new Response(JSON.stringify(o))); });
}
/* a unique address for a page that must not come from any cache on the way (a proxy may hold the plain address for some minutes after a new publication) */
function bust(base, tag) { return base + '?v=' + (tag || Date.now()); }
self.addEventListener('install', function (e) {
  self.skipWaiting();
  /* only the small files: the page itself is brought on the first opening (with a progress bar), never inside the install, whose time is limited */
  e.waitUntil(caches.open(V).then(function (c) {
    return Promise.all(ICONS.map(function (u) { return fetch(new Request(u, { cache: 'reload' })).then(function (r) { if (r && r.ok) return c.put(u, r); }).catch(function () {}); }));
  }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.filter(function (k) { return k !== V; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
/* ---- bringing the page in pieces: resumable, light on memory, with a progress report to whoever is waiting ---- */
function bcast(m) {
  return self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (cs) { cs.forEach(function (x) { try { x.postMessage(m); } catch (e) {} }); }).catch(function () {});
}
var dlRun = null, dlLast = 0;
function dlProg(got, tot) { var n = Date.now(); if (n - dlLast < 250) return; dlLast = n; bcast({ type: 'afia-dl', got: got, tot: tot }); }
function dlJson(c, k) { return c.match(k).then(function (m) { return m ? m.json() : null; }).catch(function () { return null; }); }
function dlWipe(c) {
  return c.keys().then(function (ks) { return Promise.all(ks.filter(function (r) { return r.url.indexOf('/__p/') >= 0; }).map(function (r) { return c.delete(r); })); }).then(function () { return c.delete(DL); }).catch(function () {});
}
function download() {
  if (dlRun) return dlRun;
  dlRun = dl1().then(function (x) { dlRun = null; return x; }, function (err) { dlRun = null; throw err; });
  return dlRun;
}
function dl1() {
  var scope = self.registration.scope, c, st = null, tag = '', build = 0, restarts = 0, next = 0, total = 0, sig = { e: '', l: '' }, norange = false, url = '', lastFail = -1, est = 0;
  function save() { return c.put(DL, new Response(JSON.stringify({ tag: tag, b: build, total: total, sig: sig, next: next, nr: norange }))); }
  function setNoRange() { norange = true; return save().then(stream); }
  function step() {
    if (total && next * CH >= total) return fin();
    if (norange) return stream();
    var a = next * CH, b = a + CH - 1, h = {};
    if (total && b >= total) b = total - 1;
    h.Range = 'bytes=' + a + '-' + b;
    if (next > 0) { var iff = /^"/.test(sig.e) ? sig.e : sig.l; if (iff) h['If-Range'] = iff; }
    return fetch(url, { cache: 'no-store', credentials: 'same-origin', headers: h }).then(function (res) {
      if (res.status === 206) {
        var cr = /bytes (\d+)-(\d+)\/(\d+)/.exec(res.headers.get('content-range') || ''), ce = (res.headers.get('content-encoding') || '').toLowerCase();
        /* a slice of a compressed stream, or one that does not start where asked, cannot be trusted: take the plain way */
        if (!cr || (ce && ce !== 'identity') || +cr[1] !== a) { try { res.body && res.body.cancel(); } catch (x) {} return setNoRange(); }
        return res.arrayBuffer().then(function (buf) {
          if (buf.byteLength !== +cr[2] - +cr[1] + 1) throw new Error('short part');
          if (!total) { total = +cr[3]; sig = { e: res.headers.get('etag') || '', l: res.headers.get('last-modified') || '' }; }
          else if (+cr[3] !== total) throw new Error('size changed');
          return c.put(PART + next, new Response(buf)).then(function () { next++; return save(); }).then(function () { dlProg(Math.min(next * CH, total), total); return step(); });
        });
      }
      if (res.status === 200) {
        try { res.body && res.body.cancel(); } catch (x) {}
        /* after the first part: the page changed meanwhile (If-Range failed): start again; at the first part: the server ignores Range */
        if (next > 0) { if (++restarts > 2) throw new Error('page keeps changing'); return dlWipe(c).then(function () { next = 0; total = 0; sig = { e: '', l: '' }; return step(); }); }
        return setNoRange();
      }
      throw new Error('http ' + res.status);
    }).catch(function (err) {
      /* the request itself broke (not an http answer): if the site still answers plain requests and the same part breaks twice,
         the way of asking is the problem (e.g. a compressed slice the phone cannot decode): take the plain way; otherwise the link is down: try later */
      if (!(err instanceof TypeError)) throw err;
      return fetch(scope + 'latest.json?_=' + Date.now(), { cache: 'no-store' }).then(function (r) { if (!r.ok) throw err; }, function () { throw err; }).then(function () {
        if (lastFail === next) return setNoRange();
        lastFail = next; return step();
      });
    });
  }
  /* no Range: the whole page as a stream, cut into pieces as it arrives (nothing is held but one piece) */
  function stream() {
    return dlWipe(c).then(function () { return fetch(url, { cache: 'no-store', credentials: 'same-origin' }); }).then(function (res) {
      if (!res.ok || !res.body) throw new Error('http ' + res.status);
      sig = { e: res.headers.get('etag') || '', l: res.headers.get('last-modified') || '' };
      var rd = res.body.getReader(), buf = new Uint8Array(CH), fill = 0, got = 0, n = 0, ce = (res.headers.get('content-encoding') || '').toLowerCase(), tot = (ce && ce !== 'identity') ? est : (+res.headers.get('content-length') || est), chain = Promise.resolve();
      function pump() {
        return rd.read().then(function (x) {
          if (x.done) return chain.then(function () { return fill ? c.put(PART + (n++), new Response(buf.slice(0, fill))) : null; }).then(function () { next = n; total = got; return fin(); });
          var v = x.value, off = 0;
          while (off < v.length) {
            var take = Math.min(CH - fill, v.length - off);
            buf.set(v.subarray(off, off + take), fill); fill += take; off += take; got += take;
            if (fill === CH) { chain = chain.then((function (part, idx) { return function () { return c.put(PART + idx, new Response(part)); }; })(buf.slice(0, fill), n++)); fill = 0; }
          }
          dlProg(tot ? Math.min(got, Math.floor(tot * 0.99)) : got, tot);
          return chain.then(pump);
        });
      }
      return pump();
    });
  }
  function fin() {
    var ms = [], i;
    for (i = 0; i < next; i++) ms.push(c.match(PART + i));
    return Promise.all(ms).then(function (r) {
      if (!r.length || r.some(function (m) { return !m; })) throw new Error('a part is missing');
      return Promise.all(r.map(function (m) { return m.blob(); }));
    }).then(function (bl) {
      var big = new Blob(bl, { type: 'text/html;charset=utf-8' });
      if (total && big.size !== total) throw new Error('wrong size ' + big.size + ' of ' + total);
      /* the page must look like the page: it starts as a web page and ends as one */
      return Promise.all([big.slice(0, 400).text(), big.slice(Math.max(0, big.size - 400)).text()]).then(function (t) {
        if (!/<!doctype html|<html/i.test(t[0]) || !/<\/html>\s*$/i.test(t[1])) throw new Error('not the page');
        return big;
      });
    }).then(function (big) {
      return c.put(PAGE, new Response(big, { status: 200, headers: { 'Content-Type': 'text/html;charset=utf-8' } }));
    }).then(function () { return c.put(META, new Response(JSON.stringify({ e: sig.e, l: sig.l, n: String(total), b: build }))); })
      .then(function () { return dlWipe(c); }).then(function () { dlProg(total, total); return 'kept'; });
  }
  return caches.open(V).then(function (cc) {
    c = cc;
    return Promise.all([dlJson(c, DL), fetch(scope + 'latest.json?_=' + Date.now(), { cache: 'no-store' }).then(function (r) { return r.json(); }).catch(function () { return null; })]);
  }).then(function (a) {
    st = a[0]; var j = a[1] || {};
    build = +j.b || (st && st.b) || 0;
    est = +j.n || 0;
    tag = build ? 'b' + build : (st && st.tag) || ('x' + Math.floor(Date.now() / 3600000));
    url = scope + '?v=' + encodeURIComponent(tag);
    if (st && st.tag === tag) { next = st.next || 0; total = st.total || 0; sig = st.sig || sig; norange = !!st.nr; return null; }
    return dlWipe(c);
  }).then(function () { if (total) bcast({ type: 'afia-dl', got: Math.min(next * CH, total), tot: total }); return step(); });
}
/* the small page shown at once when the phone has no kept copy yet: a progress bar while the pieces come in, then the platform opens */
var BOOT = '<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="theme-color" content="#2A1D10"><title>منصة عائلة العافية</title><style>'
  + 'html,body{margin:0;min-height:100%;background:#2A1D10;color:#F3E2A9;font:16px/1.7 system-ui,"Segoe UI",Tahoma,Arial,sans-serif}'
  + 'body{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;padding:24px;box-sizing:border-box;min-height:100vh;text-align:center}'
  + 'img{width:min(46vw,190px);height:auto;border-radius:50%}h1{margin:0;font-size:1.5rem;font-weight:700;color:#F0CC6E}p{margin:0;color:#CDBB96;max-width:30em}'
  + '.bar{width:min(80vw,320px);height:8px;border-radius:8px;background:rgba(243,226,169,.18);overflow:hidden}.bar i{display:block;height:100%;width:0;background:linear-gradient(90deg,#E9C467,#F6DE8C);transition:width .3s}'
  + '#s{direction:ltr;color:#FFF0BB;font-weight:600;min-height:1.7em}button{font:inherit;border:0;border-radius:12px;padding:10px 20px;background:#E9C467;color:#2A1D10;font-weight:700}'
  + 'a{color:#CDBB96;font-size:.9rem}[hidden]{display:none}</style></head><body>'
  + '<img src="icon-v11-maskable-512.png" alt=""><h1>منصة عائلة العافية</h1>'
  + '<p id="m">نجهّز المنصة على هذا الجهاز، مرة واحدة فقط، وبعدها تفتح فورًا. يمكنك ترك هذه الصفحة مفتوحة.</p>'
  + '<div class="bar"><i id="f"></i></div><p id="s">…</p><p id="e" hidden>انقطع التنزيل أو بطؤ الإنترنت. نعيد المحاولة تلقائيًا ونكمل من حيث توقفنا.</p><button id="r" hidden>إعادة المحاولة الآن</button><a id="d" href="#">افتحها مباشرة من الإنترنت</a>'
  + '<script>(function(){var f=document.getElementById("f"),s=document.getElementById("s"),e=document.getElementById("e"),r=document.getElementById("r"),d=document.getElementById("d"),M=1048576,done=0;'
  + 'function send(){try{var c=navigator.serviceWorker.controller;if(c)c.postMessage({type:"afia-boot"});else navigator.serviceWorker.ready.then(function(g){if(g.active)g.active.postMessage({type:"afia-boot"})})}catch(x){}}'
  + 'try{navigator.serviceWorker.addEventListener("message",function(ev){var m=ev.data||{};'
  + 'if(m.type==="afia-dl"&&m.tot){var p=Math.min(100,Math.floor(m.got*100/m.tot));f.style.width=p+"%";s.textContent=p+"%  ·  "+(m.got/M).toFixed(1)+" / "+(m.tot/M).toFixed(1)+" MB";e.hidden=true;r.hidden=true}'
  + 'else if(m.type==="afia-kept"&&!done){done=1;f.style.width="100%";s.textContent="100%";location.reload()}'
  + 'else if(m.type==="afia-fail"){e.hidden=false;r.hidden=false}});'
  + 'navigator.serviceWorker.addEventListener("controllerchange",send)}catch(x){}'
  + 'r.onclick=function(){e.hidden=true;r.hidden=true;send()};d.onclick=function(ev){ev.preventDefault();location.href=location.pathname+"?b="+Date.now()};'
  + 'send();setInterval(function(){if(!done)send()},5000)})()</script></body></html>';
/* has the page changed? a small conditional request (a 304 carries no body); only a changed page is downloaded again */
var inflight = null;
function refresh(url) {
  if (inflight) return inflight;
  inflight = refresh1(url).then(function (x) { inflight = null; return x; }, function () { inflight = null; });
  return inflight;
}
function refresh1(url) {
  return caches.open(V).then(function (c) {
    return Promise.all([dlJson(c, META), c.match(BLD).then(function (m) { return m ? m.text() : '0'; }).catch(function () { return '0'; }),
      fetch(self.registration.scope + 'latest.json?_=' + Date.now(), { cache: 'no-store' }).then(function (r) { return r.json(); }).catch(function () { return null; })]).then(function (a) {
      var m = a[0], have = Math.max((m && +m.b) || 0, +a[1] || 0), j = a[2];
      if (!j || !(+j.b > 0)) return;
      if (have) { if (+j.b > have) return download(); return; }
      /* a copy kept before build numbers were recorded: one conditional request settles whether it is the current one */
      var h = {};
      if (m && m.e) h['If-None-Match'] = m.e; else if (m && m.l) h['If-Modified-Since'] = m.l;
      return fetch(bust(url, Math.floor(Date.now() / 300000)), { cache: 'no-store', credentials: 'same-origin', headers: h }).then(function (res) {
        if (!res || !res.ok) return;
        if (res.status === 304) { m = m || {}; m.b = +j.b; return c.put(META, new Response(JSON.stringify(m))); }
        try { res.body && res.body.cancel(); } catch (x) {}
        return download();
      });
    });
  }).catch(function () {});
}
/* «Update now»: the new page goes straight from the network to the browser, and is kept for the next time behind it */
function netPage(base, ev, b) {
  return fetch(bust(base), { cache: 'reload', credentials: 'same-origin' }).then(function (res) {
    if (!res || !res.ok) throw new Error('http');
    var cp = res.clone();
    ev.waitUntil(caches.open(V).then(function (c) { return keepPage(c, cp, b); }).catch(function () {}));
    return res;
  });
}
self.addEventListener('fetch', function (e) {
  var r = e.request, u = new URL(r.url);
  if (r.method !== 'GET' || u.origin !== self.location.origin) return;
  if (/\/latest\.json$/.test(u.pathname) || /\/u\d+\.bin$/.test(u.pathname) || /\/sw\.js$/.test(u.pathname)) return;
  if (r.mode === 'navigate') {
    var base = u.origin + u.pathname, sp = new URL(self.registration.scope).pathname;
    /* only the page itself is handled here (another file opened from this address is left to the network, and is never kept in the page's place) */
    if (u.pathname !== sp && u.pathname !== sp + 'index.html') return;
    /* «Update now» in the app reloads with ?b=<build>: that one must get the newest page, never the saved one */
    var fresh = u.searchParams.has('b');
    e.respondWith(caches.open(V).then(function (c) {
      return c.match(PAGE).then(function (hit) {
        if (fresh) {
          return netPage(base, e, u.searchParams.get('b')).catch(function () {
            /* no network just now: the saved page rather than nothing */
            return hit || new Response(OFFLINE, { status: 503, headers: { 'Content-Type': 'text/html;charset=utf-8' } });
          });
        }
        if (hit) {
          /* instant: the saved page; the check for a newer one waits a few seconds so that it never competes with the opening */
          e.waitUntil(new Promise(function (ok) { setTimeout(ok, 6000); }).then(function () { return refresh(base); }));
          return hit;
        }
        /* nothing kept yet: the small page with the progress bar at once (not a blank screen for as long as the whole download takes) */
        return new Response(BOOT, { status: 200, headers: { 'Content-Type': 'text/html;charset=utf-8', 'Cache-Control': 'no-store' } });
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
    var keep = caches.open(V).then(function (c) { return keepPage(c, res, build); });
    return Promise.all([keep, prog]).then(function () { return got; });
  });
}
self.addEventListener('message', function (e) {
  var d = e.data || {}, src = e.source;
  function say(m) { try { if (src) src.postMessage(m); } catch (x) {} }
  if (d.type === 'afia-boot' || d.type === 'afia-keep') {
    /* the small page (or the platform, for a copy not yet kept) asks that the page be kept: ignored when it already is, joins the download when one is running */
    e.waitUntil(caches.open(V).then(function (c) { return c.match(PAGE); }).then(function (hit) {
      if (hit) return d.type === 'afia-boot' ? bcast({ type: 'afia-kept' }) : null;
      return download().then(function () { return bcast({ type: 'afia-kept' }); }, function (err) { return bcast({ type: 'afia-fail', why: String((err && err.message) || err) }); });
    }).catch(function () {}));
  } else if (d.type === 'afia-ping') {
    say({ type: 'afia-pong', v: 146 });
  } else if (d.type === 'afia-refresh') {
    e.waitUntil(pull(d.build, d.size, say).then(function (n) { say({ type: 'afia-ready', build: d.build, bytes: n }); },
      function (err) { say({ type: 'afia-fail', why: String((err && err.message) || err) }); }));
  } else if (d.type === 'afia-build') {
    /* the running page says which build it is; if no copy is kept yet (first visit), it is kept now, quietly, while the person already uses the page */
    e.waitUntil(caches.open(V).then(function (c) {
      return c.put(BLD, new Response(String(d.b || 0))).then(function () { return c.match(PAGE); }).then(function (hit) {
        if (!hit) return download().then(function () { return bcast({ type: 'afia-kept' }); }, function () {});
      });
    }).catch(function () {}));
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
