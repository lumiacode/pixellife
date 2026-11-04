/* نوار مراحل خرید (فقط نمایشی، غیرقابل کلیک). هر عنصر <div data-pl-steps data-current="cart|shipping|payment"> را پر می‌کند. */
(function () {
  var STEPS = [
    { key: "cart", label: "سبد خرید", icon: "ti-shopping-cart", href: "/cart" },
    { key: "shipping", label: "آدرس و ارسال", icon: "ti-map-pin", href: "/checkout/shipping" },
    { key: "payment", label: "پرداخت", icon: "ti-credit-card", href: "/checkout/payment" }
  ];
  var LAST_KEY = "pl_steps_last";
  function currentIndex(host) {
    var key = host.getAttribute("data-current");
    if (key === "done") return STEPS.length; // همهٔ مرحله‌ها کامل (صفحهٔ پرداخت موفق)
    if (!key) {
      var p = location.pathname.replace(/\/+$/, "");
      key = p === "/cart" ? "cart" : /\/payment$/.test(p) ? "payment" : "shipping";
    }
    for (var i = 0; i < STEPS.length; i++) if (STEPS[i].key === key) return i;
    return 0;
  }
  function render(host) {
    var cur = currentIndex(host);
    var fillIdx = Math.min(cur, STEPS.length - 1);
    var from = fillIdx;
    try {
      var last = sessionStorage.getItem(LAST_KEY);
      from = last === null ? Math.max(0, fillIdx - 1) : Math.min(STEPS.length - 1, Math.max(0, parseInt(last, 10) || 0));
      sessionStorage.setItem(LAST_KEY, String(fillIdx));
    } catch (_) { from = Math.max(0, fillIdx - 1); }
    var items = STEPS.map(function (s, i) {
      var state = i < cur ? "is-done" : i === cur ? "is-current" : "is-todo";
      var inner = '<span class="pl-step__dot"><i class="ti ' + (i < cur ? "ti-check" : s.icon) + '" aria-hidden="true"></i></span><span class="pl-step__label">' + s.label + "</span>";
      // فقط نمایش مراحل؛ هیچ مرحله‌ای لینک یا دکمه نیست (رفتن به مرحلهٔ بعد با «ثبت سفارش» و برگشت با «بازگشت» است).
      var tag = '<span class="pl-step__btn"' + (i === cur ? ' aria-current="step"' : "") + ">" + inner + "</span>";
      return '<li class="pl-step ' + state + '">' + tag + "</li>";
    }).join("");
    host.innerHTML = '<nav class="pl-steps-wrap" aria-label="مراحل ثبت سفارش"><ol class="pl-steps" style="--n:' + STEPS.length + ";--cur:" + fillIdx + ";--from:" + from + '"><span class="pl-steps__track"></span><span class="pl-steps__fill"></span>' + items + "</ol></nav>";
  }
  window.PLSteps = { render: render };
  function init() { Array.prototype.forEach.call(document.querySelectorAll("[data-pl-steps]"), render); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
