/* God's Chai — the premix order box (_includes/shop-order.html).
 *
 * Adds up the order and points the button at the matching Square checkout
 * link. Nothing is paid, posted or stored here: the button only navigates to
 * Square, and Square's page takes the card and the address.
 *
 * Also lights the tick on /order-confirmed/.
 */
(function () {
  'use strict';
  var d = document;

  // Only ever send people to Square. A link that isn't one (a typo in
  // _data/shop.yml, say) is treated as missing rather than followed.
  var SQUARE = /^https:\/\/(square\.link|checkout\.square\.site|[a-z0-9-]+\.square\.site)\//;

  function money(n) { return '$' + n.toFixed(2); }

  function initShop(root) {
    var data;
    try { data = JSON.parse(root.querySelector('[data-gc-shop-data]').textContent); }
    catch (e) { return; }

    var rows = [].slice.call(root.querySelectorAll('[data-gc-blend]'));
    var zones = [].slice.call(root.querySelectorAll('input[name="gc-zone"]'));
    var go = root.querySelector('[data-gc-go]');
    var hint = root.querySelector('[data-gc-hint]');
    var qty = {};
    var url = '';

    // Start with one pouch of the first blend, so the box reads as an order
    // rather than an empty form. The zone is left for them to choose: guessing
    // Saskatoon would quietly give free delivery to the rest of the country.
    rows.forEach(function (row, i) {
      var key = row.getAttribute('data-gc-blend');
      qty[key] = i === 0 ? 1 : 0;
      row.querySelector('[data-gc-less]').addEventListener('click', function () { step(key, -1); });
      row.querySelector('[data-gc-more]').addEventListener('click', function () { step(key, 1); });
    });
    zones.forEach(function (z) { z.addEventListener('change', update); });

    function step(key, by) {
      qty[key] = Math.max(0, Math.min(data.max, qty[key] + by));
      update();
    }

    function zone() {
      for (var i = 0; i < zones.length; i++) if (zones[i].checked) return zones[i].value;
      return '';
    }

    function update() {
      var n = 0, name = '';
      rows.forEach(function (row) {
        var key = row.getAttribute('data-gc-blend');
        n += qty[key];
        name += key + qty[key];
        row.querySelector('output').textContent = qty[key];
        row.querySelector('[data-gc-less]').disabled = qty[key] === 0;
        row.querySelector('[data-gc-more]').disabled = qty[key] >= data.max;
      });
      var z = zone();
      zones.forEach(function (input) {
        input.closest('.gc-zone').classList.toggle('is-on', input.checked);
      });

      var sub = n * data.price;
      // Some zones ship free once the order is big enough (free_from in shop.yml).
      var freeAt = z ? data.free[z] : 0;
      var fee = z && !(freeAt && n >= freeAt) ? data.fees[z] : 0;
      var nudge = root.querySelector('[data-gc-nudge]');
      nudge.hidden = !(freeAt && n && n < freeAt);
      if (!nudge.hidden) {
        var more = freeAt - n;
        nudge.textContent = 'Add ' + more + ' more pouch' + (more === 1 ? '' : 'es') + ' and shipping is free.';
      }
      // Sales tax, worked out the way Square does it: per blend, in cents,
      // rounded, on the pouches only (never on shipping).
      var rate = z ? data.tax[z] : 0, tax = 0;
      if (rate) for (var k in qty) tax += Math.round(qty[k] * Math.round(data.price * 100) * rate);
      tax /= 100;
      var taxRow = root.querySelector('[data-gc-taxrow]');
      taxRow.hidden = !tax;
      if (tax) root.querySelector('[data-gc-tax]').textContent = money(tax);
      root.querySelector('[data-gc-count]').textContent = n === 1 ? '1 pouch' : n + ' pouches';
      root.querySelector('[data-gc-sub]').textContent = money(sub);
      root.querySelector('[data-gc-fee]').textContent = !z ? '—' : fee ? money(fee) : 'Free';
      root.querySelector('[data-gc-total]').textContent = money(sub + tax + fee);

      var link = n && z ? data.links[name + '-' + z] || '' : '';
      url = SQUARE.test(link) ? link : '';
      go.disabled = !url;
      hint.innerHTML = '';
      if (!n) hint.textContent = 'Add at least one pouch.';
      else if (!z) hint.textContent = 'Choose where it’s going.';
      else if (!url) {
        hint.textContent = 'That order can’t be checked out online yet — message us on ';
        var a = d.createElement('a');
        a.href = data.instagram;
        a.target = '_blank';
        a.rel = 'noopener';
        a.textContent = 'Instagram';
        hint.appendChild(a);
        hint.appendChild(d.createTextNode(' and we’ll sort it.'));
      }
    }

    go.addEventListener('click', function () {
      if (!url) return;
      go.disabled = true;
      go.textContent = 'Opening Square checkout…';
      location.href = url;
    });

    // Coming back from Square with the back button restores the page as it
    // was, button and all. Put the button back to normal.
    window.addEventListener('pageshow', function (e) {
      if (!e.persisted) return;
      go.textContent = 'Checkout securely with Square';
      update();
    });

    update();
    root.hidden = false;
  }

  // The tick on /order-confirmed/: the same particle light as the signup box.
  function initDone(canvas) {
    var s = d.createElement('script');
    s.src = canvas.getAttribute('data-gc-done');
    s.onload = function () {
      if (!window.GCParticles) return;
      canvas.hidden = false;
      var light = window.GCParticles.status(canvas);
      if (!light) { canvas.hidden = true; return; }
      setTimeout(function () { light.show('done'); }, 350);
    };
    d.head.appendChild(s);
  }

  function boot() {
    [].forEach.call(d.querySelectorAll('[data-gc-shop]'), initShop);
    var done = d.querySelector('canvas[data-gc-done]');
    if (done) initDone(done);
  }
  if (d.readyState === 'loading') d.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
