/* God's Chai — our own payment page (/checkout/, shop-checkout.html).
 *
 * The order comes from the cart (window.GCCart, assets/js/cart.js). The card is
 * taken by Square's Web Payments SDK: its fields are Square's own secure
 * frames, so the card number goes straight to Square, which hands back a
 * one-time token. The checkout service (checkout/api/pay.js) then makes the
 * order and charges exactly its total, while the brewing screen
 * (window.GCBrew) keeps people company.
 *
 * If anything this needs isn't there (the service, its settings, Square's
 * script), the page hands people over to Square's checkout page instead, so
 * nobody is ever stuck.
 */
(function () {
  'use strict';
  var d = document, W = window;
  var SDK = 'https://web.squarecdn.com/v1/square.js';
  var PAYING = ['Steeping your payment…', 'Asking your bank nicely…', 'Letting it rise two or three times…',
    'Adding a pinch of cardamom…', 'Almost brewed…'];
  var DECLINED = 'Your bank said no to that one. Try another card, or give them a ring.';
  var DECLINE = {
    INSUFFICIENT_FUNDS: 'That card’s a little short right now. Try another one?',
    CVV_FAILURE: 'That security code didn’t match. Give it another go.',
    ADDRESS_VERIFICATION_FAILURE: 'That postal code doesn’t match the one your bank has for this card.',
    INVALID_POSTAL_CODE: 'That postal code doesn’t match the one your bank has for this card.',
    INVALID_EXPIRATION: 'Check the expiry date — your bank didn’t like it.',
    EXPIRATION_FAILURE: 'Check the expiry date — your bank didn’t like it.',
    CARD_EXPIRED: 'That card has expired. Try another one?',
    CARD_DECLINED_VERIFICATION_REQUIRED: 'Your bank wants to double-check it’s you. Tap Pay again and follow its prompt.',
    CARD_TOKEN_EXPIRED: 'That took a little long. Tap Pay again.',
    CARD_TOKEN_USED: 'That took a little long. Tap Pay again.'
  };
  var MSG = {
    email: 'We need an email to send your receipt to.',
    phone: 'That phone number looks a bit off.',
    first: 'First name, please.',
    last: 'Last name, please.',
    line1: 'Where should we bring it?',
    city: 'Which city?',
    province: 'Pick a province.',
    postal: 'That doesn’t look like a Canadian postal code.',
    not_saskatoon: 'That postal code is outside Saskatoon, where delivery is free.',
    zone: 'Choose where it’s going.'
  };
  var FIELDS = ['email', 'phone', 'first', 'last', 'line1', 'line2', 'city', 'province', 'postal'];
  var PROVINCES = ['AB', 'BC', 'MB', 'NB', 'NL', 'NS', 'NT', 'NU', 'ON', 'PE', 'QC', 'SK', 'YT'];
  var POSTAL = /^([ABCEGHJ-NPRSTVXY]\d[ABCEGHJ-NPRSTV-Z]) ?(\d[ABCEGHJ-NPRSTV-Z]\d)$/;
  // Square's card fields, in the site's colours. Its frames can't load our
  // fonts, so they use a plain system face at the same size.
  var STYLE = {
    '.input-container': { borderColor: '#4A3A2E', borderRadius: '12px' },
    '.input-container.is-focus': { borderColor: '#F2A93C' },
    '.input-container.is-error': { borderColor: '#FF6F61' },
    '.message-text': { color: '#AB9280' },
    '.message-icon': { color: '#AB9280' },
    '.message-text.is-error': { color: '#FF8A78' },
    '.message-icon.is-error': { color: '#FF8A78' },
    input: { backgroundColor: '#22160E', color: '#F3E8D3', fontFamily: 'helvetica neue, sans-serif', fontSize: '16px' },
    'input::placeholder': { color: '#8A7360' },
    'input.is-error': { color: '#FF8A78' }
  };

  function money(c) { return '$' + (c / 100).toFixed(2); }
  function uuid() {
    if (W.crypto && crypto.randomUUID) return crypto.randomUUID();
    var b = new Uint8Array(16); crypto.getRandomValues(b);
    b[6] = (b[6] & 15) | 64; b[8] = (b[8] & 63) | 128;
    var h = [].map.call(b, function (x) { return (x + 256).toString(16).slice(1); }).join('');
    return h.slice(0, 8) + '-' + h.slice(8, 12) + '-' + h.slice(12, 16) + '-' + h.slice(16, 20) + '-' + h.slice(20);
  }
  function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  function start() {
    var root = d.querySelector('[data-gc-co]');
    var cart = W.GCCart, brew = W.GCBrew;
    if (!root || !cart || !brew) return;
    var data = cart.data;
    var api = root.getAttribute('data-pay-api') || '';
    var onSite = !!api && (root.getAttribute('data-on-site') === 'true' || /[?&]try=1(&|$)/.test(location.search));
    var form = root.querySelector('[data-gc-co-form]');
    var main = root.querySelector('[data-gc-co-main]');
    var empty = root.querySelector('[data-gc-co-empty]');
    var sum = root.querySelector('[data-gc-co-sum]');
    var toggle = root.querySelector('[data-gc-co-toggle]');
    var payBtn = root.querySelector('[data-gc-pay]');
    var payLabel = root.querySelector('[data-gc-pay-label]');
    var errBox = root.querySelector('[data-gc-co-err]');
    var zones = [].slice.call(root.querySelectorAll('input[name="gc-co-zone"]'));
    var F = {};
    FIELDS.forEach(function (f) { F[f] = form.elements[f]; });

    var quote = null, quoteSeq = 0, quoteTimer = 0, card = null, payments = null, payReq = null;
    var ready = false, busy = false, started = false;
    // The discount code: the one they got for signing up, if any (cart.js).
    var code = (cart.code && cart.code()) || '';

    function s() { return cart.state(); }
    function count(st) { var n = 0; for (var k in st.q) n += st.q[k]; return n; }
    function key(st) { return JSON.stringify(st) + '|' + code; }

    // ---- the order summary ---------------------------------------------
    function render() {
      var st = s(), n = count(st);
      empty.hidden = !!n;
      main.hidden = !n || !onSite;
      if (!n) return;
      var priceC = Math.round(data.price * 100);
      data.blends.forEach(function (k) {
        var q = st.q[k];
        root.querySelector('[data-gc-co-row="' + k + '"]').hidden = !q;
        root.querySelector('[data-gc-co-q="' + k + '"]').textContent = q + ' × ' + money(priceC);
        root.querySelector('[data-gc-co-line="' + k + '"]').textContent = money(q * priceC);
      });
      // Square's own figures once they're in; the cart's (identical) sums till then.
      var t = quote && quote.key === key(st) ? quote : local(st);
      root.querySelector('[data-gc-co-count]').textContent = n === 1 ? '1 pouch' : n + ' pouches';
      root.querySelector('[data-gc-co-sub]').textContent = money(t.subtotal);
      root.querySelector('[data-gc-co-discrow]').hidden = !t.pairDiscount;
      root.querySelector('[data-gc-co-disc]').textContent = '−' + money(t.pairDiscount);
      root.querySelector('[data-gc-co-coderow]').hidden = !t.codeDiscount;
      root.querySelector('[data-gc-co-codename]').textContent = code + ' · code';
      root.querySelector('[data-gc-co-codeoff]').textContent = '−' + money(t.codeDiscount);
      root.querySelector('[data-gc-co-taxrow]').hidden = !t.tax;
      root.querySelector('[data-gc-co-tax]').textContent = money(t.tax);
      root.querySelector('[data-gc-co-ship]').textContent = !st.z ? '—' : t.shipping ? money(t.shipping) : 'Free';
      root.querySelector('[data-gc-co-total]').textContent = money(t.total);
      root.querySelector('[data-gc-co-total-top]').textContent = money(t.total);
      zones.forEach(function (z) { z.checked = z.value === st.z; z.closest('.gc-zone').classList.toggle('is-on', z.checked); });
      saskatoon(st.z === 'saskatoon');
      button();
    }
    function local(st) {
      var t = cart.totals();
      var c = function (x) { return Math.round(x * 100); };
      return { subtotal: c(t.sub), pairDiscount: c(t.saving), codeDiscount: 0, tax: c(t.tax), shipping: st.z ? c(t.fee) : 0, total: c(t.total) };
    }
    function button() {
      var st = s();
      var can = ready && !busy && quote && quote.key === key(st) && st.z;
      payBtn.disabled = !can;
      if (busy) return;
      payLabel.textContent = !ready ? 'Getting the kettle on…' : !st.z ? 'Choose where it’s going' : can ? 'Pay ' + money(quote.total) : 'Working out your total…';
    }

    // Saskatoon orders are delivered in Saskatoon, so the city fills itself in
    // (and goes back to whatever was typed if they switch to Canada Post).
    var wasSaskatoon = null, cityBefore = '';
    function saskatoon(on) {
      if (on === wasSaskatoon) return;
      if (on) { cityBefore = F.city.value; F.city.value = 'Saskatoon'; F.province.value = 'SK'; }
      else if (wasSaskatoon) F.city.value = cityBefore;
      F.city.readOnly = on; F.province.disabled = on;
      wasSaskatoon = on;
    }

    // ---- talking to the checkout service --------------------------------
    // Retries (same body, so the same attempt) when the connection drops or
    // the service hiccups: the attempt ID makes that safe, never a second charge.
    function post(body, retries) {
      var ctl = W.AbortController ? new AbortController() : null;
      var timer = ctl ? setTimeout(function () { ctl.abort(); }, 30000) : 0;
      return fetch(api, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: body, signal: ctl ? ctl.signal : undefined })
        .then(function (r) {
          clearTimeout(timer);
          return r.json().catch(function () { return {}; }).then(function (j) { return { status: r.status, body: j }; });
        })
        .then(function (res) {
          if (res.status >= 500 && retries > 0) return wait(1500).then(function () { return post(body, retries - 1); });
          return res;
        }, function (e) {
          clearTimeout(timer);
          if (retries > 0) return wait(1500).then(function () { return post(body, retries - 1); });
          throw e;
        });
    }
    function requote() {
      var st = s();
      clearTimeout(quoteTimer);
      if (!count(st) || !st.z) { render(); return Promise.resolve(); }
      var seq = ++quoteSeq;
      render();
      return post(JSON.stringify({ action: 'quote', items: st.q, zone: st.z, code: code || undefined }), 1).then(function (r) {
        if (seq !== quoteSeq) return;
        // A code that doesn't work: say so, and carry on without it.
        if (r.status === 400 && r.body && r.body.error === 'bad_code') { badCode(); return requote(); }
        if (r.status !== 200 || typeof r.body.total !== 'number') throw new Error('quote');
        quote = r.body; quote.key = key(st);
        if (quoteErr) { quoteErr = false; error(''); }
        if (code && quote.codeDiscount) codeSays(code + ' applied: ' + money(quote.codeDiscount) + ' off.', true);
        render();
        if (ready && !payReq) wallets(); else walletTotal();
      });
    }
    var quoteErr = false;
    function requoteSoon() {
      clearTimeout(quoteTimer);
      quoteTimer = setTimeout(function () {
        requote().catch(function () { quoteErr = true; error('Couldn’t work out your total just now. Check your connection, then try again.'); });
      }, 250);
    }

    // ---- the form ---------------------------------------------------------
    function fieldError(f, msg) {
      var el = f === 'zone' ? null : F[f];
      var m = root.querySelector('[data-gc-msg="' + f + '"]');
      if (el) el.setAttribute('aria-invalid', msg ? 'true' : 'false');
      if (m) m.textContent = msg || '';
      return el || zones[0];
    }
    function readForm() {
      var v = {}, bad = [], st = s();
      FIELDS.forEach(function (f) { v[f] = (F[f].value || '').trim().replace(/\s+/g, ' '); fieldError(f, ''); });
      fieldError('zone', '');
      if (!st.z) bad.push(['zone', MSG.zone]);
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email)) bad.push(['email', MSG.email]);
      var ph = v.phone.replace(/[^\d+]/g, '');
      if (ph && !/^(\+?1)?\d{10}$/.test(ph) && !/^\+\d{8,15}$/.test(ph)) bad.push(['phone', MSG.phone]);
      if (!v.first) bad.push(['first', MSG.first]);
      if (!v.last) bad.push(['last', MSG.last]);
      if (!v.line1) bad.push(['line1', MSG.line1]);
      var pm = v.postal.toUpperCase().replace('-', ' ').match(POSTAL);
      if (st.z === 'saskatoon') { v.city = 'Saskatoon'; v.province = 'SK'; }
      if (!v.city) bad.push(['city', MSG.city]);
      if (PROVINCES.indexOf(v.province) < 0) bad.push(['province', MSG.province]);
      if (!pm) bad.push(['postal', MSG.postal]);
      else {
        v.postal = pm[1] + ' ' + pm[2];
        F.postal.value = v.postal;
        if (st.z === 'saskatoon' && !/^S7/.test(v.postal)) bad.push(['postal', 'not_saskatoon']);
      }
      bad.forEach(function (b) {
        if (b[1] === 'not_saskatoon') notSaskatoon(); else fieldError(b[0], b[1]);
      });
      if (bad.length) {
        var first = bad[0][0] === 'zone' ? zones[0] : F[bad[0][0]];
        if (first && first.focus) first.focus();
        return null;
      }
      return v;
    }
    // Free delivery is for Saskatoon: offer the Canada Post option instead.
    function notSaskatoon() {
      var m = fieldError('postal', MSG.not_saskatoon + ' ');
      var b = d.createElement('button');
      b.type = 'button'; b.textContent = 'Ship it by Canada Post instead';
      b.addEventListener('click', function () { fieldError('postal', ''); cart.setZone('canada'); F.city.focus(); });
      root.querySelector('[data-gc-msg="postal"]').appendChild(b);
      return m;
    }
    function error(msg) { errBox.textContent = msg || ''; }

    // ---- paying -------------------------------------------------------------
    function payWith(method, isCard) {
      if (busy || !method) return;
      error('');
      var st = s(), b = readForm();
      if (!b || !quote || quote.key !== key(st)) return;
      busy = true;
      payBtn.disabled = true;
      payLabel.textContent = 'Checking your card…';
      // Wallets want tokenize() straight from the tap, so nothing waits before it.
      var tokenizing = isCard ? method.tokenize({
        amount: (quote.total / 100).toFixed(2), currencyCode: 'CAD', intent: 'CHARGE',
        customerInitiated: true, sellerKeyedIn: false,
        billingContact: {
          givenName: b.first, familyName: b.last, email: b.email, phone: b.phone || undefined,
          addressLines: [b.line1, b.line2].filter(Boolean), city: b.city, state: b.province,
          countryCode: 'CA', postalCode: b.postal
        }
      }) : method.tokenize();
      Promise.resolve(tokenizing).then(function (res) {
        if (!res || res.status !== 'OK' || !res.token) {
          busy = false; button();
          if (!res || (res.status !== 'Cancel' && res.status !== 'Abort')) error('Have another look at your card details.');
          return;
        }
        send(res.token, b, st);
      }, function () { busy = false; button(); error('Have another look at your card details.'); });
    }
    function send(token, b, st) {
      brew.show(PAYING);
      var body = JSON.stringify({
        action: 'pay', attempt: uuid(), token: token, items: st.q, zone: st.z, expectTotal: quote.total,
        contact: { email: b.email, phone: b.phone }, code: code || undefined, optIn: !!form.elements.optin.checked,
        address: { first: b.first, last: b.last, line1: b.line1, line2: b.line2, city: b.city, province: b.province, postal: b.postal }
      });
      post(body, 2).then(function (r) {
        if (r.status === 200 && r.body && r.body.ok) return done(r.body);
        brew.hide(); busy = false; button();
        var e = r.body && r.body.error;
        if (r.status === 402) error(DECLINE[r.body.code] || DECLINED);
        else if (r.status === 409 && typeof r.body.total === 'number') {
          quote = r.body; quote.key = key(st); render(); walletTotal();
          error('Heads up: your total just changed to ' + money(r.body.total) + '. Tap Pay to go ahead.');
        } else if (r.status === 400 && e === 'not_saskatoon') notSaskatoon();
        else if (r.status === 400 && e === 'bad_code') { badCode(); requoteSoon(); error('That code doesn’t work any more, so it’s off your total. Check it, then tap Pay.'); }
        else if (r.status === 400 && MSG[e]) { var el = fieldError(e, MSG[e]); if (el && el.focus) el.focus(); }
        else if (r.status === 429) error('Whoa, that’s a lot of tries. Take a breather and try again in a few minutes.');
        else if (r.status >= 500) error('We couldn’t confirm the payment. Before trying again, check your inbox for a receipt: no receipt means nothing was charged.');
        else error('We couldn’t take the payment just now, and nothing was charged. Try again in a moment.');
      }, function () {
        brew.hide(); busy = false; button();
        error('We lost the connection before your bank answered. Before trying again, check your inbox for a receipt: no receipt means nothing was charged.');
      });
    }
    function done(r) {
      brew.done('That’s ordered!', 'Pouring your receipt…');
      try { sessionStorage.setItem('gc_last_order', JSON.stringify({ receipt: r.receipt, receiptUrl: r.receiptUrl, total: r.total, zone: r.zone })); } catch (e) {}
      cart.clear();
      setTimeout(function () {
        location.href = root.getAttribute('data-thanks') + '?order=' + encodeURIComponent(r.receipt || '');
      }, 1500);
    }

    // ---- Apple Pay / Google Pay, where the device and Square allow them --
    function walletTotal() {
      if (!payReq || !quote) return;
      try { payReq.update({ total: { amount: (quote.total / 100).toFixed(2), label: 'God’s Chai' } }); } catch (e) {}
    }
    function wallets() {
      if (!payments || !quote) return;
      try {
        payReq = payments.paymentRequest({ countryCode: 'CA', currencyCode: 'CAD', total: { amount: (quote.total / 100).toFixed(2), label: 'God’s Chai' } });
      } catch (e) { return; }
      var box = root.querySelector('[data-gc-wallets]');
      Promise.resolve().then(function () { return payments.applePay(payReq); }).then(function (ap) {
        var b = root.querySelector('[data-gc-applepay]');
        b.hidden = false; box.hidden = false;
        b.addEventListener('click', function (e) { e.preventDefault(); payWith(ap); });
        b.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); payWith(ap); } });
      }).catch(function () {});
      Promise.resolve().then(function () { return payments.googlePay(payReq); }).then(function (gp) {
        return gp.attach('#gc-googlepay', { buttonColor: 'white', buttonSizeMode: 'fill', buttonType: 'long' }).then(function () {
          var b = root.querySelector('#gc-googlepay');
          b.hidden = false; box.hidden = false;
          b.addEventListener('click', function (e) { e.preventDefault(); payWith(gp); });
        });
      }).catch(function () {});
    }

    // ---- getting going --------------------------------------------------
    function loadSDK() {
      return new Promise(function (res, rej) {
        if (W.Square) { res(W.Square); return; }
        var el = d.createElement('script');
        var t = setTimeout(function () { rej(new Error('timeout')); }, 15000);
        el.src = SDK; el.async = true;
        el.onload = function () { clearTimeout(t); if (W.Square) res(W.Square); else rej(new Error('missing')); };
        el.onerror = function () { clearTimeout(t); rej(new Error('load')); };
        d.head.appendChild(el);
      });
    }
    // Square's own checkout page, as before.
    function handOver() {
      main.hidden = true;
      cart.hosted(function (msg) { main.hidden = false; error(msg); });
    }
    function begin() {
      if (started || !count(s())) return;
      started = true;
      if (!onSite) { handOver(); return; }
      var ctl = W.AbortController ? new AbortController() : null;
      var t = ctl ? setTimeout(function () { ctl.abort(); }, 10000) : 0;
      fetch(api, { signal: ctl ? ctl.signal : undefined })
        .then(function (r) { clearTimeout(t); return r.json(); })
        .then(function (cfg) {
          if (!cfg || !cfg.ready || !cfg.applicationId) throw new Error('not ready');
          return loadSDK().then(function (Sq) { return Sq.payments(cfg.applicationId, cfg.locationId); });
        })
        .then(function (p) { payments = p; return p.card({ style: STYLE }); })
        .then(function (c) {
          var box = root.querySelector('[data-gc-card]');
          box.textContent = '';
          return c.attach('#gc-card').then(function () { card = c; });
        })
        .then(function () { return requote(); })
        .then(function () { ready = true; render(); if (quote) wallets(); })
        .catch(handOver);
    }

    // ---- the discount code box -----------------------------------------------
    var codeBox = root.querySelector('[data-gc-co-codebox]'), codeIn = root.querySelector('[data-gc-co-codein]');
    var codeOpen = root.querySelector('[data-gc-co-code-open]'), codeMsg = root.querySelector('[data-gc-co-codemsg]');
    function codeSays(text, removable) {
      codeMsg.textContent = text;
      if (removable) {
        var x = d.createElement('button');
        x.type = 'button'; x.textContent = 'Remove';
        x.addEventListener('click', function () { setCode(''); codeSays('', false); requoteSoon(); });
        codeMsg.appendChild(x);
      }
    }
    function setCode(c) { code = c; codeIn.value = c; codeBox.hidden = true; codeOpen.hidden = !!c; }
    function badCode() {
      codeIn.value = code; code = '';
      codeBox.hidden = false; codeOpen.hidden = true;
      codeSays('That code doesn’t work.', false);
    }
    function applyCode() {
      var c = codeIn.value.trim().toUpperCase();
      if (!c || busy) return;
      setCode(c);
      codeSays('Checking ' + c + '…', false);
      requoteSoon();
    }
    codeOpen.addEventListener('click', function () { codeOpen.hidden = true; codeBox.hidden = false; codeIn.focus(); });
    root.querySelector('[data-gc-co-code-apply]').addEventListener('click', applyCode);
    codeIn.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); applyCode(); } });
    if (code) { codeOpen.hidden = true; codeSays('Checking ' + code + '…', false); }

    // ---- wiring -----------------------------------------------------------
    form.addEventListener('submit', function (e) { e.preventDefault(); payWith(card, true); });
    zones.forEach(function (z) {
      z.addEventListener('change', function () { fieldError('zone', ''); fieldError('postal', ''); cart.setZone(z.value); });
    });
    FIELDS.forEach(function (f) {
      F[f].addEventListener('input', function () { if (F[f].getAttribute('aria-invalid') === 'true') fieldError(f, ''); });
    });
    F.postal.addEventListener('blur', function () {
      var m = F.postal.value.trim().toUpperCase().replace('-', ' ').match(POSTAL);
      if (m) F.postal.value = m[1] + ' ' + m[2];
    });
    toggle.addEventListener('click', function () {
      var open = !sum.classList.contains('is-open');
      sum.classList.toggle('is-open', open);
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    d.addEventListener('gc:cart', function () {
      if (busy) return;
      quote = null;
      render();
      if (!count(s())) return;
      if (!started) begin();
      else if (onSite) requoteSoon();
    });
    W.addEventListener('pageshow', function (e) {
      if (!e.persisted) return;
      busy = false; brew.hide(); render();
    });

    render();
    begin();
  }
  // cart.js comes later in the page; both have run by the time this fires.
  d.addEventListener('DOMContentLoaded', start);
})();
