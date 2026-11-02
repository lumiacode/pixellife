/* قواعد تصمیم‌گیری ثبت موقعیت (بدون DOM)؛ جدا از ظاهر و دکمه تا بتوان آن‌ها را تست کرد.
   location-picker.js فقط از این قواعد استفاده می‌کند و tests/location-picker.test.js آن‌ها را قفل می‌کند.

   قواعد ثابت (با تغییر ظاهر یا صفحه‌ها نباید عوض شوند):
   1) هرگز بر اساس position.timestamp نقطه رد نکن: روی بعضی گوشی‌ها با ساعت مرورگر نمی‌خواند (یا گوشی ثابت است) و همهٔ نقطه‌ها رد می‌شدند.
      برای نقطهٔ کش‌شده فقط maximumAge: 0 کافی است.
   2) نقطه با دقت بدتر از MAX_ACCURACY_M (IP/VPN/شبکه) ثبت نمی‌شود.
   3) تا WAIT_MS دقیق‌ترین نقطه نگه داشته می‌شود و با دقت ≤ GOOD_ACCURACY_M زودتر تمام می‌شود.
   4) کامپیوتر ثبت موقعیت ندارد (GPS ندارد). */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.PLLocationPolicy = api;
})(typeof window !== "undefined" ? window : this, function () {
  var GOOD_ACCURACY_M = 60;
  var MAX_ACCURACY_M = 1500;
  var WAIT_MS = 20000;
  var GEO_OPTIONS = { enableHighAccuracy: true, timeout: 30000, maximumAge: 0 };

  var accuracyOf = function (position) { return (position && position.coords && position.coords.accuracy) || 1e9; };

  // nav: شیء navigator (برای تست قابل تعویض است)
  function isDesktopEnvironment(nav) {
    var ua = (nav && nav.userAgent) || "";
    var mobileUa = /android|iphone|ipad|ipod/i.test(ua);
    if (nav && nav.userAgentData && typeof nav.userAgentData.mobile === "boolean") return !nav.userAgentData.mobile && !mobileUa;
    return !/android|iphone|ipad|ipod|mobile/i.test(ua);
  }

  // جمع‌کنندهٔ نقطه‌ها: add() هر نقطه را می‌پذیرد و می‌گوید آیا می‌شود زودتر تمام کرد؛ result() نتیجهٔ نهایی را می‌دهد.
  function createFixCollector() {
    var best = null;
    return {
      add: function (position) {
        if (!position || !position.coords) return false;
        if (!best || accuracyOf(position) < accuracyOf(best)) best = position;
        return accuracyOf(best) <= GOOD_ACCURACY_M;
      },
      result: function () {
        if (!best) return { status: "timeout" };
        if (accuracyOf(best) > MAX_ACCURACY_M) return { status: "approx" };
        return {
          status: "ok",
          fix: {
            lat: Math.round(best.coords.latitude * 1e6) / 1e6,
            lng: Math.round(best.coords.longitude * 1e6) / 1e6,
            accuracy: Math.round(best.coords.accuracy || 0),
          },
        };
      },
    };
  }

  // کد خطای مرورگر ← نوع راهنما: ۳ زمان‌بر؛ بقیه (اجازه/GPS خاموش/در دسترس نبودن) راهنمای روشن‌کردن GPS
  function errorKind(error) { return error && error.code === 3 ? "timeout" : "off"; }

  return { GOOD_ACCURACY_M: GOOD_ACCURACY_M, MAX_ACCURACY_M: MAX_ACCURACY_M, WAIT_MS: WAIT_MS, GEO_OPTIONS: GEO_OPTIONS, isDesktopEnvironment: isDesktopEnvironment, createFixCollector: createFixCollector, errorKind: errorKind };
});
