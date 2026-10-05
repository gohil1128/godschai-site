/* God's Chai — the cart (_includes/cart-drawer.html).
 *
 * The cart is two counts and a delivery zone, kept in this browser's
 * localStorage so it follows the visitor from page to page. Nothing is sent
 * anywhere: checkout just navigates to the Square checkout link for that
 * exact order (_data/shop.yml), and Square's page takes the card and address.
 *
 *   [data-gc-add="o"]        add one Original Masala (or the qty picked in the
 *                            nearest [data-gc-pick]) and open the cart
 *   [data-gc-add="o,r"]      add one of each
 *   [data-gc-cart-open]      open the cart
 *   [data-gc-clear-cart]     on the page: empty the cart (the thank-you page)
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

  function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {} }
  function count() { var n = 0; for (var k in state.q) n += state.q[k]; return n; }

  // ---- totals, exactly as Square works them out ------------------------
  function totals() {
    var n = count(), z = state.z;
    var freeAt = z ? data.free[z] : 0;
    var fee = z && !(freeAt && n >= freeAt) ? data.fees[z] : 0;
    // Tax per blend, in cents, rounded, on pouches only (never shipping).
    var rate = z ? data.tax[z] : 0, tax = 0;
    if (rate) for (var k in state.q) tax += Math.round(state.q[k] * Math.round(data.price * 100) * rate);
    tax /= 100;
    var sub = n * data.price;
    return { n: n, sub: sub, fee: fee, tax: tax, total: sub + tax + fee };
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
    root.querySelector('[data-gc-taxrow]').hidden = !t.tax;
    root.querySelector('[data-gc-tax]').textContent = money(t.tax);
    root.querySelector('[data-gc-fee]').textContent = !z ? '—' : t.fee ? money(t.fee) : 'Free';
    root.querySelector('[data-gc-total]').textContent = money(t.total);

    var name = data.blends.map(function (k) { return k + state.q[k]; }).join('');
    var link = n && z ? data.links[name + '-' + z] || '' : '';
    url = SQUARE.test(link) ? link : '';
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
  go.addEventListener('click', function () {
    if (!url) return;
    go.disabled = true;
    go.textContent = 'Opening Square checkout…';
    location.href = url;
  });
  // Back from Square: the page comes back exactly as it was. Reset the button.
  W.addEventListener('pageshow', function (e) {
    if (!e.persisted) return;
    go.textContent = 'Checkout securely with Square';
    render();
  });
  // Another tab changed the cart.
  W.addEventListener('storage', function (e) {
    if (e.key !== KEY) return;
    try { var s = JSON.parse(e.newValue || 'null'); if (s && s.q) { state = s; render(); } } catch (x) {}
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

  $$('[data-gc-cart-open]').forEach(function (b) { b.hidden = false; });
  $$('[data-gc-add]').forEach(function (b) { b.hidden = false; });
  if (d.querySelector('[data-gc-clear-cart]')) save();
  render();
})();
