/* هم‌سازی خروج: ظاهر سایت (localStorage) و نشست واقعی (کوکی httpOnly روی سرور) باید همیشه یکی باشند.
   - هر دکمهٔ خروج، علاوه بر کارِ خودش، کوکی نشست را از سرور پاک می‌کند.
   - اطلاعات شخصی ذخیره‌شده در مرورگر (نام، آدرس و وضعیت پرداخت) با خروج پاک می‌شود.
   - اگر ظاهر «خارج» است ولی کوکیِ باقی‌مانده از خروج‌های قدیمی هست، یک‌بار در هر نشست مرورگر پاک می‌شود. */
(function () {
  if (window.__plAuthSession) return;
  window.__plAuthSession = true;

  var PRIVATE_LOCAL = ["user", "token", "authToken"];
  var PRIVATE_SESSION = ["pl_checkout", "pl_profile_gate_checked"];

  function wipeLocal() {
    PRIVATE_LOCAL.forEach(function (key) { try { localStorage.removeItem(key); } catch (e) {} });
    PRIVATE_SESSION.forEach(function (key) { try { sessionStorage.removeItem(key); } catch (e) {} });
  }
  function serverLogout() {
    try {
      return fetch("/api/auth/logout", {
        method: "POST", credentials: "include", keepalive: true, cache: "no-store",
        headers: { "Content-Type": "application/json" }, body: "{}",
      }).catch(function () {});
    } catch (e) { return Promise.resolve(); }
  }

  // ۱) هر دکمهٔ خروج (فاز capture تا قبل از کد خود صفحه اجرا شود)
  document.addEventListener("click", function (event) {
    var target = event.target && event.target.closest ? event.target.closest("#logoutBtn, #headerLogoutBtn, [data-logout]") : null;
    if (!target) return;
    serverLogout();
    wipeLocal();
    try { sessionStorage.setItem("pl_session_synced", "1"); } catch (e) {}
  }, true);

  // ۲) خروج در تب دیگر: این تب هم از حساب خارج دیده شود
  window.addEventListener("storage", function (event) {
    if (event.key === "user" && !event.newValue && document.body.classList.contains("logged-in")) location.reload();
  });

  // ۳) کوکیِ مانده بدون ظاهرِ واردشده (مثلاً از خروج‌های قدیمیِ ناقص): یک‌بار در هر نشست مرورگر پاک شود
  try {
    if (!localStorage.getItem("user") && !sessionStorage.getItem("pl_session_synced")) {
      sessionStorage.setItem("pl_session_synced", "1");
      serverLogout();
      PRIVATE_SESSION.forEach(function (key) { try { sessionStorage.removeItem(key); } catch (e) {} });
    }
  } catch (e) {}
})();
