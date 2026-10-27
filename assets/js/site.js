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
      nav.style.background = solid ? 'rgba(24,15,9,0.92)' : 'transparent';
      nav.style.borderBottomColor = solid ? 'rgba(243,232,211,0.10)' : 'transparent';
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
  var videos = [].slice.call(d.querySelectorAll('video'));
  if (videos.length) {
    videos.forEach(function (v) { v.muted = true; v.defaultMuted = true; v.volume = 0; });
    if ('IntersectionObserver' in window) {
      var vio = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          var v = e.target;
          if (e.isIntersecting) {
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
      msg.style.color = ok ? '#F2A93C' : '#FF7A66';
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
     for good once someone joins. Closing it hides it for dismiss_days. */
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
    var hideClub = function () {
      clubCard.classList.remove('is-in');
      setTimeout(function () { clubCard.hidden = true; }, 600);
    };
    clubCard.querySelector('[data-gc-club-close]').addEventListener('click', function () {
      try { localStorage.setItem(CLUB_KEY, String(Date.now() + days * 864e5)); } catch (e) {}
      hideClub();
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
    var showClub = function () {
      if (clubCard.classList.contains('is-in') || !clubCard.hidden || clubSuppressed()) return;
      clubCard.hidden = false;
      // lay it out off-screen first, then slide it up
      requestAnimationFrame(function () {
        requestAnimationFrame(function () { clubCard.classList.add('is-in'); });
      });
    };
    if (!clubSuppressed()) {
      // On a phone the card spans the bottom of the screen, which on the
      // homepage is where the hero's buttons are. So there it waits until
      // they've scrolled past the first screen (or 15 seconds, if they don't).
      var phone = window.matchMedia && window.matchMedia('(max-width:560px)').matches;
      var waited = false, scrolled = !phone;
      var tryShow = function () { if (waited && scrolled) showClub(); };
      setTimeout(function () { waited = true; tryShow(); }, (Number(clubCard.getAttribute('data-delay')) || 6) * 1000);
      if (phone) {
        var onScroll = function () {
          if (window.scrollY < window.innerHeight * 0.6) return;
          scrolled = true; window.removeEventListener('scroll', onScroll); tryShow();
        };
        window.addEventListener('scroll', onScroll, { passive: true });
        setTimeout(function () { scrolled = true; tryShow(); }, 15000);
      }
    }
  }
})();
