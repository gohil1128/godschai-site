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
  function subscribe(email, done) {
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
    s.src = MC + '&EMAIL=' + encodeURIComponent(email) + '&c=' + cb;
    s.onerror = function () { settle(false); };
    d.body.appendChild(s);
    setTimeout(function () { settle(false); if (s.parentNode) s.parentNode.removeChild(s); }, 8000);
  }
  d.addEventListener('submit', function (ev) {
    var form = ev.target;
    if (!form || !form.hasAttribute || !form.hasAttribute('data-gc-signup')) return;
    ev.preventDefault();
    var input = form.querySelector('input[name="EMAIL"]');
    var msg = form.querySelector('[data-gc-signup-msg]');
    var btn = form.querySelector('button[type="submit"]');
    if (!input || !input.value) return;
    if (btn) { btn.disabled = true; btn.dataset.label = btn.textContent; btn.textContent = 'Sending…'; }
    if (msg) { msg.style.display = 'none'; msg.textContent = ''; }
    subscribe(input.value, function (ok, custom) {
      if (btn) { btn.disabled = false; btn.textContent = btn.dataset.label || 'Sign up'; }
      if (!msg) return;
      msg.style.display = 'block';
      msg.style.color = ok ? '#F2A93C' : '#FF7A66';
      msg.textContent = ok ? (custom || "Thanks — you're subscribed. ✶")
                           : "That didn't go through — check your email and try again.";
      if (ok) {
        input.value = '';
        try { localStorage.setItem('gc_subscribed', '1'); } catch (e) {}
        if (form.id === 'gc-popup-form') setTimeout(closePopup, 2200);
      }
    });
  });

  /* ---------- 7. Newsletter: an edge tab, not an interruption ----------
     Nothing opens on its own. A small tab slides in at the side of the screen
     after a few seconds and the modal only opens if the visitor taps it, so the
     page is never covered by something they did not ask for. Dismissing the tab
     — or closing the modal, or subscribing — puts it away for 30 days. */
  var overlay = d.getElementById('gc-popup-overlay');
  var nudge = d.getElementById('gc-nudge');
  if (overlay) {
    var DISMISS_KEY = 'gc_popup_dismissed_until';
    var lastFocus = null;
    var shown = false;

    var suppressed = function () {
      try {
        if (localStorage.getItem('gc_subscribed')) return true;
        var until = parseInt(localStorage.getItem(DISMISS_KEY) || '0', 10);
        if (until && Date.now() < until) return true;
        // legacy key from the old always-on popup
        if (sessionStorage.getItem('gc_popup_dismissed')) return true;
      } catch (e) {}
      return false;
    };

    function openPopup() {
      if (shown || suppressed()) return;
      shown = true;
      hideNudge();
      lastFocus = d.activeElement;
      overlay.hidden = false;
      overlay.style.display = 'flex';
      var first = overlay.querySelector('input, button');
      if (first) first.focus();
      d.addEventListener('keydown', onKeydown, true);
    }
    window.closePopup = closePopup;
    function hideNudge() {
      if (!nudge) return;
      nudge.classList.remove('is-in');
      nudge.hidden = true;
    }
    function closePopup() {
      overlay.style.display = 'none';
      overlay.hidden = true;
      try { localStorage.setItem(DISMISS_KEY, String(Date.now() + 30 * 24 * 60 * 60 * 1000)); } catch (e) {}
      d.removeEventListener('keydown', onKeydown, true);
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    }
    function onKeydown(e) {
      if (e.key === 'Escape') { e.preventDefault(); closePopup(); return; }
      if (e.key !== 'Tab') return;
      // focus trap
      var f = [].slice.call(overlay.querySelectorAll('a[href], button:not([disabled]), input, [tabindex]:not([tabindex="-1"])'))
                .filter(function (el) { return el.offsetParent !== null; });
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && d.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && d.activeElement === last) { e.preventDefault(); first.focus(); }
    }

    var closeBtn = d.getElementById('gc-popup-close');
    var noThanks = d.getElementById('gc-popup-no-thanks');
    if (closeBtn) closeBtn.addEventListener('click', closePopup);
    if (noThanks) noThanks.addEventListener('click', closePopup);
    overlay.addEventListener('click', function (e) { if (e.target === overlay) closePopup(); });

    if (nudge) {
      var nudgeOpen = d.getElementById('gc-nudge-open');
      var nudgeClose = d.getElementById('gc-nudge-close');
      if (nudgeOpen) nudgeOpen.addEventListener('click', openPopup);
      if (nudgeClose) nudgeClose.addEventListener('click', function () {
        hideNudge();
        try { localStorage.setItem(DISMISS_KEY, String(Date.now() + 30 * 24 * 60 * 60 * 1000)); } catch (e) {}
      });
      if (!suppressed()) {
        setTimeout(function () {
          if (suppressed() || shown) return;
          nudge.hidden = false;
          // let the browser lay it out off-screen before sliding it in
          requestAnimationFrame(function () {
            requestAnimationFrame(function () { nudge.classList.add('is-in'); });
          });
        }, 5000);
      }
    }
  }
})();
