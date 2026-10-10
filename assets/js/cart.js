/* God's Chai — the cart (_includes/cart-drawer.html).
 *
 * The cart is two counts and a delivery zone, kept in this browser's
 * localStorage so it follows the visitor from page to page. Nothing is sent
 * anywhere until checkout, which goes to our own payment page (/checkout/,
 * assets/js/pay.js) once pay_on_site is on in _data/shop.yml, and otherwise
 * to Square's checkout page for that exact order.
 *
 *   [data-gc-add="o"]        add one Original Masala (or the qty picked in the
 *                            nearest [data-gc-pick]) and open the cart
 *   [data-gc-add="o,r"]      add one of each
 *   [data-gc-cart-open]      open the cart
 *   [data-gc-clear-cart]     on the page: empty the cart (the thank-you page)
 *   [data-gc-last-order]     on the page: filled with the order number and
 *                            receipt link our payment page just took
 *
 * Also runs the "brewing" screen (_includes/brew-loader.html) as
 * window.GCBrew, and gives the payment page the cart as window.GCCart.
 */
(function () {
  'use strict';
  var d = document, W = window;
  var dataEl = d.querySelector('[data-gc-cart-data]');
  var root = d.querySelector('[data-gc-cart]');
  if (!dataEl || !root) return;
  var data;
  try { data = JSON.parse(dataEl.textContent); } catch (e) { return; }

  // Only ever send people to Square. Anything else is treated as missing.
  var SQUARE = /^https:\/\/(square\.link|checkout\.square\.site|[a-z0-9-]+\.square\.site)\//;
  var KEY = 'gc_cart';
  var panel = root.querySelector('.gc-cart-panel');
  var go = root.querySelector('[data-gc-go]');
  var hint = root.querySelector('[data-gc-hint]');
  var zones = [].slice.call(root.querySelectorAll('input[name="gc-zone"]'));
  var url = '', lastFocus = null;

  function money(n) { return '$' + n.toFixed(2); }
  function $$(sel) { return [].slice.call(d.querySelectorAll(sel)); }

  // ---- state ----------------------------------------------------------
  var state = { q: {}, z: '' };
  data.blends.forEach(function (k) { state.q[k] = 0; });
  try {
    var saved = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (saved && saved.q) {
      data.blends.forEach(function (k) {
        var v = parseInt(saved.q[k], 10);
        state.q[k] = v > 0 ? Math.min(v, data.max) : 0;
      });
      if (data.fees.hasOwnProperty(saved.z)) state.z = saved.z;
    }
  } catch (e) {}
  if (d.querySelector('[data-gc-clear-cart]')) { data.blends.forEach(function (k) { state.q[k] = 0; }); }

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {}
    try { d.dispatchEvent(new CustomEvent('gc:cart')); } catch (e) {}
  }
  function count() { var n = 0; for (var k in state.q) n += state.q[k]; return n; }

  // ---- totals, exactly as Square works them out ------------------------
  function totals() {
    var n = count(), z = state.z;
    var freeAt = z ? data.free[z] : 0;
    var fee = z && !(freeAt && n >= freeAt) ? data.fees[z] : 0;
    var priceC = Math.round(data.price * 100);
    // "Try both": every Original + Rose pair costs pair_price instead of 2 × price.
    var pairs = data.pair ? Math.min.apply(null, data.blends.map(function (k) { return state.q[k]; })) : 0;
    var disc = pairs * data.pair;
    // Worked out the way Square does it, in cents: the saving comes off first,
    // then the tax is worked out once on what's left (rounded half-to-even, as
    // Square does). Never on shipping.
    var rate = z ? data.tax[z] : 0;
    var tax = rate ? halfEven((n * priceC - disc) * rate) : 0;
    var sub = n * data.price, saving = disc / 100;
    tax /= 100;
    return { n: n, sub: sub, saving: saving, fee: fee, tax: tax, total: sub - saving + tax + fee };
  }
  function halfEven(x) {
    var f = Math.floor(x), d = x - f;
    if (Math.abs(d - 0.5) < 1e-9) return f % 2 === 0 ? f : f + 1;
    return Math.round(x);
  }

  // ---- render ---------------------------------------------------------
  function render() {
    var t = totals(), n = t.n, z = state.z;

    $$('[data-gc-badge]').forEach(function (b) { b.textContent = n; b.hidden = !n; });
    $$('[data-gc-cart-open]').forEach(function (b) {
      b.setAttribute('aria-label', 'Cart, ' + n + (n === 1 ? ' pouch' : ' pouches'));
    });

    root.querySelector('[data-gc-empty]').hidden = !!n;
    root.querySelector('[data-gc-zones]').hidden = !n;
    root.querySelector('[data-gc-foot]').hidden = !n;
    data.blends.forEach(function (k) {
      var q = state.q[k];
      root.querySelector('[data-gc-row="' + k + '"]').hidden = !q;
      root.querySelector('[data-gc-q="' + k + '"]').textContent = q;
      root.querySelector('[data-gc-less="' + k + '"]').disabled = q <= 0;
      root.querySelector('[data-gc-more="' + k + '"]').disabled = q >= data.max;
    });
    // "Add to your order": whatever isn't in the cart yet.
    var ups = 0;
    data.blends.forEach(function (k) {
      var item = root.querySelector('[data-gc-up-item="' + k + '"]');
      if (!item) return;
      item.hidden = state.q[k] > 0;
      if (!item.hidden) ups++;
    });
    root.querySelector('[data-gc-up]').hidden = !n || !ups;
    var atMax = data.blends.some(function (k) { return state.q[k] >= data.max; });
    root.querySelector('[data-gc-limit]').hidden = !atMax;

    zones.forEach(function (input) {
      input.checked = input.value === z;
      input.closest('.gc-zone').classList.toggle('is-on', input.checked);
    });

    // Free-shipping progress: the reason to add one more pouch.
    var freeAt = data.free.canada || 0;
    var shipText = root.querySelector('[data-gc-ship-text]');
    var bar = root.querySelector('[data-gc-ship-bar]');
    if (z === 'saskatoon') {
      shipText.textContent = 'Free delivery to your door in Saskatoon.';
      bar.style.width = '100%';
    } else if (freeAt && n >= freeAt) {
      shipText.textContent = 'You’ve got free shipping anywhere in Canada.';
      bar.style.width = '100%';
    } else if (freeAt) {
      var more = freeAt - n;
      shipText.textContent = 'Free delivery in Saskatoon. Add ' + more + ' more pouch' + (more === 1 ? '' : 'es') + ' for free shipping across Canada.';
      bar.style.width = Math.round(100 * n / freeAt) + '%';
    }

    root.querySelector('[data-gc-count]').textContent = n === 1 ? '1 pouch' : n + ' pouches';
    root.querySelector('[data-gc-sub]').textContent = money(t.sub);
    var discRow = root.querySelector('[data-gc-discrow]');
    discRow.hidden = !t.saving;
    if (t.saving) root.querySelector('[data-gc-disc]').textContent = '−' + money(t.saving);
    root.querySelector('[data-gc-taxrow]').hidden = !t.tax;
    root.querySelector('[data-gc-tax]').textContent = money(t.tax);
    root.querySelector('[data-gc-fee]').textContent = !z ? '—' : t.fee ? money(t.fee) : 'Free';
    root.querySelector('[data-gc-total]').textContent = money(t.total);

    var name = data.blends.map(function (k) { return k + state.q[k]; }).join('');
    var link = n && z ? data.links[name + '-' + z] || '' : '';
    url = SQUARE.test(link) ? link : '';
    // The checkout service (checkout_api in shop.yml) takes any quantity;
    // the pre-made link, when there is one, is kept as its fallback.
    if (n && z && data.api) url = url || 'api';
    go.disabled = !url;
    hint.textContent = '';
    if (n && !z) hint.textContent = 'Choose where it’s going to see your total.';
    else if (n && z && !url) {
      hint.textContent = 'That order can’t be checked out online yet — message us on ';
      var a = d.createElement('a');
      a.href = data.instagram; a.target = '_blank'; a.rel = 'noopener'; a.textContent = 'Instagram';
      hint.appendChild(a);
      hint.appendChild(d.createTextNode('.'));
    }
  }

  function set(k, v) {
    state.q[k] = Math.max(0, Math.min(data.max, v));
    save(); render();
  }

  // ---- open / close ---------------------------------------------------
  var closing = 0;
  function open() {
    if (!root.hidden && root.classList.contains('is-open')) return;
    clearTimeout(closing);
    lastFocus = d.activeElement;
    root.hidden = false;
    d.documentElement.style.overflow = 'hidden';
    // next frame, so the slide-in runs from off-screen
    requestAnimationFrame(function () { requestAnimationFrame(function () {
      root.classList.add('is-open');
      panel.focus({ preventScroll: true });
    }); });
  }
  function close() {
    root.classList.remove('is-open');
    d.documentElement.style.overflow = '';
    closing = setTimeout(function () { root.hidden = true; }, 380);
    if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
  }
  function bump() {
    $$('[data-gc-cart-open]').forEach(function (b) {
      b.classList.remove('is-bump'); void b.offsetWidth; b.classList.add('is-bump');
    });
  }

  // ---- events ---------------------------------------------------------
  d.addEventListener('click', function (e) {
    var el = e.target.closest && e.target.closest('[data-gc-add],[data-gc-cart-open],[data-gc-cart-close],[data-gc-less],[data-gc-more],[data-gc-remove]');
    if (!el) return;
    if (el.hasAttribute('data-gc-add')) {
      // A product page's quantity picker sets how many go in.
      var scope = el.closest('[data-gc-buy]');
      var pick = scope && scope.querySelector('[data-gc-pick] output');
      var howMany = pick ? parseInt(pick.textContent, 10) || 1 : 1;
      el.getAttribute('data-gc-add').split(',').forEach(function (k) {
        if (state.q.hasOwnProperty(k)) state.q[k] = Math.min(data.max, state.q[k] + howMany);
      });
      save(); render(); bump(); open();
    } else if (el.hasAttribute('data-gc-cart-open')) { render(); open(); }
    else if (el.hasAttribute('data-gc-cart-close')) close();
    else if (el.hasAttribute('data-gc-less')) set(el.getAttribute('data-gc-less'), state.q[el.getAttribute('data-gc-less')] - 1);
    else if (el.hasAttribute('data-gc-more')) set(el.getAttribute('data-gc-more'), state.q[el.getAttribute('data-gc-more')] + 1);
    else if (el.hasAttribute('data-gc-remove')) set(el.getAttribute('data-gc-remove'), 0);
  });
  zones.forEach(function (z) {
    z.addEventListener('change', function () { state.z = z.value; save(); render(); });
  });
  d.addEventListener('keydown', function (e) {
    if (root.hidden) return;
    if (e.key === 'Escape') { close(); return; }
    if (e.key !== 'Tab') return;
    // keep Tab inside the drawer while it's open
    var f = [].filter.call(panel.querySelectorAll('a[href],button:not([disabled]),input,[tabindex="0"]'), function (x) {
      return x.offsetParent !== null && x.getAttribute('tabindex') !== '-1';
    });
    if (!f.length) return;
    if (e.shiftKey && (d.activeElement === f[0] || d.activeElement === panel)) { e.preventDefault(); f[f.length - 1].focus(); }
    else if (!e.shiftKey && d.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
  });
  // ---- the brewing screen ---------------------------------------------
  var brew = (function () {
    var el = d.querySelector('[data-gc-brew]');
    if (!el) return { show: function () {}, done: function () {}, hide: function () {} };
    var box = el.firstElementChild, line = el.querySelector('[data-gc-brew-line]'), note = el.querySelector('[data-gc-brew-note]');
    var timer = 0, noteText = note.textContent, overflow = '';
    function say(t) { line.classList.remove('is-in'); void line.offsetWidth; line.textContent = t; line.classList.add('is-in'); }
    function trap(e) { if (e.key === 'Tab' || e.key === 'Escape') e.preventDefault(); }
    return {
      // lines: what to say, in turn, every couple of seconds
      show: function (lines, n) {
        clearInterval(timer);
        var i = 0;
        el.classList.remove('is-done');
        note.textContent = n || noteText;
        say(lines[0]);
        if (lines.length > 1) timer = setInterval(function () { i = (i + 1) % lines.length; say(lines[i]); }, 2300);
        if (el.hidden) {
          el.hidden = false;
          overflow = d.documentElement.style.overflow;
          d.documentElement.style.overflow = 'hidden';
          d.addEventListener('keydown', trap, true);
          box.focus({ preventScroll: true });
        }
      },
      done: function (t, n) { clearInterval(timer); el.classList.add('is-done'); say(t); if (n) note.textContent = n; },
      hide: function () {
        clearInterval(timer);
        el.classList.remove('is-done');
        if (el.hidden) return;
        el.hidden = true;
        d.documentElement.style.overflow = overflow;
        d.removeEventListener('keydown', trap, true);
      }
    };
  })();
  W.GCBrew = brew;
  var TO_PAY_PAGE = ['Warming up the kettle…', 'Taking you to the payment page…'];

  // ---- checkout ---------------------------------------------------------
  // Square's checkout page for this exact order: from the checkout service
  // when there is one (any quantity), else the pre-made link. fail(message)
  // runs if neither works.
  function hosted(fail) {
    var link = data.links[data.blends.map(function (k) { return k + state.q[k]; }).join('') + '-' + state.z] || '';
    var fallback = SQUARE.test(link) ? link : '';
    brew.show(TO_PAY_PAGE);
    var done = function (to) {
      if (to && SQUARE.test(to)) { location.href = to; return; }
      brew.hide();
      fail('Couldn’t open checkout just now — please try again in a moment, or message us and we’ll sort it.');
    };
    if (!data.api) { done(fallback); return; }
    var body = { items: state.q, zone: state.z };
    if (welcomeCode()) body.code = welcomeCode();
    fetch(data.api, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    }).then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) { done(j && j.url ? j.url : fallback); },
            function () { done(fallback); });
  }
  function onPayPage() { return data.payPage && location.pathname === data.payPage; }
  go.addEventListener('click', function () {
    if (!url) return;
    if (data.payPage) {
      if (onPayPage()) { close(); return; }
      go.disabled = true;
      brew.show(['Warming up the kettle…']);
      location.href = data.payPage;
      return;
    }
    go.disabled = true;
    hosted(function (msg) { render(); hint.textContent = msg; });
  });
  // Back from the payment page: the page comes back exactly as it was. Reset.
  W.addEventListener('pageshow', function (e) {
    if (!e.persisted) return;
    brew.hide();
    render();
  });
  // Another tab changed the cart.
  W.addEventListener('storage', function (e) {
    if (e.key !== KEY) return;
    try { var s = JSON.parse(e.newValue || 'null'); if (s && s.q) { state = s; render(); d.dispatchEvent(new CustomEvent('gc:cart')); } } catch (x) {}
  });

  // ---- product page quantity pickers + sticky bar ----------------------
  $$('[data-gc-pick]').forEach(function (p) {
    var out = p.querySelector('output');
    var less = p.querySelector('[data-gc-pick-less]'), more = p.querySelector('[data-gc-pick-more]');
    function show(v) {
      v = Math.max(1, Math.min(data.max, v));
      out.textContent = v; less.disabled = v <= 1; more.disabled = v >= data.max;
    }
    less.addEventListener('click', function () { show(parseInt(out.textContent, 10) - 1); });
    more.addEventListener('click', function () { show(parseInt(out.textContent, 10) + 1); });
    show(1);
  });
  var sticky = d.querySelector('[data-gc-sticky]');
  var mainBuy = d.querySelector('[data-gc-buy-main]');
  if (sticky && mainBuy && W.IntersectionObserver) {
    new IntersectionObserver(function (es) {
      sticky.classList.toggle('is-on', !es[0].isIntersecting && es[0].boundingClientRect.top < 0);
    }).observe(mainBuy);
  }

  // ---- the welcome offer (_data/shop.yml) -------------------------------
  // One small line that opens into an email box; once they've signed up
  // (anywhere on the site, see site.js) it shows their code instead.
  function welcomeCode() { try { return localStorage.getItem('gc_welcome') || ''; } catch (e) { return ''; } }
  var deal = root.querySelector('[data-gc-deal]');
  if (deal) {
    var dealOpen = deal.querySelector('[data-gc-deal-open]');
    var dealForm = deal.querySelector('[data-gc-deal-form]');
    var dealCode = deal.querySelector('[data-gc-deal-code]');
    // With the checkout service, the code is added to the order for them.
    deal.querySelector('[data-gc-deal-where]').textContent = data.api ? 'it comes off at checkout.' : 'pop it in on the payment page.';
    var showDeal = function () {
      var have = !!welcomeCode();
      dealOpen.hidden = have || dealOpen.getAttribute('aria-expanded') === 'true';
      dealForm.hidden = have || dealOpen.getAttribute('aria-expanded') !== 'true';
      dealCode.hidden = !have;
    };
    dealOpen.addEventListener('click', function () {
      dealOpen.setAttribute('aria-expanded', 'true');
      showDeal();
      var inp = dealForm.querySelector('input[type="email"]');
      if (inp) inp.focus();
    });
    d.addEventListener('gc:welcome', showDeal);
    showDeal();
  }

  // ---- for the payment page (assets/js/pay.js) -------------------------
  W.GCCart = {
    data: data,
    state: function () { return { q: JSON.parse(JSON.stringify(state.q)), z: state.z }; },
    totals: totals,
    setZone: function (z) { if (data.fees.hasOwnProperty(z) && z !== state.z) { state.z = z; save(); render(); } },
    clear: function () { data.blends.forEach(function (k) { state.q[k] = 0; }); save(); render(); },
    open: function () { render(); open(); },
    hosted: hosted,
    code: welcomeCode
  };
  // Our own payment page has no address quirk to warn about.
  var tip = root.querySelector('[data-gc-tip]');
  if (tip && data.payPage) tip.hidden = true;
  // The thank-you page: the order number and receipt our payment page just took.
  var last = d.querySelector('[data-gc-last-order]');
  if (last) {
    try {
      var lo = JSON.parse(sessionStorage.getItem('gc_last_order') || 'null');
      if (lo && lo.receipt) {
        last.querySelector('[data-gc-last-num]').textContent = '#' + lo.receipt;
        var ra = last.querySelector('[data-gc-last-receipt]');
        if (lo.receiptUrl && /^https:\/\/squareup\.com\//.test(lo.receiptUrl)) { ra.href = lo.receiptUrl; ra.hidden = false; }
        last.hidden = false;
      }
    } catch (e) {}
  }

  $$('[data-gc-cart-open]').forEach(function (b) { b.hidden = false; });
  $$('[data-gc-add]').forEach(function (b) { b.hidden = false; });
  if (d.querySelector('[data-gc-clear-cart]')) save();
  render();
})();
