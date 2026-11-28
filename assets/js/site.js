---
# front matter so Jekyll renders the Mailchimp config below
layout: null
---
/* God's Chai — site behaviour.
   Replaces the old React/dc-runtime bundle (~200KB) so every drink, event and
   heading is server-rendered by Jekyll and this file only handles interaction.
   Everything here is progressive enhancement: with JS off, the content, links
   and signup forms all still work. */
(function () {
  'use strict';

  var d = document;
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- 1. Hero copy reveal ---------- */
  /* Now done in CSS (.gc-hero-in on the homepage) so the heading paints at once. */

  /* ---------- 2. Scroll reveal for content blocks ---------- */
  var revealTargets = [].slice.call(d.querySelectorAll('[data-gc-reveal] > section, [data-gc-reveal] > footer'));
  if (revealTargets.length && !reduceMotion) {
    revealTargets.forEach(function (el) {
      el.style.opacity = '0';
      el.style.transform = 'translateY(34px)';
      el.style.transition = 'opacity .9s cubic-bezier(.2,.7,.2,1), transform .9s cubic-bezier(.2,.7,.2,1)';
      el.style.willChange = 'opacity, transform';
    });
    var reveal = function (el) { el.style.opacity = '1'; el.style.transform = 'none'; };
    var pending = revealTargets.slice();
    var revealInView = function () {
      var vh = window.innerHeight;
      pending = pending.filter(function (el) {
        if (el.getBoundingClientRect().top < vh * 0.9) { reveal(el); return false; }
        return true;
      });
    };
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) { if (e.isIntersecting) { reveal(e.target); io.unobserve(e.target); } });
      }, { threshold: 0.12, rootMargin: '0px 0px -7% 0px' });
      revealTargets.forEach(function (el) { io.observe(el); });
    }
    revealInView();
    // failsafe: never leave content hidden
    setTimeout(function () { revealTargets.forEach(reveal); }, 1600);
    window.addEventListener('scroll', revealInView, { passive: true });

    /* Anchor links vs. the reveal animation. Jumping to a section that has not
       revealed yet lands it 34px too high: the browser scrolls to where the
       translated box currently sits, then the transform settles to none and the
       section slides up behind the fixed nav. Reveal the target first — with no
       transition, so it is already in place — then re-align. */
    var alignTo = function (hash) {
      if (!hash || hash.length < 2) return;
      var el;
      try { el = d.querySelector(hash); } catch (err) { return; }
      if (!el) return;
      var sec = el.closest && el.closest('[data-gc-reveal] > section');
      if (sec) { sec.style.transition = 'none'; reveal(sec); }
      requestAnimationFrame(function () { el.scrollIntoView(); });
    };
    d.addEventListener('click', function (ev) {
      if (ev.defaultPrevented) return;   // e.g. a tab, which handles its own scrolling
      var a = ev.target.closest && ev.target.closest('a[href^="#"]');
      if (a) alignTo(a.getAttribute('href'));
    });
    window.addEventListener('hashchange', function () { alignTo(location.hash); });
    if (location.hash) alignTo(location.hash);
  }

  /* ---------- 2b. Grids arrive card by card ---------- */
  /* A whole section fading in as one slab reads as a page still loading. The
     same cards arriving a beat apart reads as the page being laid out. The
     offsets are small — 14px, 55ms between cards, capped so a long grid never
     keeps its last card waiting — and, like the section reveal above, the
     starting state is set from here rather than in CSS, so with JavaScript off
     nothing is ever hidden. */
  var staggerHosts = [].slice.call(d.querySelectorAll('[data-gc-stagger]'));
  if (staggerHosts.length && !reduceMotion && 'IntersectionObserver' in window) {
    var STEP = 55, CAP = 7, EASE = 'cubic-bezier(.2,.7,.2,1)';
    /* Named apart from section 5's own `cards`, which is a different thing in
       the same scope and is assigned later than these closures run. */
    var liveCards = function (host) {
      return [].slice.call(host.children).filter(function (el) {
        return !el.hasAttribute('hidden') && el.style.display !== 'none';
      });
    };
    var park = function (el) {
      // whatever transition the card carries is its hover; it has to survive
      if (el._gcTransition === undefined) el._gcTransition = el.style.transition || '';
      el.style.opacity = '0';
      el.style.transform = 'translateY(14px)';
    };
    staggerHosts.forEach(function (host) {
      [].slice.call(host.children).forEach(park);
    });
    var settleAll = function (host) {
      /* Delays are worked out here, not up front, because the events grid drops
         its past dates after this runs — counting them would leave the cards
         that are left all waiting on the same capped delay. */
      liveCards(host).forEach(function (el, i) {
        if (el._gcSettled) return;
        el._gcSettled = true;
        var ms = Math.min(i, CAP) * STEP;
        el.style.transition = 'opacity .62s ' + EASE + ' ' + ms + 'ms, transform .62s ' + EASE + ' ' + ms + 'ms';
        el.style.opacity = '1';
        el.style.transform = 'none';
        // hand the card back its own transition afterwards, or a hover would
        // inherit the stagger's delay and lag behind the cursor
        window.setTimeout(function () {
          el.style.transition = el._gcTransition;
          el.style.removeProperty('transform');
        }, ms + 900);
      });
    };
    var sio = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        settleAll(e.target);
        sio.unobserve(e.target);
      });
    }, { threshold: 0.05, rootMargin: '0px 0px -4% 0px' });
    staggerHosts.forEach(function (h) { sio.observe(h); });
    // failsafe: never leave a grid invisible
    window.setTimeout(function () { staggerHosts.forEach(settleAll); }, 2600);
  }

  /* ---------- 3. Nav solidify + mesh drift + parallax band ---------- */
  /* Phone menu: the nav's links fold into one button below 760px
     (_includes/nav-dark.html). It opens a panel under the header; a link, a
     tap outside or Escape closes it. */
  var menuBtn = d.querySelector('[data-gc-menu-btn]'), menu = d.querySelector('[data-gc-menu]');
  if (menuBtn && menu) {
    var setMenu = function (on) {
      menu.hidden = !on; menuBtn.setAttribute('aria-expanded', on ? 'true' : 'false');
      menuBtn.setAttribute('aria-label', on ? 'Close menu' : 'Menu');
      var hdr = menuBtn.closest('[data-gc-nav]'); if (hdr) hdr.classList.toggle('gc-menu-on', on);
    };
    menuBtn.addEventListener('click', function (e) { e.stopPropagation(); setMenu(menu.hidden); });
    menu.addEventListener('click', function (e) { if (e.target.closest('a')) setMenu(false); });
    d.addEventListener('click', function (e) { if (!menu.hidden && !menu.contains(e.target)) setMenu(false); });
    d.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !menu.hidden) { setMenu(false); menuBtn.focus(); } });
  }

  var nav = d.querySelector('[data-gc-nav][data-gc-nav-transparent]');
  var meshA = d.querySelector('[data-gc-mesh="a"]');
  var meshB = d.querySelector('[data-gc-mesh="b"]');
  var meshC = d.querySelector('[data-gc-mesh="c"]');
  var par = d.querySelector('[data-gc-parallax]');
  var raf = 0;
  function onScroll() {
    raf = 0;
    var y = window.scrollY || window.pageYOffset || 0;
    var vh = window.innerHeight;
    var doc = Math.max(1, d.documentElement.scrollHeight - vh);
    var p = y / doc;
    if (!reduceMotion) {
      if (meshA) meshA.style.transform = 'translate(' + (p * 22) + 'vw,' + (p * 55) + 'vh) scale(' + (1 + p * 0.25) + ')';
      if (meshB) meshB.style.transform = 'translate(' + (-p * 26) + 'vw,' + (Math.sin(p * Math.PI) * -18) + 'vh)';
      if (meshC) meshC.style.transform = 'translate(' + (Math.sin(p * Math.PI * 2) * 10) + 'vw,' + (-p * 48) + 'vh) scale(' + (1.15 - p * 0.2) + ')';
    }
    if (nav) {
      var solid = y > vh * 0.72;
      // Over the hero photo the header wears the dark colours; solid, it's daylight.
      nav.classList.toggle('gc-dark', !solid);
      nav.style.background = solid ? 'rgba(var(--gc-bg-rgb),0.92)' : 'transparent';
      nav.style.borderBottomColor = solid ? 'rgba(var(--gc-ink-rgb),0.10)' : 'transparent';
      nav.style.backdropFilter = solid ? 'blur(12px)' : 'none';
      nav.style.webkitBackdropFilter = solid ? 'blur(12px)' : 'none';
    }
    if (par && !reduceMotion) {
      var sec = par.parentElement;
      if (sec) {
        var r = sec.getBoundingClientRect();
        if (r.bottom > 0 && r.top < vh) {
          var prog = (vh - r.top) / (vh + r.height);
          par.style.transform = 'translateY(' + ((prog - 0.5) * -58).toFixed(1) + 'px)';
        }
      }
    }
  }
  var tick = function () { if (!raf) raf = requestAnimationFrame(onScroll); };
  if (nav || meshA || par) {
    window.addEventListener('scroll', tick, { passive: true });
    window.addEventListener('resize', tick);
    onScroll();
  }

  /* ---------- 4. Videos: load when visible, one audio source at a time ---------- */
  /* Decorative loops (the hero, the brew-guide steps) carry data-gc-calm: with
     reduced motion or data saver on they never load, and their still stays up. */
  var saveData = !!(navigator.connection && navigator.connection.saveData);
  var videos = [].slice.call(d.querySelectorAll('video')).filter(function (v) {
    return !(v.hasAttribute('data-gc-calm') && (reduceMotion || saveData));
  });
  if (videos.length) {
    videos.forEach(function (v) {
      v.muted = true; v.defaultMuted = true; v.volume = 0;
      // data-gc-fade: start invisible over the still, fade in once frames are actually playing
      if (v.hasAttribute('data-gc-fade')) v.addEventListener('playing', function () { v.classList.add('is-on'); });
    });
    if ('IntersectionObserver' in window) {
      var vio = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          var v = e.target;
          if (e.isIntersecting) {
            // a hero slide that isn't showing stays paused and unloaded (3b loads it before its turn)
            var slide = v.closest && v.closest('[data-gc-slide]');
            if (slide && !slide.classList.contains('is-on')) { try { v.pause(); } catch (err) {} return; }
            if (!v.getAttribute('src') && v.dataset.src) {
              // swap in the <source> children so the browser can pick mp4/webm
              (v.dataset.src || '').split('|').forEach(function (pair) {
                if (!pair) return;
                var bits = pair.split('::');
                var s = d.createElement('source');
                s.src = bits[0];
                if (bits[1]) s.type = bits[1];
                v.appendChild(s);
              });
              v.removeAttribute('data-src');
              v.load();
            }
            var pr = v.play(); if (pr && pr.catch) pr.catch(function () {});
          } else { try { v.pause(); } catch (err) {} }
        });
      }, { threshold: 0.25 });
      videos.forEach(function (v) { vio.observe(v); });
    }
    d.addEventListener('click', function (ev) {
      var btn = ev.target.closest && ev.target.closest('[data-gc-mute]');
      if (!btn) return;
      var wrap = btn.closest('[data-gc-tile]') || btn.parentElement;
      var v = wrap && wrap.querySelector('video');
      if (!v) return;
      var willUnmute = v.muted;
      // silence every other video and reset their icons
      videos.forEach(function (other) {
        if (other === v) return;
        other.muted = true; other.volume = 0;
        var ob = other.closest('[data-gc-tile]');
        var oBtn = ob && ob.querySelector('[data-gc-mute]');
        if (oBtn) oBtn.textContent = '🔇';
      });
      v.muted = !willUnmute;
      v.volume = willUnmute ? 1 : 0;
      btn.textContent = willUnmute ? '🔊' : '🔇';
      btn.setAttribute('aria-pressed', willUnmute ? 'true' : 'false');
      if (willUnmute) { var p2 = v.play(); if (p2 && p2.catch) p2.catch(function () {}); }
    });
  }

  /* ---------- 3b. Hero: rotating pictures, on a loop ----------
     The opening photo, the video loop, then the photos in _data/hero.yml,
     crossfading, each for its time (data-secs), round and round. Each photo
     loads only when it's next. The clock only runs while the hero is on screen
     and the tab is visible. With reduced motion it never moves on its own, and
     without JavaScript the first picture just stays. */
  var heroSlides = [].slice.call(d.querySelectorAll('[data-gc-slide]'));
  if (heroSlides.length > 1) {
    var hn = heroSlides.length, hi = 0, heroSeen = true, heroMs = 0;
    var heroVids = function (k) { return [].slice.call(heroSlides[k].querySelectorAll('video')); };
    var loadSlide = function (k) {
      [].forEach.call(heroSlides[k].querySelectorAll('[data-srcset]'), function (el) { el.setAttribute('srcset', el.getAttribute('data-srcset')); el.removeAttribute('data-srcset'); });
      var im = heroSlides[k].querySelector('img[data-src]');
      if (im) { im.src = im.getAttribute('data-src'); im.removeAttribute('data-src'); }
      // and the loop, if it's this one's (the version that fits the screen; never with reduced motion or data saver)
      if (reduceMotion || saveData) return;
      heroVids(k).forEach(function (v) {
        if (!v.dataset.src || getComputedStyle(v).display === 'none') return;
        v.dataset.src.split('|').forEach(function (pair) {
          var bits = pair.split('::'); if (!bits[0]) return;
          var so = d.createElement('source'); so.src = bits[0]; if (bits[1]) so.type = bits[1]; v.appendChild(so);
        });
        v.removeAttribute('data-src'); v.preload = 'auto'; v.load();
      });
    };
    var showSlide = function (k) {
      var prev = hi; hi = (k + hn) % hn;
      if (prev === hi) return;
      loadSlide(hi);
      heroSlides[prev].classList.remove('is-on');
      heroSlides[hi].classList.add('is-on');
      heroVids(prev).forEach(function (v) { try { v.pause(); } catch (err) {} });
      heroVids(hi).forEach(function (v) {
        if (v.querySelector('source') && getComputedStyle(v).display !== 'none') { try { v.currentTime = 0; } catch (err) {} var pr = v.play(); if (pr && pr.catch) pr.catch(function () {}); }
      });
      heroMs = 0;
      loadSlide((hi + 1) % hn);   // get the next one ready
    };
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) { heroSeen = es[0].isIntersecting; }, { threshold: 0.3 }).observe(heroSlides[0].parentNode);
    }
    loadSlide(1 % hn);
    if (!reduceMotion) {
      setInterval(function () {
        if (!heroSeen || d.hidden) return;
        heroMs += 250;
        if (heroMs >= (Number(heroSlides[hi].getAttribute('data-secs')) || 6) * 1000) showSlide(hi + 1);
      }, 250);
    }
  }

  /* ---------- 5. Hide events whose date has passed ---------- */
  /* Every event stays in the HTML for crawlers; only visitors see it filtered. */
  var eventList = d.querySelector('[data-gc-events]');
  if (eventList) {
    var today = new Date(); today.setHours(0, 0, 0, 0);
    var cards = [].slice.call(eventList.querySelectorAll('[data-gc-event-end]'));
    var remaining = 0;
    cards.forEach(function (card) {
      var end = new Date(card.getAttribute('data-gc-event-end') + 'T23:59:59');
      if (isNaN(end.getTime())) { remaining++; return; }
      if (end < today) { card.hidden = true; card.style.display = 'none'; }
      else remaining++;
    });
    var empty = d.querySelector('[data-gc-events-empty]');
    if (empty && remaining === 0) { empty.hidden = false; empty.style.display = 'flex'; }
  }

  /* ---------- 5b. Catering enquiry (catering page) ----------
     Checks the form, then opens an email to the shop with everything filled in.
     The page also shows the address, in case no email app opens. */
  var enq = d.querySelector('[data-gc-enquiry]');
  if (enq) {
    var enqErr = enq.querySelector('[data-gc-enquiry-err]');
    var enqDone = enq.querySelector('[data-gc-enquiry-done]');
    enq.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var bad = [].filter.call(enq.querySelectorAll('[required]'), function (f) {
        var wrong = !f.value.trim() || (f.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.value.trim()));
        f.setAttribute('aria-invalid', wrong ? 'true' : 'false');
        return wrong;
      });
      if (bad.length) { enqErr.textContent = 'Almost! Fill in the highlighted boxes.'; bad[0].focus(); return; }
      enqErr.textContent = '';
      var v = function (n) { var f = enq.elements[n]; return f ? f.value.trim() : ''; };
      var when = v('date') ? new Date(v('date') + 'T12:00:00').toLocaleDateString('en-CA', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) : '';
      var text = [
        'Hi God\'s Chai, we\'d love the chai cart at our event.', '',
        'Date: ' + when, 'Event: ' + v('type'), 'Guests: about ' + v('guests'),
        'Chai: ' + v('temp'), 'Where: ' + v('where'), '',
        'Name: ' + v('name'), 'Email: ' + v('email')
      ].concat(v('phone') ? ['Phone: ' + v('phone')] : [])
       .concat(v('notes') ? ['', v('notes')] : [])
       .concat(['', 'Are you free, and what would it cost? Thanks!']).join('\r\n');
      var to = enq.getAttribute('data-to') || '';
      var href = 'mailto:' + to + '?subject=' + encodeURIComponent('Chai catering: ' + v('type') + ', ' + when) + '&body=' + encodeURIComponent(text);
      var link = enq.querySelector('[data-gc-enquiry-mailto]');
      if (link) link.href = href;
      enqDone.hidden = false;
      enqDone.focus({ preventScroll: true });
      if (typeof gtag === 'function') gtag('event', 'generate_lead', { form: 'catering' });
      if (to) window.location.href = href;
    });
  }

  /* ---------- 5c. Brew guide (/how-to-make-masala-chai/) ----------
     The cups (the water, milk and mix follow), the shade tiles (each shows
     its simmer time for that many cups; the one picked sets the rises and the
     timer) and the four step cards, with a simmer timer on the third. The recipe and timings are _data/brew.yml. The page is
     written out for 2 cups and the house shade, so without JavaScript it still
     reads right; this makes the controls work. ?cups=6 opens it at 6. The
     timer fills a bar from milky to the shade picked, prompts each rise with a
     soft chime, says when to strain, and keeps the screen awake. */
  var guide = d.querySelector('[data-gc-guide]');
  if (guide) {
    var gq = function (sel) { return guide.querySelector(sel); };
    var gnum = function (k, f) { var v = parseFloat(guide.getAttribute(k)); return isNaN(v) ? f : v; };
    var A = {}; try { A = JSON.parse(guide.getAttribute('data-amounts')); } catch (e) {}
    var SH = []; try { SH = JSON.parse(guide.getAttribute('data-shades')); } catch (e) {}
    var maxN = gnum('data-max', 30), gPerCup = gnum('data-g', 5), pouchG = gnum('data-pouch', 125), bigFrom = gnum('data-big', 0);
    var boilBase = gnum('data-boil-base', 2.5), boilPer = gnum('data-boil-per', 0.75), simPer = gnum('data-simmer-per', 0.15);
    var startHex = guide.getAttribute('data-start') || '#ECDDC4';
    var n = gnum('data-serves', 2);
    var m = /[?&]cups=(\d+)/.exec(location.search);
    if (m) n = Math.min(maxN, Math.max(1, parseInt(m[1], 10)));
    var radios = [].slice.call(guide.querySelectorAll('input[name="gc-shade"]'));
    var pick = Math.max(0, radios.findIndex(function (r) { return r.checked; }));
    var less = gq('[data-gc-g-less]'), more = gq('[data-gc-g-more]');
    var runBtn = gq('[data-gc-g-run]'), resetBtn = gq('[data-gc-g-reset]'), fill = gq('[data-gc-g-fill]'), cue = gq('[data-gc-g-cue]');
    var FR = { 0: '', 0.25: '¼', 0.5: '½', 0.75: '¾' };
    var quarters = function (x) { var q = Math.round(x * 4) / 4, w = Math.floor(q), f = FR[q - w]; return (w ? String(w) : (f ? '' : '0')) + f; };
    var ml = function (x) { var v = x * 250; return v < 1000 ? Math.round(v / 5) * 5 + ' ml' : (Math.round(v / 50) * 50 / 1000) + ' L'; };
    var cupText = function (x) { return quarters(x) + (Math.round(x * 4) / 4 > 1 ? ' cups' : ' cup'); };
    var half = function (x) { return Math.round(x * 2) / 2; };
    var nice = function (x) { var w = Math.floor(x); return (w || x < 0.5 ? String(w) : '') + (x - w >= 0.5 ? '½' : ''); };
    var mmss = function (t) { t = Math.max(0, Math.ceil(t)); var mm = Math.floor(t / 60), ss = t % 60; return mm + ':' + (ss < 10 ? '0' : '') + ss; };
    var hexRgb = function (h) { h = h.replace('#', ''); return [0, 2, 4].map(function (i) { return parseInt(h.substr(i, 2), 16); }); };
    var mix = function (a, b, t) { var P = hexRgb(a), Q = hexRgb(b); return '#' + P.map(function (v, i) { var c = Math.round(v + (Q[i] - v) * t); return (c < 16 ? '0' : '') + c.toString(16); }).join(''); };
    var set = function (sel, v) { var el = gq(sel); if (el) el.textContent = v; };
    var simMin = function () { return half(((SH[pick] || {}).minutes || 3) + simPer * Math.max(0, n - 2)); };

    // the timer's state
    var tick = null, endAt = 0, left = 0, total = 0, running = false, said = 0;
    var actx = null, lock = null;
    var chime = function (k, f) {
      if (!actx) return;
      for (var i = 0; i < k; i++) {
        var o = actx.createOscillator(), g = actx.createGain(), t0 = actx.currentTime + i * 0.32;
        o.type = 'sine'; o.frequency.value = f || 880;
        g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.12, t0 + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.28);
        o.connect(g); g.connect(actx.destination); o.start(t0); o.stop(t0 + 0.3);
      }
    };
    var wake = function (on) {
      if (on && !lock && navigator.wakeLock) navigator.wakeLock.request('screen').then(function (l) { lock = l; l.addEventListener('release', function () { lock = null; }); }).catch(function () {});
      if (!on && lock) { try { lock.release(); } catch (e) {} lock = null; }
    };
    d.addEventListener('visibilitychange', function () { if (running && d.visibilityState === 'visible') wake(true); });
    var PLAY = 'M2 1l7 4-7 4z', PAUSE = 'M2 1h2.4v8H2zM5.6 1H8v8H5.6z';
    var setRun = function (secs, on, paused) {
      runBtn.querySelector('span').textContent = typeof secs === 'string' ? secs : mmss(secs);
      runBtn.querySelector('path').setAttribute('d', on && !paused ? PAUSE : PLAY);
      runBtn.classList.toggle('is-on', !!on);
      runBtn.setAttribute('aria-label', on ? (paused ? 'Carry on the simmer timer' : 'Pause the simmer timer') : 'Start the ' + mmss(simMin() * 60) + ' simmer timer');
    };
    var paint = function (frac) {
      var s = SH[pick] || {}, f = Math.max(0, Math.min(1, frac));
      fill.style.setProperty('--c', f >= 1 ? s.hex : mix(startHex, s.hex, f));
      fill.style.width = (f * 100) + '%';
    };
    var stop = function () {
      if (tick) clearInterval(tick); tick = null; running = false; left = 0; said = 0;
      cue.textContent = ''; resetBtn.hidden = true; paint(0); wake(false); setRun(simMin() * 60, false);
    };

    var draw = function (flash) {
      set('[data-gc-g-n]', n);
      set('[data-gc-g-cupword]', n === 1 ? 'cup' : 'cups');
      [].forEach.call(guide.querySelectorAll('[data-gc-g-swmin]'), function (el, k) {
        el.textContent = nice(half(((SH[k] || {}).minutes || 3) + simPer * Math.max(0, n - 2)));
      });
      less.disabled = n <= 1; more.disabled = n >= maxN;
      [].forEach.call(guide.querySelectorAll('[data-gc-g-amt]'), function (el) {
        var a = A[el.getAttribute('data-gc-g-amt')]; if (!a) return;
        var x = a.per_cup * n, spoons = /tbsp/.test(a.unit);
        el.querySelector('b').textContent = spoons ? quarters(x) + ' tbsp' : cupText(x);
        el.querySelector('small').textContent = spoons ? Math.round(x / a.per_cup * gPerCup) + ' g' : ml(x);
        if (flash) { el.classList.remove('is-new'); void el.offsetWidth; el.classList.add('is-new'); }
      });
      // the amounts inside the step titles
      [].forEach.call(guide.querySelectorAll('[data-gc-amt]'), function (el) {
        var a = A[el.getAttribute('data-gc-amt')]; if (!a) return;
        var x = a.per_cup * n;
        el.textContent = /tbsp/.test(a.unit) ? quarters(x) + ' ' + a.unit : cupText(x);
      });
      var g = Math.round(gPerCup * n), share = g / pouchG;
      set('[data-gc-g-note]', (n > 2 ? g + ' g of mix, ' + (share < 1 ? 'of a ' + pouchG + ' g pouch.' : quarters(share) + (share > 1.125 ? ' pouches.' : ' pouch.')) : '') +
        (bigFrom && n >= bigFrom ? ' Use a big pot, no more than half full: it rises.' : ''));
      var s = SH[pick] || {}, boil = half(boilBase + boilPer * n), sim = simMin();
      set('[data-gc-g-boil]', nice(boil));
      set('[data-gc-g-sim]', nice(sim));
      set('[data-gc-g-rises]', s.rises || 2);
      set('[data-gc-g-times]', (s.rises || 2) === 1 ? 'time' : 'times');
      set('[data-gc-g-shnote]', s.note || '');
      set('[data-gc-g-total]', Math.round(boil + sim + 0.5));
      if (!running && !left) setRun(sim * 60, false);
    };

    var go = function () {
      if (!actx) { try { var AC = window.AudioContext || window.webkitAudioContext; if (AC) actx = new AC(); } catch (e) {} }
      if (actx && actx.state === 'suspended') { try { actx.resume(); } catch (e) {} }
      if (running) {   // pause
        clearInterval(tick); tick = null; running = false; left = Math.max(0, (endAt - Date.now()) / 1000);
        setRun(left, true, true); wake(false); return;
      }
      if (!left) {   // a fresh start
        total = simMin() * 60; left = total; said = 0;
        cue.textContent = 'Simmering on medium-high. Stay close: it climbs fast.'; paint(0);
      }
      endAt = Date.now() + left * 1000; running = true; resetBtn.hidden = false; wake(true);
      var step = function () {
        left = Math.max(0, (endAt - Date.now()) / 1000);
        var frac = total ? (total - left) / total : 1, rises = (SH[pick] || {}).rises || 2;
        paint(frac); setRun(left, true, false);
        var due = Math.min(rises, Math.floor(frac * rises + 0.5));
        if (left > 0 && due > said) { said = due; cue.textContent = 'Rise ' + due + ' of ' + rises + ': let it climb the pot, then pull it back.'; chime(1, 660); }
        if (left <= 0) {
          clearInterval(tick); tick = null; running = false; left = 0;
          cue.textContent = 'Done: ' + ((SH[pick] || {}).name || 'your chai') + '. Strain it now.';
          setRun('Done', false); paint(1); chime(3, 880); wake(false);
          if (navigator.vibrate) { try { navigator.vibrate([180, 90, 180]); } catch (e) {} }
        }
      };
      tick = setInterval(step, 250); step();
    };

    runBtn.addEventListener('click', function () { if (!running && !left && runBtn.textContent === 'Done') stop(); go(); });
    resetBtn.addEventListener('click', stop);
    radios.forEach(function (r, k) { r.addEventListener('change', function () { if (r.checked) { pick = k; stop(); draw(false); } }); });
    less.addEventListener('click', function () { if (n > 1) { n--; stop(); draw(true); } });
    more.addEventListener('click', function () { if (n < maxN) { n++; stop(); draw(true); } });
    less.hidden = more.hidden = false;
    gq('[data-gc-g-timer]').hidden = false;
    draw(false);
  }

  /* ---------- 6. Mailchimp signup (JSONP) ---------- */
  var MC = 'https://{{ site.mailchimp.host }}/subscribe/post-json?u={{ site.mailchimp.u }}&id={{ site.mailchimp.id }}&f_id={{ site.mailchimp.f_id }}';
  /* Sends every named field in the form, not just EMAIL: the hidden SOURCE
     field is how Mailchimp learns which form someone used (premix-launch,
     events or newsletter). */
  function subscribe(form, done) {
    var cb = 'gcMc' + Math.random().toString(36).slice(2);
    var settled = false;
    var settle = function (ok, msg) {
      if (settled) return; settled = true;
      try { delete window[cb]; } catch (e) { window[cb] = undefined; }
      done(ok, msg);
    };
    window[cb] = function (data) {
      // Mailchimp reports "already subscribed" as an error; that's a win for the visitor.
      var already = data && /already subscribed/i.test(data.msg || '');
      settle(!!data && (data.result === 'success' || already), already ? "You're already on the list." : null);
    };
    var s = d.createElement('script');
    var q = '';
    [].slice.call(form.elements).forEach(function (el) {
      if (!el.name || el.disabled || !el.value) return;
      q += '&' + encodeURIComponent(el.name) + '=' + encodeURIComponent(el.value);
    });
    s.src = MC + q + '&c=' + cb;
    s.onerror = function () { settle(false); };
    d.body.appendChild(s);
    setTimeout(function () { settle(false); if (s.parentNode) s.parentNode.removeChild(s); }, 8000);
  }
  /* The Chai Club card (_includes/popup.html) joins through the checkout
     service, which adds them to Mailchimp tagged "chai-club" and emails the
     welcome note with the members' code. If the service can't be reached, or
     couldn't put them on the list itself, they're signed up straight to
     Mailchimp as above, so nobody is lost. */
  var CLUB_IN = 'You’re in the Chai Club! ';
  function join(form, done) {
    var api = form.getAttribute('data-gc-club-api');
    var email = (form.querySelector('input[name="EMAIL"]') || {}).value || '';
    var direct = function (note) {
      subscribe(form, function (ok, custom) {
        done(ok, ok ? (custom ? 'You’re already on our list, so you’re in the club.' : CLUB_IN + (note || 'Watch your inbox for your member perks.')) : null);
      });
    };
    if (!api || !window.fetch) return direct();
    var timer, finished = false;
    var fallback = function () { if (finished) return; finished = true; clearTimeout(timer); direct(); };
    timer = setTimeout(fallback, 9000);
    fetch(api, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: email, source: (form.elements.SOURCE || {}).value || '' }) })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) {
        if (finished) return;
        if (!data || !data.ok) return fallback();
        finished = true; clearTimeout(timer);
        var note = data.already ? 'You’re already a member. Your code is in your welcome email.'
          : data.emailed ? 'Check your inbox for your welcome note and your 10% code.' : 'Watch your inbox for your member perks.';
        if (data.listed) done(true, (data.already ? 'Welcome back! ' : CLUB_IN) + note);
        else direct(note);
      }, fallback);
  }

  /* The welcome offer (welcome_offer in _data/shop.yml): whoever signs up gets
     the code on the spot, and it's kept in this browser so the cart can remind
     them of it. */
  var WELCOME = {% if site.data.shop.open and site.data.shop.welcome_offer %}{ code: {{ site.data.shop.welcome_code | jsonify }}, percent: {{ site.data.shop.welcome_percent | jsonify }} }{% else %}null{% endif %};
  function showCode(msg, already) {
    msg.textContent = (already ? 'You’re already on the list, so here’s ' : 'You’re in! Here’s ') + WELCOME.percent + '% off your first order: ';
    var b = d.createElement('button');
    b.type = 'button'; b.className = 'gc-code'; b.textContent = WELCOME.code;
    b.setAttribute('data-gc-copy', WELCOME.code);
    b.setAttribute('aria-label', 'Copy the code ' + WELCOME.code);
    msg.appendChild(b);
    msg.appendChild(d.createTextNode(' Pop it in at checkout.'));
    try { localStorage.setItem('gc_welcome', WELCOME.code); } catch (e) {}
    try { d.dispatchEvent(new CustomEvent('gc:welcome', { detail: WELCOME.code })); } catch (e) {}
  }
  // Any [data-gc-copy] button copies its code, and says so for a moment.
  d.addEventListener('click', function (ev) {
    var b = ev.target.closest && ev.target.closest('[data-gc-copy]');
    if (!b) return;
    var code = b.getAttribute('data-gc-copy');
    var said = function () {
      if (b.dataset.copied) return;
      b.dataset.copied = '1';
      var was = b.textContent; b.textContent = 'Copied!';
      setTimeout(function () { b.textContent = was; delete b.dataset.copied; }, 1400);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(code).then(said, function () {});
  });

  d.addEventListener('submit', function (ev) {
    var form = ev.target;
    if (!form || !form.hasAttribute || !form.hasAttribute('data-gc-signup')) return;
    ev.preventDefault();
    var input = form.querySelector('input[name="EMAIL"]');
    var msg = form.querySelector('[data-gc-signup-msg]');
    var btn = form.querySelector('button[type="submit"]');
    if (!input || !input.value) return;
    var tell = function (state) {
      try { form.dispatchEvent(new CustomEvent('gc:signup', { detail: state })); } catch (e) {}
    };
    tell('sending');
    if (btn) { btn.disabled = true; btn.dataset.label = btn.textContent; btn.textContent = 'Sending…'; }
    if (msg) { msg.style.display = 'none'; msg.textContent = ''; }
    var club = form.hasAttribute('data-gc-club');
    (club ? join : subscribe)(form, function (ok, custom) {
      if (btn) { btn.disabled = false; btn.textContent = btn.dataset.label || 'Sign up'; }
      if (!msg) return;
      msg.style.display = 'block';
      msg.style.color = ok ? 'var(--gc-gold-t)' : 'var(--gc-coral-t)';
      if (ok && WELCOME && !club) showCode(msg, !!custom);
      else msg.textContent = ok ? (custom || "Thanks — you're subscribed.")
                                : "That didn't go through — check your email and try again.";
      tell(ok ? 'done' : 'error');
      if (ok) {
        input.value = '';
        if (typeof gtag === 'function') gtag('event', 'sign_up', { method: club ? 'chai_club' : 'newsletter' });
        try { localStorage.setItem('gc_subscribed', '1'); } catch (e) {}
      }
    });
  });

  /* ---------- 7. The Chai Club card ----------
     A small card in the bottom-right corner (_includes/popup.html; along the
     bottom on a phone, once they've scrolled). It slides up a few seconds in, never covers the page or takes focus, and goes away
     for good once someone joins. Closing it hides it for dismiss_days, and
     leaves a small "10% off" dot in the corner that opens it again. */
  /* While a sale runs (_data/shop.yml `promo`), the Black Friday card takes the
     club card's place: it slides up a moment after someone lands, with a live
     countdown. Closing it or tapping "Shop the sale" leaves a small "25% off" dot
     that brings it back, and it doesn't pop up by itself again this sale. After
     the end it's removed and the club card comes back. */
  var bfCard = d.getElementById('gc-bf');
  var bfDot = d.querySelector('[data-gc-bf-dot]');
  var bfUntil = bfCard ? Date.parse(bfCard.getAttribute('data-until')) : 0;
  var bfOn = !!bfCard && Date.now() <= bfUntil;
  var bfGtag = function (name) {
    try { if (typeof gtag === 'function') gtag('event', name, { promotion_id: 'black-friday', promotion_name: 'Black Friday sale', creative_slot: 'landing_card' }); } catch (e) {}
  };
  if (bfCard && !bfOn) {
    bfCard.parentNode.removeChild(bfCard);
    if (bfDot) bfDot.parentNode.removeChild(bfDot);
  }
  if (bfOn) {
    var BF_KEY = 'gc_bf_seen';
    var bfStamp = bfCard.getAttribute('data-until');
    var bfSeen = function () { try { return localStorage.getItem(BF_KEY) === bfStamp; } catch (e) { return false; } };
    var bfMark = function () { try { localStorage.setItem(BF_KEY, bfStamp); } catch (e) {} };
    var bfShowDot = function (on) {
      if (!bfDot) return;
      if (on) {
        bfDot.hidden = false;
        requestAnimationFrame(function () { requestAnimationFrame(function () { bfDot.classList.add('is-in'); }); });
      } else { bfDot.classList.remove('is-in'); bfDot.hidden = true; }
    };
    var bfHide = function (then) {
      bfCard.classList.remove('is-in');
      setTimeout(function () { bfCard.hidden = true; if (then) then(); }, 600);
    };
    var bfShow = function () {
      if (!bfCard.hidden) return;
      bfShowDot(false);
      bfCard.hidden = false;
      requestAnimationFrame(function () { requestAnimationFrame(function () { bfCard.classList.add('is-in'); }); });
      bfGtag('view_promotion');
    };
    // "Ends in 2d 5h", then "Ends in 3h 20m" on the last day.
    var bfLeft = bfCard.querySelector('[data-gc-bf-left]');
    var bfTick = function () {
      var ms = bfUntil - Date.now();
      if (ms <= 0) { bfHide(); bfShowDot(false); return false; }
      var h = Math.floor(ms / 36e5), m = Math.floor(ms % 36e5 / 6e4);
      if (bfLeft) bfLeft.textContent = 'Ends in ' + (h >= 24 ? Math.floor(h / 24) + 'd ' + (h % 24) + 'h' : (h ? h + 'h ' : '') + m + 'm');
      return true;
    };
    if (bfTick()) {
      var bfTimer = setInterval(function () { if (!bfTick()) clearInterval(bfTimer); }, 30000);
      bfCard.querySelector('[data-gc-bf-close]').addEventListener('click', function () {
        bfMark(); bfHide(function () { bfShowDot(true); });
      });
      bfCard.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') bfCard.querySelector('[data-gc-bf-close]').click();
      });
      bfCard.querySelector('[data-gc-bf-go]').addEventListener('click', function () {
        bfMark(); bfGtag('select_promotion'); bfHide(function () { bfShowDot(true); });
      });
      if (bfDot) bfDot.addEventListener('click', bfShow);
      if (bfSeen()) bfShowDot(true);
      else setTimeout(bfShow, 1200);
    }
  }

  var clubCard = d.getElementById('gc-club');
  if (clubCard && !bfOn) {
    var CLUB_KEY = 'gc_club_dismissed_until';
    var days = Number(clubCard.getAttribute('data-days')) || 30;
    var clubSuppressed = function () {
      try {
        if (localStorage.getItem('gc_subscribed')) return true;
        var until = parseInt(localStorage.getItem(CLUB_KEY) || '0', 10);
        if (until && Date.now() < until) return true;
      } catch (e) {}
      return false;
    };
    var joined = function () {
      try { return !!localStorage.getItem('gc_subscribed'); } catch (e) { return false; }
    };
    var dot = d.querySelector('[data-gc-club-dot]');
    var showDot = function (on) {
      if (!dot) return;
      if (on && !joined()) {
        dot.hidden = false;
        requestAnimationFrame(function () { requestAnimationFrame(function () { dot.classList.add('is-in'); }); });
      } else {
        dot.classList.remove('is-in');
        dot.hidden = true;
      }
    };
    var hideClub = function (then) {
      clubCard.classList.remove('is-in');
      setTimeout(function () { clubCard.hidden = true; if (then) then(); }, 600);
    };
    clubCard.querySelector('[data-gc-club-close]').addEventListener('click', function () {
      try { localStorage.setItem(CLUB_KEY, String(Date.now() + days * 864e5)); } catch (e) {}
      hideClub(function () { showDot(true); });
    });
    // Escape closes it, but only while someone is actually in it.
    clubCard.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') clubCard.querySelector('[data-gc-club-close]').click();
    });
    var clubForm = clubCard.querySelector('form');
    clubForm.addEventListener('gc:signup', function (e) {
      if (e.detail !== 'done') return;
      clubCard.classList.add('is-done');
      setTimeout(hideClub, 9000);
    });
    var showClub = function (asked) {
      if (clubCard.classList.contains('is-in') || !clubCard.hidden || (!asked && clubSuppressed())) return;
      clubCard.hidden = false;
      // lay it out off-screen first, then slide it up
      requestAnimationFrame(function () {
        requestAnimationFrame(function () { clubCard.classList.add('is-in'); });
      });
    };
    // The dot: tapping it brings the card back (and closing it again brings
    // the dot back). Shown on every page while the card is dismissed.
    if (dot) {
      dot.addEventListener('click', function () {
        showDot(false);
        showClub(true);
        var box = clubCard.querySelector('input[type="email"]');
        if (box) setTimeout(function () { box.focus({ preventScroll: true }); }, 450);
      });
      if (!joined() && clubSuppressed()) showDot(true);
    }
    if (!clubSuppressed()) {
      // On a phone the card spans the bottom of the screen, which on the
      // homepage is where the hero's buttons are. It still comes up after the
      // same delay (_data/club.yml), it just doesn't beat the scroll to it.
      var phone = window.matchMedia && window.matchMedia('(max-width:560px)').matches;
      var waited = false, scrolled = !phone;
      var tryShow = function () { if (waited && scrolled) showClub(); };
      var delayMs = (Number(clubCard.getAttribute('data-delay')) || 5) * 1000;
      setTimeout(function () { waited = true; tryShow(); }, delayMs);
      if (phone) {
        var onScroll = function () {
          if (window.scrollY < window.innerHeight * 0.6) return;
          scrolled = true; window.removeEventListener('scroll', onScroll); tryShow();
        };
        window.addEventListener('scroll', onScroll, { passive: true });
        setTimeout(function () { scrolled = true; tryShow(); }, delayMs);
      }
    }
  }

  /* ---------- 8. Instagram grid: latest posts (homepage) ----------
     The nine tiles are already on the page from _data/instagram.yml. When
     that file has a feed_url (a Behold JSON feed), fetch it and put the newest
     posts in their place, one tile per post. Anything that goes wrong (feed
     down, blocked, odd shape) just leaves the tiles that are there. */
  var igGrid = d.querySelector('[data-gc-ig][data-feed]');
  if (igGrid && window.fetch) {
    var igSrc = function (p) {
      var sz = p.sizes || {};
      var pick = (sz.medium && sz.medium.mediaUrl) || (sz.large && sz.large.mediaUrl) || (sz.small && sz.small.mediaUrl);
      if (pick) return pick;
      if (p.thumbnailUrl) return p.thumbnailUrl;
      var t = p.mediaType || p.media_type || '';
      return t === 'VIDEO' ? (p.thumbnail_url || '') : (p.mediaUrl || p.media_url || '');
    };
    var igAlt = function (p) {
      var c = String(p.prunedCaption || p.caption || '').replace(/\s+/g, ' ').trim();
      if (c.length > 120) c = c.slice(0, 117).replace(/\s+\S*$/, '') + '…';
      return c || 'A God\'s Chai post on Instagram';
    };
    fetch(igGrid.getAttribute('data-feed'), { credentials: 'omit' })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (data) {
        var posts = (Array.isArray(data) ? data : (data && data.posts) || []).filter(function (p) {
          return p && /^https:\/\//.test(p.permalink || '') && /^https:\/\//.test(igSrc(p));
        });
        var slots = [].slice.call(igGrid.children);
        // whole rows of three only, so a feed with six posts shows two full rows
        var count = Math.min(posts.length, slots.length);
        count -= count % 3;
        if (count < 3) return; // not worth replacing the tiles for
        slots.slice(count).forEach(function (li) { li.remove(); });
        posts.slice(0, count).forEach(function (p, i) {
          var img = new Image();
          img.onload = function () {
            var a = d.createElement('a');
            a.className = 'gc-ig-tile';
            a.href = p.permalink; a.target = '_blank'; a.rel = 'noopener';
            img.alt = igAlt(p); img.decoding = 'async';
            a.appendChild(img);
            var t = p.mediaType || p.media_type || '';
            if (t === 'VIDEO' || p.isReel) {
              a.insertAdjacentHTML('beforeend', '<svg class="gc-ig-reel" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.5v13l11-6.5z"/></svg>');
            }
            var old = slots[i].querySelector('video');
            if (old) { try { old.pause(); } catch (err) {} }
            slots[i].replaceChildren ? slots[i].replaceChildren(a) : (slots[i].innerHTML = '', slots[i].appendChild(a));
          };
          // Let the browser pick the size it needs (tiles are ~124px wide on a
          // phone, 280px on desktop) instead of always fetching the 700px one.
          var sz = p.sizes || {}, set = ['small', 'medium', 'large'].filter(function (k) { return sz[k] && sz[k].mediaUrl && sz[k].width; });
          if (set.length > 1) {
            img.sizes = '(min-width:880px) 280px, 33vw';
            img.srcset = set.map(function (k) { return sz[k].mediaUrl + ' ' + sz[k].width + 'w'; }).join(', ');
          }
          img.src = igSrc(p);
        });
      })
      .catch(function () {});
  }
  /* ---------- 9. Tabs ----------
     A row of #links becomes real tabs: one panel shows at a time and a soft
     pill of light slides to the chosen tab. Without JavaScript every panel
     shows and each tab jumps to its panel. The catering tabs live in a bar
     pinned under the header ([data-gc-stick]); picking a tab from further
     down the page brings its panel back into view. */
  var root = d.documentElement;
  var nav = d.querySelector('[data-gc-nav]');
  var setNavH = function () { if (nav) root.style.setProperty('--gc-navh', nav.getBoundingClientRect().height + 'px'); };
  setNavH();
  window.addEventListener('resize', setNavH, { passive: true });
  if (nav && 'ResizeObserver' in window) new ResizeObserver(setNavH).observe(nav);

  [].slice.call(d.querySelectorAll('[data-gc-tabbar]')).forEach(function (bar) {
    var tabs = [].slice.call(bar.querySelectorAll('[role="tab"]'));
    var panels = tabs.map(function (t) { return d.getElementById(t.getAttribute('aria-controls')); });
    if (!tabs.length || panels.some(function (pn) { return !pn; })) return;
    var glow = d.createElement('span');
    glow.className = 'gc-tabglow'; glow.setAttribute('aria-hidden', 'true');
    bar.insertBefore(glow, bar.firstChild);
    bar.classList.add('has-glow');
    var stick = bar.closest('[data-gc-stick]');
    var current = 0;
    var place = function (instant) {
      var t = tabs[current];
      if (instant) glow.style.transition = 'none';
      glow.style.width = t.offsetWidth + 'px';
      glow.style.transform = 'translateX(' + t.offsetLeft + 'px)';
      if (instant) { glow.offsetWidth; glow.style.transition = ''; }
    };
    var select = function (i, opts) {
      opts = opts || {};
      current = i;
      tabs.forEach(function (t, j) {
        var on = j === i;
        t.setAttribute('aria-selected', on ? 'true' : 'false');
        t.tabIndex = on ? 0 : -1;
        panels[j].hidden = !on;
        panels[j].classList.remove('is-in');
      });
      if (!opts.instant && !reduceMotion) { void panels[i].offsetWidth; panels[i].classList.add('is-in'); }
      place(opts.instant);
      // keep the chosen tab in view when the row scrolls sideways on a phone
      var t = tabs[i];
      if (t.offsetLeft < bar.scrollLeft || t.offsetLeft + t.offsetWidth > bar.scrollLeft + bar.clientWidth) {
        bar.scrollTo({ left: t.offsetLeft - 24, behavior: reduceMotion || opts.instant ? 'auto' : 'smooth' });
      }
      if (opts.focus) t.focus();
      // from further down the page, bring the panel back up under the pinned bar
      if (stick && opts.scroll) {
        var top = panels[i].getBoundingClientRect().top;
        var limit = (parseFloat(getComputedStyle(root).getPropertyValue('--gc-navh')) || 72) + stick.offsetHeight + 8;
        if (top < limit || top > window.innerHeight * 0.8) {
          panels[i].scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
        }
      }
    };
    tabs.forEach(function (t, i) {
      t.addEventListener('click', function (ev) {
        ev.preventDefault();
        select(i, { scroll: true });
        if (history.replaceState) history.replaceState(null, '', '#' + panels[i].id);
      });
      t.addEventListener('keydown', function (ev) {
        var k = ev.key, n = tabs.length, j = -1;
        if (k === 'ArrowRight') j = (i + 1) % n;
        else if (k === 'ArrowLeft') j = (i - 1 + n) % n;
        else if (k === 'Home') j = 0;
        else if (k === 'End') j = n - 1;
        if (j > -1) { ev.preventDefault(); select(j, { focus: true }); }
      });
    });
    // "Next" links inside a panel move to the next tab
    panels.forEach(function (pn, i) {
      [].slice.call(pn.querySelectorAll('[data-gc-tabnext]')).forEach(function (a) {
        a.addEventListener('click', function (ev) { ev.preventDefault(); select((i + 1) % tabs.length, { scroll: true, focus: true }); });
      });
    });
    var start = 0;
    if (location.hash) panels.forEach(function (pn, i) { if ('#' + pn.id === location.hash) start = i; });
    select(start, { instant: true });
    panels[0].parentNode.classList.add('is-ready');
    window.addEventListener('resize', function () { place(true); }, { passive: true });
    if (d.fonts && d.fonts.ready) d.fonts.ready.then(function () { place(true); });
    // a panel's tab may be chosen by a link elsewhere on the page
    window.addEventListener('hashchange', function () {
      panels.forEach(function (pn, i) { if ('#' + pn.id === location.hash) select(i, { scroll: true }); });
    });
  });

  [].slice.call(d.querySelectorAll('[data-gc-stick]')).forEach(function (stick) {
    var watch = d.getElementById(stick.getAttribute('data-gc-stick'));
    var setH = function () { root.style.setProperty('--gc-stickh', stick.offsetHeight + 'px'); };
    setH();
    if ('ResizeObserver' in window) new ResizeObserver(setH).observe(stick);
    var check = function () {
      var navH = parseFloat(getComputedStyle(root).getPropertyValue('--gc-navh')) || 72;
      // "at the top": pinned, or resting within a few pixels of where it pins
      var stuck = stick.getBoundingClientRect().top <= navH + 24;
      var gone = watch ? watch.getBoundingClientRect().bottom < navH + 8 : stuck;
      stick.classList.toggle('is-stuck', stuck && gone);
    };
    check();
    window.addEventListener('scroll', check, { passive: true });
    window.addEventListener('resize', check, { passive: true });
  });
})();
