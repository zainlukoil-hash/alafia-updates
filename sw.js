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
var BOOT = "<!doctype html><html lang=\"ar\" dir=\"rtl\"><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1,viewport-fit=cover\"><meta name=\"theme-color\" content=\"#2A1D10\"><meta name=\"color-scheme\" content=\"dark\"><title>منصة عائلة العافية</title><style>\n@font-face{font-family:'AfiaQahiri';font-weight:400;font-style:normal;font-display:block;src:url(data:font/woff;base64,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) format('woff')}\n:root{--gold:#F2D57C;--cream:#F6EBD3;--mut:#CDBB96;--ms:min(60vw,31vh,262px)}\n*{box-sizing:border-box}\nhtml,body{margin:0;min-height:100%;background:#2A1D10;color:var(--cream);font:16px/1.7 system-ui,-apple-system,\"Segoe UI\",Roboto,\"Noto Naskh Arabic\",\"Noto Sans Arabic\",Tahoma,sans-serif;-webkit-tap-highlight-color:transparent}\nbody{background:radial-gradient(120% 90% at 50% 0%,#43301E 0,#2A1D10 62%) fixed}\nmain{position:relative;z-index:1;min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;\n padding:max(22px,env(safe-area-inset-top)) max(22px,env(safe-area-inset-right)) max(22px,env(safe-area-inset-bottom)) max(22px,env(safe-area-inset-left))}\n.md{position:relative;width:var(--ms);height:var(--ms);flex:none;margin-bottom:clamp(8px,2.2vh,18px)}\n.md:before{content:\"\";position:absolute;inset:-24%;border-radius:50%;background:radial-gradient(circle,rgba(255,214,106,.26) 0,rgba(242,184,75,.10) 40%,rgba(232,166,58,0) 68%)}\n.md svg{position:relative;display:block;width:100%;height:100%;overflow:visible}\n.md .lg{filter:drop-shadow(0 0 8px rgba(255,205,90,.5))}\n#f{position:fixed;z-index:5;top:0;right:0;height:3px;width:0;border-radius:0 0 3px 3px;background:linear-gradient(270deg,#D9A93C,#FFF0BB);box-shadow:0 0 10px rgba(255,205,90,.6);transition:width .45s ease-out}\n#arc{transition:stroke-dasharray .45s ease-out}\n#hd{transition:opacity .3s}\n.wait #arc{stroke-dasharray:16 84;transform-origin:0 0;animation:rot 1.5s linear infinite}\n.wait #hd{opacity:0}\n.wait #p{visibility:hidden}\n.er #m,.er #t{display:none}\n@keyframes rot{to{transform:rotate(-360deg)}}\nh1{margin:0;font:400 clamp(32px,9.2vw,48px)/1.25 'AfiaQahiri','Amiri','Noto Naskh Arabic',serif;background:linear-gradient(180deg,#FFF0BB 0,#F0CC6E 55%,#CF9B31 100%);-webkit-background-clip:text;background-clip:text;color:transparent;filter:drop-shadow(0 3px 6px rgba(0,0,0,.5))}\n.orn{display:flex;align-items:center;gap:10px;margin:4px 0 8px}\n.orn i{display:block;height:1.5px;width:64px;background:linear-gradient(90deg,transparent,#E9C467)}\n.orn i:last-child{background:linear-gradient(270deg,transparent,#E9C467)}\n.orn b{width:10px;height:10px;border:1.5px solid #E9C467;transform:rotate(45deg);position:relative}\n.orn b:after{content:\"\";position:absolute;inset:2px;background:#E9C467}\n#m{margin:0;max-width:21em;font-size:15.5px;line-height:1.75;color:var(--cream);text-shadow:0 1px 8px rgba(0,0,0,.8)}\n#m small{display:block;color:var(--mut);font-size:13px;margin-top:2px}\n#p{margin:clamp(8px,2vh,16px) 0 0;direction:ltr;font:700 clamp(30px,8.6vw,40px)/1.1 system-ui,-apple-system,\"Segoe UI\",Roboto,sans-serif;font-variant-numeric:tabular-nums;color:#FFE9A8;text-shadow:0 0 14px rgba(255,205,90,.4)}\n#p i{font-style:normal;font-size:.55em;margin-inline-start:2px;opacity:.85}\n#s{margin:2px 0 0;unicode-bidi:plaintext;color:var(--cream);font-weight:600;font-size:14.5px;min-height:1.7em;font-variant-numeric:tabular-nums}\n#t{margin:0;color:var(--mut);font-size:13px;min-height:1.7em}\n#t span{direction:ltr;unicode-bidi:isolate;font-variant-numeric:tabular-nums}\n#e{margin:12px 0 0;max-width:21em;padding:9px 14px;border:1px solid rgba(255,180,162,.45);border-radius:13px;background:rgba(255,180,162,.08);color:#FFD9CF;font-size:13.5px;line-height:1.7}\nbutton{margin-top:10px;min-height:44px;font:700 15px/1.2 inherit;font-family:inherit;border:0;border-radius:13px;padding:0 24px;background:linear-gradient(180deg,#F6DE92,#D9A93C);color:#2A1D10;box-shadow:0 6px 18px rgba(0,0,0,.35);cursor:pointer}\na{margin-top:14px;color:var(--mut);font-size:13px;text-decoration:underline;text-underline-offset:3px;opacity:.9}\n[hidden]{display:none!important}\n@media (max-height:520px){main{flex-direction:row;gap:26px;flex-wrap:wrap}.md{margin:0}}\n@media (prefers-reduced-motion:reduce){.wait #arc{animation:none}#arc,#hd,#f{transition:none}}\n\n.cal{position:fixed;inset:0;z-index:0;overflow:hidden;pointer-events:none;contain:strict}\n.cal .wl{position:absolute;left:50%;top:50%;width:150vmax;height:var(--h);margin:calc(var(--h)/-2) 0 0 -75vmax;transform:rotate(-13deg)}\n.cal p{position:absolute;left:0;right:0;top:var(--t);margin:0;display:flex;justify-content:center;white-space:nowrap;font:400 var(--s)/1 'AfiaQahiri','Amiri',serif;word-spacing:.32em;color:rgba(242,213,124,var(--a));transform:translateX(var(--o,0))}\n.cal .lit{position:absolute;inset:0;-webkit-mask-image:radial-gradient(circle 62vmin at 50% var(--cy,42%),#000 0,rgba(0,0,0,.55) 48%,rgba(0,0,0,0) 100%);mask-image:radial-gradient(circle 62vmin at 50% var(--cy,42%),#000 0,rgba(0,0,0,.55) 48%,rgba(0,0,0,0) 100%)}\n.cal .lit p{color:rgba(255,226,152,var(--b))}\n.cal:after{content:\"\";position:absolute;inset:0;background:radial-gradient(120% 100% at 50% 46%,rgba(0,0,0,0) 52%,rgba(10,6,2,.6) 100%)}\n</style></head><body class=\"wait\"><i id=\"f\"></i><div class=\"cal\" aria-hidden=\"true\" style=\"--cy:36%;--h:331.2vmin\"><div class=\"wl\"><p style=\"--t:0.00vmin;--s:9.4vmin;--a:0.052;--o:-8.0vmin\">العافية عائلة العافية منصة العافية عائلة العافية منصة عائلة العافية</p><p style=\"--t:9.12vmin;--s:9.4vmin;--a:0.036;--o:-1.6vmin\">منصة منصة العافية العافية العافية العافية العافية عائلة منصة عائلة</p><p style=\"--t:18.24vmin;--s:14.2vmin;--a:0.064;--o:4.8vmin\">عائلة عائلة العافية عائلة العافية العافية عائلة</p><p style=\"--t:32.01vmin;--s:9.4vmin;--a:0.040;--o:-6.4vmin\">العافية منصة منصة العافية عائلة العافية العافية عائلة عائلة عائلة</p><p style=\"--t:41.13vmin;--s:9.4vmin;--a:0.054;--o:0.0vmin\">العافية العافية عائلة عائلة العافية العافية العافية عائلة عائلة العافية</p><p style=\"--t:50.25vmin;--s:29.0vmin;--a:0.034;--o:6.4vmin\">العافية العافية عائلة العافية</p><p style=\"--t:78.38vmin;--s:9.4vmin;--a:0.036;--o:-4.8vmin\">العافية عائلة منصة منصة عائلة منصة منصة عائلة العافية العافية</p><p style=\"--t:87.49vmin;--s:14.2vmin;--a:0.052;--o:1.6vmin\">العافية العافية منصة العافية منصة العافية العافية</p><p style=\"--t:101.27vmin;--s:9.4vmin;--a:0.046;--o:8.0vmin\">منصة العافية العافية منصة عائلة العافية عائلة منصة العافية العافية</p><p style=\"--t:110.39vmin;--s:9.4vmin;--a:0.052;--o:-3.2vmin\">العافية منصة منصة العافية العافية عائلة العافية عائلة عائلة العافية</p><p style=\"--t:119.50vmin;--s:9.4vmin;--a:0.036;--o:3.2vmin\">منصة العافية عائلة عائلة العافية العافية منصة عائلة منصة عائلة</p><p style=\"--t:128.62vmin;--s:14.2vmin;--a:0.064;--o:-8.0vmin\">العافية العافية العافية منصة منصة العافية عائلة</p><p style=\"--t:142.40vmin;--s:9.4vmin;--a:0.040;--o:-1.6vmin\">منصة العافية منصة منصة عائلة عائلة منصة العافية العافية العافية</p><p style=\"--t:151.51vmin;--s:9.4vmin;--a:0.054;--o:4.8vmin\">العافية عائلة منصة عائلة العافية منصة منصة العافية العافية العافية</p><p style=\"--t:160.63vmin;--s:29.0vmin;--a:0.034;--o:-6.4vmin\">العافية العافية منصة العافية</p><p style=\"--t:188.76vmin;--s:9.4vmin;--a:0.036;--o:0.0vmin\">العافية العافية العافية منصة عائلة منصة منصة عائلة العافية منصة</p><p style=\"--t:197.88vmin;--s:14.2vmin;--a:0.052;--o:6.4vmin\">العافية منصة العافية منصة العافية العافية عائلة</p><p style=\"--t:211.65vmin;--s:9.4vmin;--a:0.046;--o:-4.8vmin\">العافية العافية العافية منصة العافية العافية منصة العافية العافية منصة</p><p style=\"--t:220.77vmin;--s:9.4vmin;--a:0.052;--o:1.6vmin\">عائلة منصة منصة العافية العافية العافية عائلة عائلة منصة منصة</p><p style=\"--t:229.89vmin;--s:9.4vmin;--a:0.036;--o:8.0vmin\">منصة العافية عائلة عائلة العافية منصة عائلة العافية عائلة العافية</p><p style=\"--t:239.01vmin;--s:14.2vmin;--a:0.064;--o:-3.2vmin\">العافية منصة العافية العافية العافية عائلة العافية</p><p style=\"--t:252.78vmin;--s:9.4vmin;--a:0.040;--o:3.2vmin\">العافية العافية العافية عائلة العافية عائلة العافية العافية منصة العافية</p><p style=\"--t:261.90vmin;--s:9.4vmin;--a:0.054;--o:-8.0vmin\">العافية العافية عائلة العافية العافية عائلة العافية منصة العافية العافية</p><p style=\"--t:271.02vmin;--s:29.0vmin;--a:0.034;--o:-1.6vmin\">العافية منصة العافية العافية</p><p style=\"--t:299.15vmin;--s:9.4vmin;--a:0.036;--o:4.8vmin\">العافية عائلة العافية منصة منصة منصة عائلة منصة منصة عائلة</p><p style=\"--t:308.27vmin;--s:14.2vmin;--a:0.052;--o:-6.4vmin\">عائلة عائلة العافية العافية منصة منصة العافية</p><p style=\"--t:322.04vmin;--s:9.4vmin;--a:0.046;--o:0.0vmin\">عائلة منصة عائلة عائلة منصة منصة العافية العافية منصة عائلة</p></div><div class=\"lit\"><div class=\"wl\"><p style=\"--t:101.27vmin;--s:9.4vmin;--a:0.046;--b:0.166;--o:8.0vmin\">منصة العافية العافية منصة عائلة العافية عائلة منصة العافية العافية</p><p style=\"--t:110.39vmin;--s:9.4vmin;--a:0.052;--b:0.187;--o:-3.2vmin\">العافية منصة منصة العافية العافية عائلة العافية عائلة عائلة العافية</p><p style=\"--t:119.50vmin;--s:9.4vmin;--a:0.036;--b:0.130;--o:3.2vmin\">منصة العافية عائلة عائلة العافية العافية منصة عائلة منصة عائلة</p><p style=\"--t:128.62vmin;--s:14.2vmin;--a:0.064;--b:0.200;--o:-8.0vmin\">العافية العافية العافية منصة منصة العافية عائلة</p><p style=\"--t:142.40vmin;--s:9.4vmin;--a:0.040;--b:0.144;--o:-1.6vmin\">منصة العافية منصة منصة عائلة عائلة منصة العافية العافية العافية</p><p style=\"--t:151.51vmin;--s:9.4vmin;--a:0.054;--b:0.194;--o:4.8vmin\">العافية عائلة منصة عائلة العافية منصة منصة العافية العافية العافية</p><p style=\"--t:160.63vmin;--s:29.0vmin;--a:0.034;--b:0.122;--o:-6.4vmin\">العافية العافية منصة العافية</p><p style=\"--t:188.76vmin;--s:9.4vmin;--a:0.036;--b:0.130;--o:0.0vmin\">العافية العافية العافية منصة عائلة منصة منصة عائلة العافية منصة</p><p style=\"--t:197.88vmin;--s:14.2vmin;--a:0.052;--b:0.187;--o:6.4vmin\">العافية منصة العافية منصة العافية العافية عائلة</p><p style=\"--t:211.65vmin;--s:9.4vmin;--a:0.046;--b:0.166;--o:-4.8vmin\">العافية العافية العافية منصة العافية العافية منصة العافية العافية منصة</p><p style=\"--t:220.77vmin;--s:9.4vmin;--a:0.052;--b:0.187;--o:1.6vmin\">عائلة منصة منصة العافية العافية العافية عائلة عائلة منصة منصة</p><p style=\"--t:229.89vmin;--s:9.4vmin;--a:0.036;--b:0.130;--o:8.0vmin\">منصة العافية عائلة عائلة العافية منصة عائلة العافية عائلة العافية</p></div></div></div><main><div class=\"md\"><svg viewBox=\"-8 -8 216 216\" aria-hidden=\"true\" focusable=\"false\"><defs><symbol id=\"lgo\" viewBox=\"0 0 100 100\"><defs><radialGradient id=\"lbg\" cx=\"50%\" cy=\"0%\" r=\"120%\"><stop offset=\"0\" stop-color=\"#5E6A33\"/><stop offset=\".55\" stop-color=\"#34401B\"/><stop offset=\"1\" stop-color=\"#1E280F\"/></radialGradient><radialGradient id=\"ldk\" cx=\"50%\" cy=\"38%\" r=\"62%\"><stop offset=\"0\" stop-color=\"#FFF4CC\"/><stop offset=\".7\" stop-color=\"#F0DB92\"/><stop offset=\"1\" stop-color=\"#D4B04A\"/></radialGradient></defs><circle cx=\"50\" cy=\"50\" r=\"48.50\" fill=\"#C9A227\"/><circle cx=\"50\" cy=\"50\" r=\"45.35\" fill=\"url(#ldk)\"/><g transform=\"translate(50 50) scale(1.2787) translate(-32 -43.4)\"><path d=\"M24.6 63.8 C29.4 61 30.4 54.5 29.6 46 L34.4 46 C33.6 54.5 34.6 61 39.4 63.8 Q32 62.4 24.6 63.8 Z\" fill=\"#4A3A1A\"/><path d=\"M32 46 Q26.19 35.61 11.25 33.26\" fill=\"none\" stroke=\"#7A6232\" stroke-width=\"3\" stroke-linecap=\"round\"/><path d=\"M32 46 Q28.61 27.86 19.90 23.57\" fill=\"none\" stroke=\"#7A6232\" stroke-width=\"3\" stroke-linecap=\"round\"/><path d=\"M32 46 Q32.00 25.00 32.00 20.00\" fill=\"none\" stroke=\"#7A6232\" stroke-width=\"3\" stroke-linecap=\"round\"/><path d=\"M32 46 Q35.39 27.86 44.10 23.57\" fill=\"none\" stroke=\"#7A6232\" stroke-width=\"3\" stroke-linecap=\"round\"/><path d=\"M32 46 Q37.81 35.61 52.75 33.26\" fill=\"none\" stroke=\"#7A6232\" stroke-width=\"3\" stroke-linecap=\"round\"/><path d=\"M32 46 Q16.88 43.50 4.50 48.50\" fill=\"none\" stroke=\"#7A6232\" stroke-width=\"3\" stroke-linecap=\"round\"/><path d=\"M32 46 Q47.12 43.50 59.50 48.50\" fill=\"none\" stroke=\"#7A6232\" stroke-width=\"3\" stroke-linecap=\"round\"/><circle cx=\"11.25\" cy=\"33.26\" r=\"5.6\" fill=\"#3DB1A8\" stroke=\"#4A3A1A\" stroke-width=\"1.8\"/><circle cx=\"19.90\" cy=\"23.57\" r=\"5.6\" fill=\"#E8B33E\" stroke=\"#4A3A1A\" stroke-width=\"1.8\"/><circle cx=\"32.00\" cy=\"20.00\" r=\"5.6\" fill=\"#D8604F\" stroke=\"#4A3A1A\" stroke-width=\"1.8\"/><circle cx=\"44.10\" cy=\"23.57\" r=\"5.6\" fill=\"#9A78C6\" stroke=\"#4A3A1A\" stroke-width=\"1.8\"/><circle cx=\"52.75\" cy=\"33.26\" r=\"5.6\" fill=\"#8DBB52\" stroke=\"#4A3A1A\" stroke-width=\"1.8\"/><circle cx=\"4.50\" cy=\"48.50\" r=\"5.6\" fill=\"#D8604F\" stroke=\"#4A3A1A\" stroke-width=\"1.8\"/><circle cx=\"59.50\" cy=\"48.50\" r=\"5.6\" fill=\"#E8B33E\" stroke=\"#4A3A1A\" stroke-width=\"1.8\"/><circle cx=\"19.50\" cy=\"34.00\" r=\"2.8\" fill=\"#FBF3D8\" stroke=\"#4A3A1A\" stroke-width=\"1.3\"/><circle cx=\"44.50\" cy=\"34.00\" r=\"2.8\" fill=\"#FBF3D8\" stroke=\"#4A3A1A\" stroke-width=\"1.3\"/><circle cx=\"32\" cy=\"46\" r=\"6.6\" fill=\"#FBF3D8\" stroke=\"#4A3A1A\" stroke-width=\"2.1\"/></g></symbol><linearGradient id=\"pgr\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"1\"><stop offset=\"0\" stop-color=\"#D9A93C\"/><stop offset=\".55\" stop-color=\"#F2D57C\"/><stop offset=\"1\" stop-color=\"#FFF0BB\"/></linearGradient><radialGradient id=\"dsk\" cx=\"50%\" cy=\"30%\" r=\"75%\"><stop offset=\"0\" stop-color=\"#3A280F\"/><stop offset=\"1\" stop-color=\"#160E06\"/></radialGradient></defs><circle cx=\"100\" cy=\"100\" r=\"72\" fill=\"url(#dsk)\" stroke=\"#F2D57C\" stroke-width=\"2\" stroke-opacity=\".9\"/><use class=\"lg\" href=\"#lgo\" x=\"49\" y=\"49\" width=\"102\" height=\"102\"/><g fill=\"none\" stroke=\"#E9C467\"><circle cx=\"100\" cy=\"100\" r=\"98.5\" stroke-width=\"1.6\" opacity=\".95\"/><circle cx=\"100\" cy=\"100\" r=\"94.6\" stroke-width=\".7\" opacity=\".5\"/><circle cx=\"100\" cy=\"100\" r=\"89.6\" stroke=\"#F2D57C\" stroke-width=\"4.2\" stroke-dasharray=\"1.15 4.707\" stroke-dashoffset=\"-.575\" opacity=\".55\"/><circle cx=\"100\" cy=\"100\" r=\"84.6\" stroke-width=\".7\" opacity=\".5\"/><circle cx=\"100\" cy=\"100\" r=\"75.6\" stroke-width=\".8\" opacity=\".55\"/></g><g fill=\"#F2D57C\"><path transform=\"rotate(0 100 100)\" d=\"M100 -3.6L104.4 1.5L100 6.6L95.6 1.5Z\"/><path transform=\"rotate(90 100 100)\" d=\"M100 -3.6L104.4 1.5L100 6.6L95.6 1.5Z\"/><path transform=\"rotate(180 100 100)\" d=\"M100 -3.6L104.4 1.5L100 6.6L95.6 1.5Z\"/><path transform=\"rotate(270 100 100)\" d=\"M100 -3.6L104.4 1.5L100 6.6L95.6 1.5Z\"/><g opacity=\".8\"><circle cx=\"137.69\" cy=\"9.00\" r=\"1.35\"/><circle cx=\"191.00\" cy=\"62.31\" r=\"1.35\"/><circle cx=\"191.00\" cy=\"137.69\" r=\"1.35\"/><circle cx=\"137.69\" cy=\"191.00\" r=\"1.35\"/><circle cx=\"62.31\" cy=\"191.00\" r=\"1.35\"/><circle cx=\"9.00\" cy=\"137.69\" r=\"1.35\"/><circle cx=\"9.00\" cy=\"62.31\" r=\"1.35\"/><circle cx=\"62.31\" cy=\"9.00\" r=\"1.35\"/></g></g><circle cx=\"100\" cy=\"100\" r=\"80\" fill=\"none\" stroke=\"#F2D57C\" stroke-opacity=\".14\" stroke-width=\"3.2\"/><g transform=\"translate(100 100) scale(-1 1) rotate(-90)\"><circle id=\"arc\" r=\"80\" fill=\"none\" stroke=\"url(#pgr)\" stroke-width=\"3.8\" stroke-linecap=\"round\" pathLength=\"100\" stroke-dasharray=\"0 100\"/></g><g id=\"hd\" opacity=\"0\"><circle id=\"h1\" r=\"6\" fill=\"#FFD76A\" opacity=\".35\"/><circle id=\"h2\" r=\"2.9\" fill=\"#FFF3C9\"/></g></svg></div><h1>منصة عائلة العافية</h1><div class=\"orn\" aria-hidden=\"true\"><i></i><b></b><i></i></div><p id=\"m\">نجهّز المنصة على هذا الجهاز، مرة واحدة فقط، وبعدها تفتح فورًا.<small>يمكنك ترك هذه الصفحة مفتوحة.</small></p><p id=\"p\" aria-live=\"off\">0<i>%</i></p><p id=\"s\">نبدأ التنزيل…</p><p id=\"t\"></p><p id=\"e\" hidden>انقطع التنزيل أو بطؤ الإنترنت. نعيد المحاولة تلقائيًا ونكمل من حيث توقفنا.</p><button id=\"r\" hidden>إعادة المحاولة الآن</button><a id=\"d\" href=\"#\">افتحها مباشرة من الإنترنت</a></main><script>(function(){var $=function(i){return document.getElementById(i)},f=$(\"f\"),arc=$(\"arc\"),hd=$(\"hd\"),h1=$(\"h1\"),h2=$(\"h2\"),pe=$(\"p\"),s=$(\"s\"),t=$(\"t\"),m=$(\"m\"),e=$(\"e\"),r=$(\"r\"),d=$(\"d\"),M=1048576,done=0,lt=0,lg=0,sp=0,R=80;\nfunction send(){try{var c=navigator.serviceWorker.controller;if(c)c.postMessage({type:\"afia-boot\"});else navigator.serviceWorker.ready.then(function(g){if(g.active)g.active.postMessage({type:\"afia-boot\"})})}catch(x){}}\nfunction ring(p){arc.style.strokeDasharray=p+\" \"+(100-p);var a=p/100*6.2832,x=100-R*Math.sin(a),y=100-R*Math.cos(a);h1.setAttribute(\"cx\",x);h1.setAttribute(\"cy\",y);h2.setAttribute(\"cx\",x);h2.setAttribute(\"cy\",y);hd.setAttribute(\"opacity\",p>0.5&&p<99.5?\"1\":\"0\")}\nfunction eta(sec){if(!(sec>=0)||sec>5400)return\"\";if(sec<60)return\"نحو \"+Math.max(1,Math.round(sec))+\" ث\";return\"نحو \"+Math.round(sec/60)+\" د\"}\nfunction on(mm){if(mm.type===\"afia-dl\"&&mm.tot){document.body.className=\"\";var p=Math.min(100,mm.got*100/mm.tot),now=Date.now();ring(p);f.style.width=Math.floor(p)+\"%\";pe.firstChild.nodeValue=Math.floor(p);\ns.textContent=(mm.got/M).toFixed(1)+\" / \"+(mm.tot/M).toFixed(1)+\" MB\";\nif(!lt){lt=now;lg=mm.got}else if(now-lt>=1200){var v=(mm.got-lg)/((now-lt)/1000);if(v>=0){sp=sp?sp*.6+v*.4:v}lt=now;lg=mm.got}\nif(sp>2048){t.innerHTML='<span>'+(sp/M).toFixed(1)+' MB/s</span> · المتبقي '+eta((mm.tot-mm.got)/sp)}\ne.hidden=true;r.hidden=true}\nelse if(mm.type===\"afia-kept\"&&!done){done=1;document.body.className=\"\";ring(100);f.style.width=\"100%\";pe.firstChild.nodeValue=\"100\";t.textContent=\"جاهزة، نفتح المنصة…\";location.reload()}\nelse if(mm.type===\"afia-fail\"){e.hidden=false;r.hidden=false;document.body.className=\"er\"}}\ntry{navigator.serviceWorker.addEventListener(\"message\",function(ev){on(ev.data||{})});navigator.serviceWorker.addEventListener(\"controllerchange\",send)}catch(x){}\nr.onclick=function(){e.hidden=true;r.hidden=true;document.body.className=\"\";send()};d.onclick=function(ev){ev.preventDefault();location.href=location.pathname+\"?b=\"+Date.now()};\nsend();setInterval(function(){if(!done)send()},5000)})()</script></body></html>";
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
