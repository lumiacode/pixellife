/* نوار مراحل خرید. هر عنصر <div data-pl-steps data-current="cart|shipping|payment"> را پر می‌کند.
   مرحله‌های طی‌شده لینک‌اند (قابل لمس)؛ مرحلهٔ بعد فقط اگر data-next="#selector" داده شود (مثلاً دکمهٔ ثبت سفارش سبد) دکمه است. */
(function () {
  var STEPS = [
    { key: "cart", label: "سبد خرید", icon: "ti-shopping-cart", href: "/cart" },
    { key: "shipping", label: "آدرس و ارسال", icon: "ti-map-pin", href: "/checkout/shipping" },
    { key: "payment", label: "پرداخت", icon: "ti-credit-card", href: "/checkout/payment" }
  ];
  var LAST_KEY = "pl_steps_last";
  function currentIndex(host) {
    var key = host.getAttribute("data-current");
    if (!key) {
      var p = location.pathname.replace(/\/+$/, "");
      key = p === "/cart" ? "cart" : /\/payment$/.test(p) ? "payment" : "shipping";
    }
    for (var i = 0; i < STEPS.length; i++) if (STEPS[i].key === key) return i;
    return 0;
  }
  function render(host) {
    var cur = currentIndex(host);
    var from = cur;
    try {
      var last = sessionStorage.getItem(LAST_KEY);
      from = last === null ? Math.max(0, cur - 1) : Math.min(STEPS.length - 1, Math.max(0, parseInt(last, 10) || 0));
      sessionStorage.setItem(LAST_KEY, String(cur));
    } catch (_) { from = Math.max(0, cur - 1); }
    var nextSel = host.getAttribute("data-next");
    var items = STEPS.map(function (s, i) {
      var state = i < cur ? "is-done" : i === cur ? "is-current" : "is-todo";
      var inner = '<span class="pl-step__dot"><i class="ti ' + (i < cur ? "ti-check" : s.icon) + '" aria-hidden="true"></i></span><span class="pl-step__label">' + s.label + "</span>";
      var tag;
      if (i < cur) tag = '<a class="pl-step__btn" href="' + s.href + '">' + inner + "</a>";
      else if (i === cur) tag = '<span class="pl-step__btn" aria-current="step">' + inner + "</span>";
      else if (i === cur + 1 && nextSel) tag = '<button type="button" class="pl-step__btn" data-pl-next>' + inner + "</button>";
      else tag = '<span class="pl-step__btn">' + inner + "</span>";
      return '<li class="pl-step ' + state + '">' + tag + "</li>";
    }).join("");
    host.innerHTML = '<nav class="pl-steps-wrap" aria-label="مراحل ثبت سفارش"><ol class="pl-steps" style="--n:' + STEPS.length + ";--cur:" + cur + ";--from:" + from + '"><span class="pl-steps__track"></span><span class="pl-steps__fill"></span>' + items + "</ol></nav>";
    var nextBtn = host.querySelector("[data-pl-next]");
    if (nextBtn && nextSel) nextBtn.addEventListener("click", function () { var t = document.querySelector(nextSel); if (t) t.click(); });
  }
  function init() { Array.prototype.forEach.call(document.querySelectorAll("[data-pl-steps]"), render); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
