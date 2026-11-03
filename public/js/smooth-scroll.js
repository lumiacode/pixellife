/* اسکرول نرم (Lenis) فقط برای دسکتاپ با موس. موبایل/تاچ، «کاهش حرکت» سیستم، صفحه‌های سبد و پرداخت: همان اسکرول معمولی مرورگر.
   خاموش‌کردن سریع: در کنسول مرورگر  localStorage.plSmoothScroll = "off"  (یا ?smooth=off در آدرس برای یک‌بار).
   کتابخانه: public/js/vendor/lenis.min.js (نسخهٔ 1.3.27، مجوز MIT کنار آن است). */
(function () {
  if (window.__plSmoothScroll) return;
  window.__plSmoothScroll = true;
  if (typeof window.Lenis !== "function") return;
  var path = location.pathname.replace(/\/+$/, "");
  if (/^\/(?:cart|checkout|admin)(?:\/|$)/.test(path)) return;
  try {
    if (localStorage.getItem("plSmoothScroll") === "off" || /[?&]smooth=off\b/.test(location.search)) return;
  } catch (_) {}
  var desktop = window.matchMedia("(hover: hover) and (pointer: fine) and (min-width: 1024px)");
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  if (!desktop.matches || reduced.matches) return;

  // ناحیه‌هایی که اسکرول داخلی خودشان را دارند (منوها، کشوها، پنجره‌ها، چت) و نباید توسط اسکرول نرم صفحه گرفته شوند.
  var NESTED = "[data-lenis-prevent], #plAuth, #sharedAuthModal, #plAssistant, #plAssistantMenu, .megamenu-panel, .cart-dropdown, .profile-dropdown, .pl-sg, .combo-sheet, .mobile-category-sheet, .modal-overlay, textarea, select";
  var lenis = new window.Lenis({
    lerp: 0.1,
    smoothWheel: true,
    syncTouch: false,
    wheelMultiplier: 1,
    allowNestedScroll: true,
    autoRaf: true,
    prevent: function (node) { return !!(node && node.closest && node.closest(NESTED)); },
  });
  window.plSmoothScroll = lenis;

  // وقتی پنجره‌ای صفحه را قفل می‌کند (overflow: hidden)، اسکرول نرم هم متوقف می‌شود.
  function locked() {
    return getComputedStyle(document.body).overflow === "hidden" || getComputedStyle(document.documentElement).overflow === "hidden";
  }
  var stopped = false;
  function sync() {
    var shouldStop = locked();
    if (shouldStop === stopped) return;
    stopped = shouldStop;
    if (shouldStop) lenis.stop(); else lenis.start();
  }
  var observer = new MutationObserver(sync);
  observer.observe(document.body, { attributes: true, attributeFilter: ["class", "style"] });
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class", "style"] });
  sync();

  // با تغییر اندازهٔ پنجره/نوع دستگاه (مثلاً تغییر به حالت تبلت)، اسکرول نرم خاموش می‌شود.
  function recheck() { if (!desktop.matches || reduced.matches) { observer.disconnect(); lenis.destroy(); delete window.plSmoothScroll; } }
  if (desktop.addEventListener) { desktop.addEventListener("change", recheck); reduced.addEventListener("change", recheck); }
})();
