/* تکمیل پروفایل اجباری: بدون نام، نام خانوادگی و آدرس، ساخت حساب و خرید ممکن نیست.
   - بلافاصله بعد از ورود/ثبت‌نام، کاربرِ ناقص به صفحهٔ تکمیل اطلاعات می‌رود.
   - صفحهٔ پرداخت (/checkout) برای کاربر ناقص باز نمی‌شود (سرور هم ثبت سفارش را رد می‌کند). */
(function () {
  if (window.__plProfileGate) return;
  window.__plProfileGate = true;
  var KEY = "pl_profile_gate_checked";

  function storedUser() {
    try { return JSON.parse(localStorage.getItem("user") || "null"); } catch (e) { return null; }
  }
  function goComplete() {
    if (location.pathname.indexOf("/profile") === 0) return;
    var next = encodeURIComponent(location.pathname + location.search);
    location.href = "/profile?complete=1&next=" + next;
  }
  function isIncomplete(user) { return Boolean(user) && user.profileComplete === false; }

  // ۱) بعد از ورود موفق (کلاس logged-in روی body)، پس از نمایش پیام موفقیت
  var wasLoggedIn = document.body.classList.contains("logged-in");
  new MutationObserver(function () {
    var now = document.body.classList.contains("logged-in");
    if (now && !wasLoggedIn && isIncomplete(storedUser())) setTimeout(goComplete, 2000);
    wasLoggedIn = now;
  }).observe(document.body, { attributes: true, attributeFilter: ["class"] });

  // ۲) وضعیت تازه از سرور؛ حداکثر هر ۱۰ دقیقه یک‌بار
  var user = storedUser();
  if (!user) return;
  var onCheckout = location.pathname.indexOf("/checkout") === 0;
  var last = 0;
  try { last = Number(sessionStorage.getItem(KEY) || 0); } catch (e) {}
  if (isIncomplete(user) && onCheckout) { goComplete(); return; }
  if (!onCheckout && last && Date.now() - last < 10 * 60 * 1000) return;
  fetch("/api/auth/me", { credentials: "include" })
    .then(function (res) { return res.ok ? res.json() : null; })
    .then(function (data) {
      if (!data || !data.user) return;
      try { sessionStorage.setItem(KEY, String(Date.now())); } catch (e) {}
      var merged = Object.assign({}, storedUser() || {}, data.user);
      try { localStorage.setItem("user", JSON.stringify(merged)); } catch (e) {}
      if (isIncomplete(merged) && onCheckout) goComplete();
    })
    .catch(function () {});
})();
