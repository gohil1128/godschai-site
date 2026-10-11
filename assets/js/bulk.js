/* God's Chai — the bulk order form (/bulk-orders/).
 *
 * Keeps "Your request" up to date, checks the form, then opens an email to the
 * shop with the whole order filled in. The same text is shown to copy, in case
 * no email app opens. Nothing is sent from here and nothing is paid: the shop
 * replies with a quote and a payment link. Settings live in _data/bulk.yml.
 */
(function () {
  'use strict';
  var d = document;
  var form = d.querySelector('[data-gc-bulk]');
  if (!form) return;

  var TO = form.getAttribute('data-to') || '';
  var NOTICE_H = Number(form.getAttribute('data-notice')) || 48;
  var qtys = [].slice.call(form.querySelectorAll('.gc-bk-step input'));
  var date = form.elements.date, time = form.elements.time;
  var address = form.elements.address, name = form.elements.name, email = form.elements.email;
  var addressBox = form.querySelector('[data-gc-bulk-address]');
  var done = form.querySelector('[data-gc-bulk-done]');
  var err = form.querySelector('[data-gc-bulk-err]');
  var textBox = form.querySelector('[data-gc-bulk-text]');
  var tried = false; // problems only show once someone has pressed Send

  function msg(k) { return form.querySelector('[data-gc-bulk-msg="' + k + '"]'); }
  function row(k) { return form.querySelector('[data-gc-bulk-row="' + k + '"]'); }

  /* ---- dates ---- */
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function earliest() { return new Date(Date.now() + NOTICE_H * 3600e3); }
  function day(t, long) {
    return t.toLocaleDateString('en-CA', long ? { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' } : { weekday: 'short', month: 'short', day: 'numeric' });
  }
  function clock(t) { return t.toLocaleTimeString('en-CA', { hour: 'numeric', minute: '2-digit' }); }
  var first = earliest();
  date.min = first.getFullYear() + '-' + pad(first.getMonth() + 1) + '-' + pad(first.getDate());
  // The day and time they picked, in their own time zone.
  function when() {
    if (!date.value || !time.value) return null;
    var p = date.value.split('-'), q = time.value.split(':');
    var t = new Date(+p[0], p[1] - 1, +p[2], +q[0], +q[1]);
    return isNaN(t) ? null : t;
  }

  /* ---- how much ---- */
  function num(input) { var v = parseInt(input.value, 10); return isNaN(v) || v < 0 ? 0 : v; }
  function rules(input) {
    return {
      min: Number(input.getAttribute('data-min')) || 1,
      step: Number(input.getAttribute('data-step')) || 1,
      max: Number(input.max) || 999,
      each: Number(input.getAttribute('data-each')) || 1
    };
  }
  // Nothing, or between the minimum and the maximum: 3 cups typed becomes 10.
  function tidy(input) {
    var v = num(input), R = rules(input);
    if (v > 0 && v < R.min) v = R.min;
    if (v > R.max) v = R.max;
    input.value = v;
  }
  // "20 cups", "3 dozen (36)"; short leaves the count off: "3 dozen".
  function amount(input, short) {
    var v = num(input), R = rules(input);
    if (!v) return '';
    return v + ' ' + input.getAttribute(v === 1 ? 'data-one' : 'data-unit') + (R.each > 1 && !short ? ' (' + v * R.each + ')' : '');
  }
  qtys.forEach(function (input) {
    var box = input.parentNode;
    box.querySelector('[data-gc-bulk-inc]').addEventListener('click', function () {
      var v = num(input), R = rules(input);
      input.value = v < R.min ? R.min : Math.min(R.max, v + R.step);
      update();
    });
    box.querySelector('[data-gc-bulk-dec]').addEventListener('click', function () {
      var v = num(input), R = rules(input);
      input.value = v <= R.min ? 0 : Math.max(R.min, v - R.step);
      update();
    });
    input.addEventListener('change', function () { tidy(input); update(); });
  });

  /* ---- pickup or delivery ---- */
  function how() {
    var r = form.querySelector('input[name="how"]:checked');
    return r ? r.value : 'delivery';
  }
  function howLabel(v) {
    var r = form.querySelector('input[name="how"][value="' + v + '"]');
    return r ? r.closest('label').querySelector('b').textContent : v;
  }

  /* ---- what still needs doing ---- */
  var FIELDS = { items: qtys, when: [date, time], address: [address], name: [name], email: [email] };
  function problems() {
    var out = {}, t = when(), e = earliest(), mail = email.value.trim();
    if (!qtys.some(function (i) { return num(i) > 0; })) out.items = 'Pick some chai, some samosas, or both.';
    if (!t) out.when = 'Pick a day and a time.';
    else if (t < e) out.when = 'We need ' + NOTICE_H + ' hours’ notice. The earliest we can do is ' + day(e) + ' at ' + clock(e) + '.';
    if (how() === 'delivery' && !address.value.trim()) out.address = 'Where should we bring it?';
    if (!name.value.trim()) out.name = 'Who’s it for?';
    if (!mail) out.email = 'We need an email to send your quote to.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)) out.email = 'That email doesn’t look quite right.';
    return out;
  }
  function mark(p) {
    Object.keys(FIELDS).forEach(function (k) {
      var m = msg(k);
      if (m) m.textContent = p[k] || '';
      FIELDS[k].forEach(function (f) {
        if (p[k] && (k !== 'items' || !num(f))) f.setAttribute('aria-invalid', 'true');
        else f.removeAttribute('aria-invalid');
      });
    });
    if (!Object.keys(p).length) err.textContent = '';
  }

  /* ---- "Your request" ---- */
  function update() {
    qtys.forEach(function (i) {
      var r = row(i.name), s = amount(i), R = rules(i), v = num(i);
      r.textContent = s || '—';
      r.classList.toggle('is-empty', !s);
      i.parentNode.querySelector('[data-gc-bulk-dec]').disabled = v <= 0;
      i.parentNode.querySelector('[data-gc-bulk-inc]').disabled = v >= R.max;
    });
    var t = when(), w = row('when');
    w.textContent = t ? day(t) + ', ' + clock(t) : '—';
    w.classList.toggle('is-empty', !t);
    row('how').textContent = howLabel(how());
    addressBox.hidden = how() !== 'delivery';
    [].forEach.call(form.querySelectorAll('.gc-bk-way'), function (l) { l.classList.toggle('is-on', l.querySelector('input').checked); });
    if (tried) mark(problems());
    // Anything changed after sending means the email that opened is out of date.
    done.hidden = true;
  }
  form.addEventListener('input', update);
  form.addEventListener('change', update);

  /* ---- the email ---- */
  function lines() {
    var t = when(), out = ['Hi God’s Chai,', '', 'I’d like to place a bulk order.', ''];
    qtys.forEach(function (i) { if (num(i)) out.push(i.getAttribute('data-name') + ': ' + amount(i)); });
    out.push('', 'When: ' + day(t, true) + ' at ' + clock(t));
    out.push(how() === 'delivery' ? howLabel('delivery') + ' to: ' + address.value.trim() : howLabel('pickup'));
    out.push('', 'Name: ' + name.value.trim());
    if (form.elements.phone.value.trim()) out.push('Phone: ' + form.elements.phone.value.trim());
    out.push('Email: ' + email.value.trim());
    if (form.elements.notes.value.trim()) out.push('', 'Notes: ' + form.elements.notes.value.trim());
    out.push('', 'Please confirm and send me a quote. Thanks!');
    return out.join('\n');
  }
  function subject() {
    var parts = qtys.filter(function (i) { return num(i); }).map(function (i) { return amount(i, true) + ' ' + i.getAttribute('data-name').toLowerCase(); });
    return 'Bulk order: ' + parts.join(' + ') + ', ' + day(when());
  }

  form.addEventListener('submit', function (ev) {
    ev.preventDefault();
    tried = true;
    qtys.forEach(tidy);
    update();
    var p = problems(), keys = Object.keys(FIELDS).filter(function (k) { return p[k]; });
    mark(p);
    if (keys.length) {
      err.textContent = 'Almost! A couple of things need sorting first.';
      var f = FIELDS[keys[0]].filter(function (x) { return x.getAttribute('aria-invalid') === 'true'; })[0] || FIELDS[keys[0]][0];
      f.focus();
      return;
    }
    var text = lines();
    var href = 'mailto:' + TO + '?subject=' + encodeURIComponent(subject()) + '&body=' + encodeURIComponent(text.replace(/\n/g, '\r\n'));
    textBox.textContent = text;
    var link = form.querySelector('[data-gc-bulk-mailto]');
    if (link) link.href = href;
    done.hidden = false;
    done.focus({ preventScroll: true });
    if (TO) window.location.href = href;
  });

  form.querySelector('[data-gc-bulk-copy]').addEventListener('click', function () {
    var b = this, text = textBox.textContent;
    function copied() {
      b.textContent = 'Copied!';
      setTimeout(function () { b.textContent = 'Copy my request'; }, 1600);
    }
    function select() {
      var r = d.createRange(), s = window.getSelection();
      r.selectNodeContents(textBox);
      s.removeAllRanges();
      s.addRange(r);
      b.textContent = 'Selected: copy it from there';
    }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(copied, select);
    else select();
  });

  update();
})();
