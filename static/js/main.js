// Safe Ocean – drobné vanilla JS: hlavička den/noc, menu, odhalení, večerní série, konfigurátor, obchod a košík.
(function () {
  'use strict';
  var d = document, root = d.documentElement;
  root.classList.add('js');
  var base = d.body.getAttribute('data-base') || '/';
  var kc = function (n) { return Math.round(n).toLocaleString('cs-CZ').replace(/\s/g, ' ') + ' Kč'; };
  var $ = function (s, el) { return (el || d).querySelector(s); };
  var $$ = function (s, el) { return Array.prototype.slice.call((el || d).querySelectorAll(s)); };

  /* ── hlavička: posun + den/noc podle sekce pod ní ── */
  var hl = $('[data-hlavicka]');
  var nocni = $$('[data-noc], .vecer__krok[data-krok="2"], .vecer__krok[data-krok="3"]');
  var tik = false;
  function hlavicka() {
    tik = false;
    hl.classList.toggle('je-posunuta', window.scrollY > 8);
    var y = 34, noc = false;
    for (var i = 0; i < nocni.length; i++) {
      var r = nocni[i].getBoundingClientRect();
      if (r.top <= y && r.bottom > y) { noc = true; break; }
    }
    // večerní sekce: noc až ve spodní tmavé části
    var vec = $('.vecer');
    if (!noc && vec) {
      var rv = vec.getBoundingClientRect();
      if (rv.top <= y && rv.bottom > y && (y - rv.top) / rv.height > .5) noc = true;
    }
    hl.classList.toggle('hlavicka--noc', noc);
  }
  if (hl) {
    window.addEventListener('scroll', function () { if (!tik) { tik = true; requestAnimationFrame(hlavicka); } }, { passive: true });
    window.addEventListener('resize', hlavicka);
    hlavicka();
  }

  /* ── mobilní menu ── */
  var burger = $('.burger'), menu = $('#menu');
  function zavri() { burger.setAttribute('aria-expanded', 'false'); menu.classList.remove('je-otevrene'); d.body.classList.remove('menu-otevrene'); }
  if (burger && menu) {
    burger.addEventListener('click', function () {
      var o = burger.getAttribute('aria-expanded') !== 'true';
      burger.setAttribute('aria-expanded', String(o));
      menu.classList.toggle('je-otevrene', o);
      d.body.classList.toggle('menu-otevrene', o);
    });
    $$('a', menu).forEach(function (a) { a.addEventListener('click', zavri); });
    d.addEventListener('keydown', function (e) { if (e.key === 'Escape') zavri(); });
  }

  /* ── odhalení při scrollu ── */
  var rev = $$('.reveal');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (zaz) {
      zaz.forEach(function (z) { if (z.isIntersecting) { z.target.classList.add('je-videt'); io.unobserve(z.target); } });
    }, { rootMargin: '0px 0px -8% 0px', threshold: .08 });
    rev.forEach(function (el) { io.observe(el); });
  } else { rev.forEach(function (el) { el.classList.add('je-videt'); }); }

  /* ── večerní série: záloha pro prohlížeče bez scroll-driven animací ── */
  var ramec = $('.vecer__ramec');
  var podpora = window.CSS && CSS.supports && CSS.supports('animation-timeline: view()');
  if (ramec && (!podpora || matchMedia('(prefers-reduced-motion: reduce)').matches) && 'IntersectionObserver' in window) {
    ramec.setAttribute('data-faze', '1');
    var kio = new IntersectionObserver(function (zaz) {
      zaz.forEach(function (z) { if (z.isIntersecting) ramec.setAttribute('data-faze', z.target.getAttribute('data-krok')); });
    }, { rootMargin: '-45% 0px -45% 0px' });
    $$('.vecer__krok').forEach(function (k) { kio.observe(k); });
  }

  /* ── konfigurátor ── */
  var konf = $('[data-konf]');
  if (konf) {
    var sekce = konf.closest('.konf');
    var svg = $('[data-svg]', konf);
    var n = function (k) { return $('[data-n="' + k + '"]', svg); };
    var hodnota = function (k) { return +$('[data-k="' + k + '"]', konf).value; };
    var vyber = function (nm) { var i = $('input[name="' + nm + '"]:checked', konf); return i ? i.value : ''; };
    var setR = function (el, x, y, w, h) { el.setAttribute('x', x); el.setAttribute('y', y); el.setAttribute('width', Math.max(0, w)); el.setAttribute('height', Math.max(0, h)); };
    var vypocet = function () {
      var D = hodnota('d'), V = hodnota('v'), H = hodnota('h'), typ = vyber('k-typ'), misto = vyber('k-misto');
      sekce.setAttribute('data-typ', typ);
      $$('input[type="range"]', konf).forEach(function (r) { r.style.setProperty('--p', ((r.value - r.min) / (r.max - r.min) * 100) + '%'); });
      $('[data-out="d"]', konf).textContent = D + ' cm';
      $('[data-out="v"]', konf).textContent = V + ' cm';
      $('[data-out="h"]', konf).textContent = H + ' cm';
      var litru = D * V * H / 1000;
      var hustota = typ === 'morske' ? 1.025 : 1;
      var kg = litru * hustota;
      var m2 = kg / (D * H / 10000);
      $('[data-r="l"]', konf).textContent = Math.round(litru).toLocaleString('cs-CZ') + ' l';
      $('[data-r="kg"]', konf).textContent = Math.round(kg).toLocaleString('cs-CZ') + ' kg';
      $('[data-r="m2"]', konf).textContent = Math.round(m2).toLocaleString('cs-CZ') + ' kg/m²';
      var pozn = 'Jen voda – bez skla, skříně, kamenů a techniky. ';
      pozn += m2 > 300 ? '<b>Takovou zátěž řešíme roznášecí konstrukcí nebo kotvením k nosné konstrukci</b> – jako u akvária v panelovém domě.' : 'Statiku vždy počítáme pro konkrétní podlahu.';
      $('[data-r="pozn"]', konf).innerHTML = pozn;

      // nákres: měřítko podle šířky (délka + postava) a výšky (skříň + nádrž vs. 175 cm)
      var podlaha = 280, skrin = misto === 've stěně' ? 95 : 85;
      var sirka = D + 110, vyska = Math.max(skrin + V, 175) + 30;
      var s = Math.min(560 / sirka, 260 / vyska);
      var x0 = 20 + (560 - sirka * s) / 2 + 70 * s;
      var tw = D * s, th = V * s, sh = skrin * s;
      var ty = podlaha - sh - th;
      setR(n('skrin'), x0, podlaha - sh, tw, sh);
      setR(n('sklo'), x0, ty, tw, th);
      setR(n('voda'), x0 + 1, ty + th * .07, tw - 2, th * .93 - 1);
      n('skrin').style.opacity = misto === 'mezi místnostmi' ? .55 : 1;
      // postava 175 cm
      var c = n('clovek'), ch = 175 * s, cx = x0 - 45 * s;
      var hlava = 11 * s;
      $('circle', c).setAttribute('cx', cx); $('circle', c).setAttribute('cy', podlaha - ch + hlava); $('circle', c).setAttribute('r', hlava);
      var tY = podlaha - ch + hlava * 2.15, sw = 22 * s;
      $('path', c).setAttribute('d', 'M' + (cx - sw) + ',' + (tY + 4 * s) + ' q0,-' + (4 * s) + ' ' + (5 * s) + ',-' + (4 * s) + ' h' + (2 * sw - 10 * s) + ' q' + (5 * s) + ',0 ' + (5 * s) + ',' + (4 * s) +
        ' v' + (62 * s) + ' h-' + (6 * s) + ' v' + (podlaha - tY - 66 * s) + ' h-' + (sw - 4 * s) + ' v-' + (78 * s) + ' h-' + (2 * s) + ' v' + (78 * s) + ' h-' + (sw - 4 * s) + ' v-' + (podlaha - tY - 66 * s) + ' h-' + (6 * s) + ' z');
      var kd = n('kota-d'); kd.setAttribute('x', x0 + tw / 2); kd.setAttribute('y', ty - 10); kd.textContent = D + ' × ' + H + ' cm, výška ' + V + ' cm';
      var kv = n('kota-v'); kv.setAttribute('x', x0 + tw + 8); kv.setAttribute('y', ty + th / 2 + 4); kv.textContent = Math.round(litru).toLocaleString('cs-CZ') + ' l';
      var kc2 = n('kota-c'); kc2.setAttribute('x', cx); kc2.setAttribute('y', podlaha + 16);
      return { D: D, V: V, H: H, typ: typ === 'morske' ? 'mořské' : 'sladkovodní', misto: misto, litru: Math.round(litru) };
    };
    konf.addEventListener('input', vypocet);
    konf.addEventListener('change', vypocet);
    vypocet();
    var odeslat = $('[data-konf-odeslat]', konf);
    odeslat.addEventListener('click', function () {
      var v = vypocet();
      var t = $('#poptavka-zprava');
      if (t) {
        t.value = 'Dobrý den, zajímá mě ' + v.typ + ' akvárium ' + v.misto + ', zhruba ' + v.D + ' × ' + v.H + ' cm, výška ' + v.V + ' cm (cca ' + v.litru.toLocaleString('cs-CZ') + ' l). ';
        setTimeout(function () { t.focus({ preventScroll: true }); }, 600);
      }
    });
  }

  /* ── předvyplnění tématu z ?tema= ── */
  var tema = new URLSearchParams(location.search).get('tema');
  if (tema && $('#poptavka-zprava')) { $('#poptavka-zprava').value = 'Dobrý den, mám zájem o: ' + tema + '. '; }

  /* ── formulář poptávky (návrh: nic neodesílá) ── */
  $$('form.formular').forEach(function (f) {
    var stav = $('.formular-stav', f);
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      if ($('.past input', f).value) return;
      var endpoint = f.getAttribute('data-endpoint');
      if (f.getAttribute('data-demo') === '1' || !endpoint) {
        stav.textContent = 'Ukázka formuláře: v návrhu se nic neodesílá. Po spuštění webu přijde poptávka na ' + 'husa@safeocean.cz.';
        return;
      }
      stav.textContent = 'Odesílám…';
      fetch(endpoint, { method: 'POST', body: new FormData(f), headers: { Accept: 'application/json' } })
        .then(function (r) { if (!r.ok) throw new Error(r.status); f.reset(); stav.textContent = 'Děkujeme, ozveme se obvykle do druhého dne.'; })
        .catch(function () { stav.textContent = 'Odeslání se nepodařilo. Napište nám prosím e-mailem.'; });
    });
  });

  /* ── košík (localStorage, s try/catch) ── */
  var KLIC = 'safeocean-kosik';
  var pamet = [];
  function nacti() { try { return JSON.parse(localStorage.getItem(KLIC)) || []; } catch (e) { return pamet; } }
  function uloz(k) { pamet = k; try { localStorage.setItem(KLIC, JSON.stringify(k)); } catch (e) {} pocitadlo(true); }
  function pocitadlo(puls) {
    var k = nacti(), c = k.reduce(function (s, p) { return s + p.pocet; }, 0);
    $$('[data-kosik-pocet]').forEach(function (b) {
      b.textContent = c; b.hidden = c === 0;
      if (puls && c) { b.classList.remove('puls'); void b.offsetWidth; b.classList.add('puls'); }
    });
  }
  function pridej(data, pocet) {
    var k = nacti(), id = data.slug + '|' + (data.varianta || '');
    var p = k.filter(function (x) { return x.id === id; })[0];
    if (p) p.pocet = Math.min(20, p.pocet + pocet);
    else k.push({ id: id, slug: data.slug, nazev: data.nazev, varianta: data.varianta || '', cena: +data.cena, ziva: data.ziva === '1', foto: data.foto, pocet: pocet });
    uloz(k);
  }
  pocitadlo(false);

  // tlačítka + na kartách
  d.addEventListener('click', function (e) {
    var b = e.target.closest('.pridat[data-pridat]');
    if (!b) return;
    pridej(b.dataset, 1);
    b.classList.add('je-pridano');
    b.setAttribute('aria-label', 'Přidáno do košíku');
    setTimeout(function () { b.classList.remove('je-pridano'); }, 900);
  });

  // detail produktu
  var nakup = $('[data-nakup]');
  if (nakup) {
    var tl = $('button[data-pridat]', nakup), vstup = $('input[name="pocet"]', nakup), potvrz = $('.pd__potvrzeni', nakup);
    var cenaEl = $('[data-cena-zobraz]');
    $('[data-minus]', nakup).addEventListener('click', function () { vstup.value = Math.max(1, +vstup.value - 1); });
    $('[data-plus]', nakup).addEventListener('click', function () { vstup.value = Math.min(20, +vstup.value + 1); });
    $$('input[name="varianta"]', nakup).forEach(function (r) {
      r.addEventListener('change', function () { tl.dataset.cena = r.dataset.cena; tl.dataset.varianta = r.value; cenaEl.textContent = kc(r.dataset.cena); });
    });
    nakup.addEventListener('submit', function (e) {
      e.preventDefault();
      var pocet = Math.max(1, Math.min(20, parseInt(vstup.value, 10) || 1));
      pridej(tl.dataset, pocet);
      potvrz.innerHTML = 'Přidáno do košíku (' + pocet + ' ks). <a href="' + base + 'kosik/">Přejít do košíku</a>';
    });
  }

  // galerie produktu
  var gal = $('[data-galerie]');
  if (gal) {
    var hlavni = $('.pd__hlavni img', gal);
    $$('.pd__nahledy button', gal).forEach(function (b) {
      b.addEventListener('click', function () {
        hlavni.removeAttribute('srcset'); hlavni.src = b.dataset.foto;
        $$('.pd__nahledy button', gal).forEach(function (x) { x.removeAttribute('aria-current'); });
        b.setAttribute('aria-current', 'true');
      });
    });
  }

  /* ── obchod: filtr a řazení ── */
  var mriz = $('[data-produkty]');
  if (mriz) {
    var karty = $$('.karta', mriz), tlac = $$('[data-filtr]');
    var filtruj = function (kat) {
      tlac.forEach(function (t) { t.setAttribute('aria-pressed', String(t.dataset.filtr === kat)); });
      karty.forEach(function (k) { k.hidden = !!kat && k.dataset.kat !== kat; });
    };
    tlac.forEach(function (t) {
      t.addEventListener('click', function () {
        filtruj(t.dataset.filtr);
        try { history.replaceState(null, '', t.dataset.filtr ? '#' + t.dataset.filtr : location.pathname); } catch (e) {}
      });
    });
    $('[data-razeni]').addEventListener('change', function (e) {
      var v = e.target.value;
      karty.slice().sort(function (a, b) {
        if (!v) return a.dataset.poradi - b.dataset.poradi;
        var x = +a.dataset.cena || 1e9, y = +b.dataset.cena || 1e9;
        if (v === 'cena-desc') { x = +a.dataset.cena || -1; y = +b.dataset.cena || -1; return y - x; }
        return x - y;
      }).forEach(function (k) { mriz.appendChild(k); });
    });
    var h = decodeURIComponent(location.hash.slice(1));
    if (h && tlac.some(function (t) { return t.dataset.filtr === h; })) filtruj(h);
  }

  /* ── košík a pokladna ── */
  var kos = $('[data-kosik]');
  if (kos) {
    var seznam = $('[data-kosik-seznam]', kos), prazdny = $('[data-kosik-prazdny]', kos), zivaPozn = $('[data-ziva-pozn]', kos);
    var pokladna = $('[data-pokladna]', kos), dopravy = JSON.parse(kos.dataset.dopravy);
    var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
    var vykresli = function () {
      var k = nacti();
      kos.classList.toggle('je-prazdny', !k.length);
      prazdny.hidden = !!k.length;
      seznam.innerHTML = k.map(function (p, i) {
        return '<li class="polozka" data-i="' + i + '"><img src="' + esc(p.foto) + '" alt="" width="88" height="88" loading="lazy">' +
          '<a class="polozka__nazev" href="' + base + 'obchod/' + esc(p.slug) + '/">' + esc(p.nazev) + (p.varianta ? '<small>' + esc(p.varianta) + '</small>' : '') + (p.ziva ? '<small>živé – osobní předání</small>' : '') + '</a>' +
          '<span class="polozka__cena">' + kc(p.cena * p.pocet) + '</span>' +
          '<span class="pocet"><button type="button" data-zmena="-1" aria-label="Méně">−</button><input type="number" value="' + p.pocet + '" min="1" max="20" aria-label="Počet" data-pocet><button type="button" data-zmena="1" aria-label="Více">+</button></span>' +
          '<button type="button" class="polozka__pryc" data-pryc>Odebrat</button></li>';
      }).join('');
      var ziva = k.some(function (p) { return p.ziva; });
      zivaPozn.hidden = !ziva;
      var lab = $('[data-jen-neziva]', pokladna), inp = $('input', lab);
      inp.disabled = ziva; lab.classList.toggle('je-zakazane', ziva);
      if (ziva && inp.checked) $('input[value="osobne"]', pokladna).checked = true;
      souhrn();
    };
    var souhrn = function () {
      var k = nacti(), zbozi = k.reduce(function (s, p) { return s + p.cena * p.pocet; }, 0);
      var dv = $('input[name="doprava"]:checked', pokladna).value, dc = k.length ? dopravy[dv].cena : 0;
      $('[data-s="zbozi"]', pokladna).textContent = kc(zbozi);
      $('[data-s="doprava"]', pokladna).textContent = dc ? kc(dc) : 'zdarma';
      $('[data-s="celkem"]', pokladna).textContent = kc(zbozi + dc);
    };
    seznam.addEventListener('click', function (e) {
      var li = e.target.closest('.polozka'); if (!li) return;
      var k = nacti(), i = +li.dataset.i;
      if (e.target.closest('[data-pryc]')) k.splice(i, 1);
      else if (e.target.closest('[data-zmena]')) k[i].pocet = Math.max(1, Math.min(20, k[i].pocet + +e.target.closest('[data-zmena]').dataset.zmena));
      else return;
      uloz(k); vykresli();
    });
    seznam.addEventListener('change', function (e) {
      if (!e.target.matches('[data-pocet]')) return;
      var k = nacti(), i = +e.target.closest('.polozka').dataset.i;
      k[i].pocet = Math.max(1, Math.min(20, parseInt(e.target.value, 10) || 1)); uloz(k); vykresli();
    });
    pokladna.addEventListener('change', souhrn);
    pokladna.addEventListener('submit', function (e) {
      e.preventDefault();
      var chybi = $$('[required]', pokladna).filter(function (i) { return !i.checkValidity(); });
      var stav = $('.formular-stav', pokladna);
      if (chybi.length) { stav.textContent = 'Vyplňte prosím jméno, telefon a platný e-mail.'; chybi[0].focus(); return; }
      uloz([]);
      seznam.innerHTML = ''; pokladna.hidden = true; prazdny.hidden = true; zivaPozn.hidden = true;
      $$('.kroky-nakupu li').forEach(function (l, i) { if (i === 2) l.setAttribute('aria-current', 'step'); else l.removeAttribute('aria-current'); });
      var hot = $('[data-hotovo]', kos); hot.hidden = false; hot.focus();
    });
    vykresli();
  }
})();
