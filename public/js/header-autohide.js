/* نوار بالای سایت (لوگو، جستجو، ورود و دسته‌بندی) با اسکرول به پایین پنهان و با اسکرول به بالا دوباره نمایان می‌شود. */
(function () {
  if (window.__plHeaderAutohide) return;
  window.__plHeaderAutohide = true;
  var header = document.querySelector(".header");
  if (!header) return;
  var root = document.documentElement;
  var navbar = document.querySelector(".navbar");
  var lastY = window.scrollY, ticking = false, hidden = false;
  var TOP_ZONE = 90, DELTA = 8;

  function measure() {
    var h = header.offsetHeight + (navbar ? navbar.offsetHeight : 0);
    root.style.setProperty("--pl-hide-y", h + 6 + "px");
  }
  function busy() {
    if (document.querySelector(".megamenu-panel.open, .profile-dropdown.open, .cart-dropdown.open")) return true;
    var a = document.activeElement;
    return !!(a && header.contains(a) && /^(INPUT|TEXTAREA)$/.test(a.tagName));
  }
  function set(next) {
    if (next === hidden) return;
    hidden = next;
    root.classList.toggle("pl-hdr-hidden", next);
  }
  function update() {
    ticking = false;
    var y = window.scrollY;
    if (y < 0) y = 0;
    if (y <= TOP_ZONE || busy()) { set(false); lastY = y; return; }
    var d = y - lastY;
    if (Math.abs(d) < DELTA) return;
    set(d > 0);
    lastY = y;
  }
  window.addEventListener("scroll", function () {
    if (!ticking) { ticking = true; requestAnimationFrame(update); }
  }, { passive: true });
  window.addEventListener("resize", measure);
  window.addEventListener("load", measure);
  measure();
})();
