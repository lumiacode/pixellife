/* نوار بالای سایت (لوگو، جستجو، ورود و دسته‌بندی) با اسکرول به پایین پنهان و با اسکرول به بالا دوباره نمایان می‌شود. */
(function () {
  if (window.__plHeaderAutohide) return;
  window.__plHeaderAutohide = true;
  var header = document.querySelector(".header");
  if (!header) return;
  var root = document.documentElement;
  var navbar = document.querySelector(".navbar");
  var lastY = window.scrollY, ticking = false, hidden = false;
  var TOP_ZONE = 90, HIDE_AFTER = 28, SHOW_AFTER = 14;
  var dir = 0, dist = 0, ignoreUntil = 0;
  // نوار پایین موبایل هم از همین وضعیت پیروی می‌کند تا دو سیستم جدا ناهماهنگ بالا/پایین نروند.
  root.setAttribute("data-pl-autohide", "1");

  function measure() {
    var h = header.offsetHeight + (navbar ? navbar.offsetHeight : 0);
    root.style.setProperty("--pl-hide-y", h + 6 + "px");
  }
  function busy() {
    if (document.body && document.body.classList.contains("mobile-category-sheet-open")) return true;
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
    if (y <= TOP_ZONE) { set(false); lastY = y; dir = 0; dist = 0; return; }
    var d = y - lastY;
    lastY = y;
    // جهش نوار آدرس مرورگر/تغییر اندازه، حرکت واقعی انگشت نیست
    if (Date.now() < ignoreUntil || d === 0) return;
    var nd = d > 0 ? 1 : -1;
    if (nd !== dir) { dir = nd; dist = 0; }
    dist += Math.abs(d);
    // busy() (جست‌وجوی DOM) فقط وقتی لازم است که بخواهیم نوار را پنهان کنیم، نه در هر فریم اسکرول
    if (dir === 1 && dist >= HIDE_AFTER) { if (busy()) { set(false); } else { set(true); } dist = 0; }
    else if (dir === -1 && dist >= SHOW_AFTER) { set(false); dist = 0; }
  }
  window.addEventListener("scroll", function () {
    if (!ticking) { ticking = true; requestAnimationFrame(update); }
  }, { passive: true });
  window.addEventListener("resize", function () { ignoreUntil = Date.now() + 200; measure(); });
  window.addEventListener("load", measure);
  measure();
})();
