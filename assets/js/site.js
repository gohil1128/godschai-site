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
  var heroIn = d.querySelector('[data-gc-hero-in]');
  if (heroIn) {
    requestAnimationFrame(function () {
      heroIn.style.opacity = '1';
      heroIn.style.transform = 'none';
    });
  }

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
    // the brew board's step clips are run by the board itself (5c)
    if (v.hasAttribute('data-gc-bbclip')) return false;
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

  /* ---------- 3b. Hero: rotating pictures, with one cup as the indicator ----------
     The video loop first, then the photos in _data/hero.yml, crossfading. The
     cup at the bottom fills with chai while each one shows (a CSS animation;
     when it ends, the next picture comes in), and tapping it skips ahead.
     Each photo loads only when it's next. It pauses while the hero is off
     screen or the tab is hidden; with reduced motion it never moves on its
     own. Without JavaScript the first picture just stays. */
  var heroSlides = [].slice.call(d.querySelectorAll('[data-gc-slide]'));
  var heroCup = d.querySelector('[data-gc-hero-cup]');
  if (heroSlides.length > 1 && heroCup) {
    var hn = heroSlides.length, hi = 0, heroSeen = true;
    var cupFill = heroCup.querySelector('.gc-hero-cup-fill');
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
    var heroVids = function (k) { return [].slice.call(heroSlides[k].querySelectorAll('video')); };
    var heroPaused = function () { heroCup.classList.toggle('is-paused', !heroSeen || d.hidden); };
    var runCup = function () {
      var secs = Number(heroSlides[hi].getAttribute('data-secs')) || 6;
      heroCup.style.setProperty('--secs', secs + 's');
      heroCup.classList.remove('is-run'); void heroCup.offsetWidth;
      if (!reduceMotion) heroCup.classList.add('is-run');
      loadSlide((hi + 1) % hn);   // get the next one ready
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
      heroCup.setAttribute('aria-label', 'Next picture (now showing ' + (hi + 1) + ' of ' + hn + ')');
      runCup();
    };
    cupFill.addEventListener('animationend', function (e) { if (e.target === cupFill) showSlide(hi + 1); });
    heroCup.addEventListener('click', function () { showSlide(hi + 1); });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) { heroSeen = es[0].isIntersecting; heroPaused(); }, { threshold: 0.3 }).observe(heroSlides[0].parentNode);
    }
    d.addEventListener('visibilitychange', heroPaused);
    heroCup.hidden = false;
    heroCup.setAttribute('aria-label', 'Next picture (now showing 1 of ' + hn + ')');
    runCup();
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

  /* ---------- 5c. Brew board (brew guide) ----------
     One screen: pick the cups and the water, milk and mix, the pot
     note and the step you're on all change in place. The recipe is _data/brew.yml
     (amounts per cup), scaled from 1 to 30 cups. Without JavaScript the board
     stays hidden and the page shows the plain list and four steps (for 2 cups).
     ?cups=6 opens it at 6. */
  var calc = d.querySelector('[data-gc-brewcalc]');
  if (calc) {
    var A = {}; try { A = JSON.parse(calc.getAttribute('data-amounts')); } catch (e) {}
    var base = Number(calc.getAttribute('data-serves')) || 2;
    var maxN = Number(calc.getAttribute('data-max')) || 30;
    var gPerCup = Number(calc.getAttribute('data-g')) || 5;
    var pouchG = Number(calc.getAttribute('data-pouch')) || 125;
    var bigFrom = Number(calc.getAttribute('data-big')) || 0;
    var out = calc.querySelector('[data-gc-bc-n]');
    var less = calc.querySelector('[data-gc-bc-less]'), more = calc.querySelector('[data-gc-bc-more]');
    var unit = calc.querySelector('[data-gc-bc-unit]'), note = calc.querySelector('[data-gc-bc-note]');
    var FR = { 0: '', 0.25: '¼', 0.5: '½', 0.75: '¾' };
    var quarters = function (x) {
      var q = Math.round(x * 4) / 4, w = Math.floor(q), f = FR[q - w];
      return (w ? String(w) : (f ? '' : '0')) + f;
    };
    var ml = function (x) {
      var v = x * 250;
      return v < 1000 ? Math.round(v / 5) * 5 + ' ml' : (Math.round(v / 50) * 50 / 1000) + ' L';
    };
    var cupText = function (x) { return quarters(x) + (Math.round(x * 4) / 4 > 1 ? ' cups' : ' cup'); };
    var n = base;
    var m = /[?&]cups=(\d+)/.exec(location.search);
    if (m) n = Math.min(maxN, Math.max(1, parseInt(m[1], 10)));
    var draw = function (flash) {
      out.textContent = n;
      unit.textContent = n === 1 ? 'cup' : 'cups';
      less.disabled = n <= 1; more.disabled = n >= maxN;
      // the amounts in the sentences (step titles, the plain list)
      [].forEach.call(d.querySelectorAll('[data-gc-amt]'), function (el) {
        var a = A[el.getAttribute('data-gc-amt')]; if (!a) return;
        var x = a.per_cup * n, spoons = /tbsp/.test(a.unit), short = el.hasAttribute('data-short');
        el.textContent = spoons ? quarters(x) + ' ' + a.unit + (short ? '' : ' (' + Math.round(x / a.per_cup * gPerCup) + ' g)')
                                : cupText(x) + (short ? '' : ' (' + ml(x) + ')');
        if (flash) { el.classList.remove('is-new'); void el.offsetWidth; el.classList.add('is-new'); setTimeout(function () { el.classList.remove('is-new'); }, 700); }
      });
      // the three big tiles
      [].forEach.call(calc.querySelectorAll('[data-gc-tile]'), function (el) {
        var a = A[el.getAttribute('data-gc-tile')]; if (!a) return;
        var x = a.per_cup * n, spoons = /tbsp/.test(a.unit);
        el.querySelector('b').textContent = spoons ? quarters(x) + ' tbsp' : cupText(x);
        el.querySelector('small').textContent = spoons ? Math.round(x / a.per_cup * gPerCup) + ' g' : ml(x);
      });
      [].forEach.call(d.querySelectorAll('[data-gc-serves]'), function (el) { el.textContent = n; });
      if (note) {
        var g = Math.round(gPerCup * n), share = g / pouchG;
        note.textContent = g + ' g of mix, ' + (share < 1 ? 'of a ' + pouchG + ' g pouch (it makes ' + Math.round(pouchG / gPerCup) + ' cups).'
          : quarters(share) + (share > 1.125 ? ' pouches.' : ' pouch.')) +
          (bigFrom && n >= bigFrom ? ' Use a big pot, filled no more than halfway: it rises.' : '');
      }
    };
    // the colour guide (5d) shares the cup count: tell it, and take it from it
    var tell = function () { d.dispatchEvent(new CustomEvent('gc:cups', { detail: n })); };
    less.addEventListener('click', function () { if (n > 1) { n--; draw(true); tell(); } });
    more.addEventListener('click', function () { if (n < maxN) { n++; draw(true); tell(); } });
    d.addEventListener('gc:cups-set', function (e) {
      var k = Math.min(maxN, Math.max(1, Number(e.detail) || n));
      if (k !== n) { n = k; draw(true); }
      tell();
    });

    // the four steps: tabs and a Next button, one at a time
    var tabs = [].slice.call(calc.querySelectorAll('[role="tab"]'));
    var panels = [].slice.call(calc.querySelectorAll('[role="tabpanel"]'));
    // Each step's clip: only the one showing loads and plays, and only while
    // the board is on screen. Reduced motion or data saver keeps the stills.
    var clips = panels.map(function (p) { return p.querySelector('[data-gc-bbclip]'); });
    var clipsCalm = reduceMotion || saveData, boardSeen = true, step = 0;
    var playClip = function () {
      clips.forEach(function (v, k) {
        if (!v) return;
        if (k === step && boardSeen && !clipsCalm && getComputedStyle(v).display !== 'none') {
          if (!v.getAttribute('src')) v.src = v.getAttribute('data-clip');
          v.muted = true;
          var pr = v.play(); if (pr && pr.catch) pr.catch(function () {});
        } else { try { v.pause(); } catch (err) {} }
      });
    };
    if (clips.some(Boolean) && 'IntersectionObserver' in window) {
      new IntersectionObserver(function (es) { boardSeen = es[0].isIntersecting; playClip(); }, { threshold: 0.2 }).observe(calc);
    }
    var go = function (i, focus) {
      i = (i + tabs.length) % tabs.length;
      tabs.forEach(function (t, k) { t.setAttribute('aria-selected', k === i ? 'true' : 'false'); t.tabIndex = k === i ? 0 : -1; });
      panels.forEach(function (p, k) { p.classList.toggle('is-on', k === i); });
      step = i; playClip();
      if (focus) tabs[i].focus();
      var nx = calc.querySelector('[data-gc-bb-next]');
      if (nx) nx.firstChild.textContent = i === tabs.length - 1 ? 'Back to step 1 ' : 'Next step ';
    };
    var cur = function () { return tabs.findIndex(function (t) { return t.getAttribute('aria-selected') === 'true'; }); };
    tabs.forEach(function (t, k) {
      t.addEventListener('click', function () { go(k); });
      t.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowRight') { e.preventDefault(); go(k + 1, true); }
        else if (e.key === 'ArrowLeft') { e.preventDefault(); go(k - 1, true); }
      });
    });
    var next = calc.querySelector('[data-gc-bb-next]');
    if (next) next.addEventListener('click', function () { go(cur() + 1); });

    // turn the board on, and the plain version off
    calc.hidden = false;
    [].forEach.call(d.querySelectorAll('[data-gc-board-hides]'), function (el) { el.hidden = true; el.style.display = 'none'; });
    // Reserve room for the longest wording (the biggest batch), so the board
    // never changes height when the cups or the step change.
    var boxes = [calc.querySelector('.gc-bb-panels'), note];
    var reserve = function () {
      // the longest wording isn't always the biggest batch ("of a 125 g pouch…"
      // is longer than "1¼ pouches"), so try a spread of sizes and keep the tallest
      var keep = n, tall = boxes.map(function () { return 0; });
      boxes.forEach(function (el) { if (el) el.style.minHeight = ''; });
      [1, 2, 3, 4, 5, 6, 8, 10, 12, 15, 20, 25, maxN].forEach(function (k) {
        if (k > maxN) return;
        n = k; draw(false);
        boxes.forEach(function (el, i) { if (el) tall[i] = Math.max(tall[i], el.getBoundingClientRect().height); });
      });
      boxes.forEach(function (el, i) { if (el) el.style.minHeight = tall[i] + 'px'; });
      n = keep; draw(false);
    };
    reserve();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(reserve);
    window.addEventListener('resize', reserve);
    tell();
  }

  /* ---------- 5d. Colour guide (brew guide) ----------
     Four shades, lightest first (_data/brew.yml, shades). Picking one shows its
     timings for the cups in the brew board (shared both ways), and a simmer
     timer: start it when the mix goes in (from the button under any shade, or
     the main one), and the bar fills and darkens from milky to the shade you
     picked as it counts down. A soft chime marks each rise and the end, phones
     that can buzz, and the screen stays awake while it runs. */
  var cg = d.querySelector('[data-gc-cg]');
  if (cg) {
    var SH = []; try { SH = JSON.parse(cg.getAttribute('data-shades')); } catch (e) {}
    var cgNum = function (k, f) { var v = parseFloat(cg.getAttribute(k)); return isNaN(v) ? f : v; };
    var cgMax = cgNum('data-max', 30), boilBase = cgNum('data-boil-base', 2.5), boilPer = cgNum('data-boil-per', 0.75), simPer = cgNum('data-simmer-per', 0.15);
    var startHex = cg.getAttribute('data-start') || '#EBDDC8';
    var q = function (sel) { return cg.querySelector(sel); };
    var radios = [].slice.call(cg.querySelectorAll('input[name="gc-shade"]'));
    var fill = q('[data-gc-cg-fill]'), ticks = q('[data-gc-cg-ticks]'), clock = q('[data-gc-cg-clock]'), clockK = q('[data-gc-cg-clock-k]');
    var meter = q('.gc-cg-meter');
    var runBtns = [].slice.call(cg.querySelectorAll('[data-gc-cg-run]'));
    var PLAY = 'M2 1l7 4-7 4z', PAUSE = 'M2 1h2.4v8H2zM5.6 1H8v8H5.6z';
    // a soft kitchen-timer chime (made on the fly; needs the tap that starts the timer)
    var actx = null;
    var chime = function (n, f) {
      if (!actx) return;
      for (var i = 0; i < n; i++) {
        var o = actx.createOscillator(), g = actx.createGain(), t0 = actx.currentTime + i * 0.32;
        o.type = 'sine'; o.frequency.value = f || 880;
        g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.12, t0 + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.28);
        o.connect(g); g.connect(actx.destination); o.start(t0); o.stop(t0 + 0.3);
      }
    };
    // keep the screen on while it counts (where the browser allows it)
    var lock = null;
    var wake = function (on) {
      if (on && !lock && navigator.wakeLock) navigator.wakeLock.request('screen').then(function (l) { lock = l; l.addEventListener('release', function () { lock = null; }); }).catch(function () {});
      if (!on && lock) { try { lock.release(); } catch (e) {} lock = null; }
    };
    d.addEventListener('visibilitychange', function () { if (running && d.visibilityState === 'visible') wake(true); });
    var goBtn = q('[data-gc-cg-go]'), resetBtn = q('[data-gc-cg-reset]'), cue = q('[data-gc-cg-cue]');
    var cgLess = q('[data-gc-cg-less]'), cgMore = q('[data-gc-cg-more]'), cgOut = q('[data-gc-cg-out]');
    var cgN = cgNum('data-serves', 2), pick = Math.max(0, radios.findIndex(function (r) { return r.checked; }));
    var half = function (x) { return Math.round(x * 2) / 2; };
    var nice = function (x) { var w = Math.floor(x); return (w || x < 0.5 ? String(w) : '') + (x - w >= 0.5 ? '½' : ''); };
    var mmss = function (t) { t = Math.max(0, Math.ceil(t)); var m = Math.floor(t / 60), s = t % 60; return m + ':' + (s < 10 ? '0' : '') + s; };
    var hexRgb = function (h) { h = h.replace('#', ''); return [0, 2, 4].map(function (i) { return parseInt(h.substr(i, 2), 16); }); };
    var mix = function (a, b, t) { var A = hexRgb(a), B = hexRgb(b); return '#' + A.map(function (v, i) { var c = Math.round(v + (B[i] - v) * t); return (c < 16 ? '0' : '') + c.toString(16); }).join(''); };
    var times = function () {
      var s = SH[pick] || {}, boil = half(boilBase + boilPer * cgN), sim = half((s.minutes || 3) + simPer * Math.max(0, cgN - 2));
      return { s: s, boil: boil, sim: sim, total: Math.round(boil + sim + 0.5) };
    };
    var timer = null, endAt = 0, left = 0, running = false, total = 0, cuesSaid = 0;
    var setText = function (sel, v) { var el = q(sel); if (el) el.textContent = v; };
    var setRun = function (b, secs, on, paused) {
      b.querySelector('span').textContent = mmss(secs);
      b.querySelector('path').setAttribute('d', on && !paused ? PAUSE : PLAY);
      b.classList.toggle('is-on', !!on);
      var nm = (SH[+b.getAttribute('data-gc-cg-run')] || {}).name || '';
      b.setAttribute('aria-label', on ? (paused ? 'Carry on the ' : 'Pause the ') + nm + ' timer, ' + mmss(secs) + ' left' : 'Start a ' + mmss(secs) + ' timer for ' + nm);
    };
    var paint = function (frac) {   // frac: 0 = just mixed in, 1 = the shade picked
      var s = SH[pick] || {}, f = Math.max(0, Math.min(1, frac));
      fill.style.setProperty('--c', f >= 1 ? s.hex : mix(startHex, s.hex, f));
      // idle, the bar shows the whole shade; running, it fills as the time goes
      fill.style.width = (running || left ? Math.max(f * 100, 2) : 100) + '%';
    };
    var show = function () {
      var t = times(), s = t.s;
      setText('[data-gc-cg-name]', s.name || '');
      var hb = q('[data-gc-cg-house]'); if (hb) hb.hidden = !s.house;
      setText('[data-gc-cg-note]', s.note || '');
      setText('[data-gc-cg-boil]', nice(t.boil));
      setText('[data-gc-cg-sim]', nice(t.sim));
      setText('[data-gc-cg-rises]', s.rises || 2);
      // a mark on the bar where each rise falls
      ticks.innerHTML = '';
      for (var ri = 1; ri <= (s.rises || 2); ri++) {
        var tk = d.createElement('span'); tk.className = 'gc-cg-tick';
        tk.style.left = 'calc(' + ((ri - 0.5) / (s.rises || 2) * 100) + '% - 1px)'; ticks.appendChild(tk);
      }
      setText('[data-gc-cg-times]', (s.rises || 2) === 1 ? 'time' : 'times');
      setText('[data-gc-cg-total]', t.total);
      setText('[data-gc-cg-n]', cgN);
      setText('[data-gc-cg-unit]', cgN === 1 ? 'cup' : 'cups');
      cgOut.textContent = cgN; cgLess.disabled = cgN <= 1; cgMore.disabled = cgN >= cgMax;
      runBtns.forEach(function (b, k) { if (!(k === pick && (running || left))) setRun(b, half((SH[k].minutes || 3) + simPer * Math.max(0, cgN - 2)) * 60, false); });
      if (!running && !left) { clock.textContent = mmss(t.sim * 60); clockK.textContent = 'simmer'; paint(1); }
    };
    var stop = function (keep) {
      if (timer) clearInterval(timer); timer = null; running = false;
      if (!keep) { left = 0; cuesSaid = 0; cue.textContent = ''; goBtn.textContent = 'Mix is in: start the timer'; resetBtn.hidden = true; wake(false); }
    };
    var tick = function () {
      left = Math.max(0, (endAt - Date.now()) / 1000);
      var done = total - left, frac = total ? done / total : 1, s = SH[pick] || {}, rises = s.rises || 2;
      clock.textContent = mmss(left); paint(frac);
      if (runBtns[pick]) setRun(runBtns[pick], left, true, false);
      // a cue as each rise comes due, spread evenly through the simmer
      var due = Math.min(rises, Math.floor(frac * rises + 0.5));
      if (left > 0 && due > cuesSaid) { cuesSaid = due; cue.textContent = 'Rise ' + due + ' of ' + rises + ': let it climb the pot, then pull it back.'; chime(1, 660); }
      if (left <= 0) {
        stop(true); left = 0; clockK.textContent = 'ready';
        cue.textContent = 'Done: ' + (s.name || 'your chai') + '. Strain it now.';
        goBtn.textContent = 'Start again'; resetBtn.hidden = false;
        if (navigator.vibrate) { try { navigator.vibrate([180, 90, 180]); } catch (e) {} }
        chime(3, 880); wake(false);
        if (runBtns[pick]) { setRun(runBtns[pick], 0, false); runBtns[pick].querySelector('span').textContent = 'Done'; }
      }
    };
    var start = function () {
      if (!actx) { try { var AC = window.AudioContext || window.webkitAudioContext; if (AC) actx = new AC(); } catch (e) {} }
      if (actx && actx.state === 'suspended') { try { actx.resume(); } catch (e) {} }
      if (running) {   // pause
        stop(true); left = Math.max(0, (endAt - Date.now()) / 1000);
        goBtn.textContent = 'Carry on'; clockK.textContent = 'paused'; wake(false);
        if (runBtns[pick]) setRun(runBtns[pick], left, true, true);
        return;
      }
      if (!left) { total = times().sim * 60; left = total; cuesSaid = 0; cue.textContent = 'Simmering on medium-high. Stay close: it climbs fast.'; paint(0); }
      endAt = Date.now() + left * 1000; running = true; clockK.textContent = 'left'; wake(true);
      goBtn.textContent = 'Pause'; resetBtn.hidden = false;
      timer = setInterval(tick, 250); tick();
    };
    goBtn.addEventListener('click', function () { if (!running && left === 0 && clockK.textContent === 'ready') { show(); } start(); });

    resetBtn.addEventListener('click', function () { stop(false); show(); });
    radios.forEach(function (r, k) { r.addEventListener('change', function () { if (r.checked) { pick = k; stop(false); show(); } }); });
    // each shade's own button: pick it and start (or pause / carry on if it's the one running)
    runBtns.forEach(function (b, k) {
      b.hidden = false;
      b.addEventListener('click', function () {
        if (k !== pick || (!running && !left)) {
          radios[k].checked = true; pick = k; stop(false); show();
        }
        start();
        var rr = meter.getBoundingClientRect();
        if (rr.top < 80 || rr.bottom > window.innerHeight) meter.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });
      });
    });
    cg.classList.add('is-live');
    var setCups = function (k) {
      k = Math.min(cgMax, Math.max(1, k));
      if (k === cgN) return;
      cgN = k; stop(false); show();
      d.dispatchEvent(new CustomEvent('gc:cups-set', { detail: cgN }));
    };
    cgLess.addEventListener('click', function () { setCups(cgN - 1); });
    cgMore.addEventListener('click', function () { setCups(cgN + 1); });
    d.addEventListener('gc:cups', function (e) {
      var k = Number(e.detail) || cgN;
      if (k !== cgN) { cgN = k; stop(false); show(); }
    });
    // start from the board's count (it may have opened with ?cups=)
    var boardN = d.querySelector('[data-gc-brewcalc]:not([hidden]) [data-gc-bc-n]');
    if (boardN) cgN = Math.min(cgMax, Math.max(1, parseInt(boardN.textContent, 10) || cgN));
    q('[data-gc-cg-ctl]').hidden = false;
    show();
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
      settle(!!data && (data.result === 'success' || already), already ? "You're already on the list. ✶" : null);
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
  var CLUB_IN = 'You’re in the Chai Club! ✶ ';
  function join(form, done) {
    var api = form.getAttribute('data-gc-club-api');
    var email = (form.querySelector('input[name="EMAIL"]') || {}).value || '';
    var direct = function (note) {
      subscribe(form, function (ok, custom) {
        done(ok, ok ? (custom ? 'You’re already on our list, so you’re in the club. ✶' : CLUB_IN + (note || 'Watch your inbox for your member perks.')) : null);
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
        if (data.listed) done(true, (data.already ? 'Welcome back! ✶ ' : CLUB_IN) + note);
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
      else msg.textContent = ok ? (custom || "Thanks — you're subscribed. ✶")
                                : "That didn't go through — check your email and try again.";
      tell(ok ? 'done' : 'error');
      if (ok) {
        input.value = '';
        try { localStorage.setItem('gc_subscribed', '1'); } catch (e) {}
      }
    });
  });

  /* ---------- 7. The Chai Club card ----------
     A small card in the bottom-right corner (_includes/popup.html; along the
     bottom on a phone, once they've scrolled). It slides up a few seconds in, never covers the page or takes focus, and goes away
     for good once someone joins. Closing it hides it for dismiss_days, and
     leaves a small "10% off" dot in the corner that opens it again. */
  var clubCard = d.getElementById('gc-club');
  if (clubCard) {
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
          img.src = igSrc(p);
        });
      })
      .catch(function () {});
  }
})();
