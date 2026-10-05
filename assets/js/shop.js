/* God's Chai — the tick on /order-confirmed/: the same particle light as the
 * signup box (assets/js/particles.js). The cart itself is assets/js/cart.js.
 */
(function () {
  'use strict';
  var d = document;
  var canvas = d.querySelector('canvas[data-gc-done]');
  if (!canvas) return;
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
})();
