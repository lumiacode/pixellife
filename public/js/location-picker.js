/* ثبت اختیاری موقعیت GPS برای آدرس: فقط با اجازهٔ کاربر، بدون نقشهٔ خارجی (فقط لینک «مشاهده روی نقشه»). */
(function () {
  if (window.PLLocation) return;
  var css =
    ".plloc{display:flex;flex-direction:column;gap:10px;padding:14px 16px;border:1.5px dashed #cbd5e1;border-radius:12px;background:#f8fafc;margin:2px 0 6px}" +
    ".plloc-text strong{display:block;font-size:13.5px;font-weight:800;color:#1e293b}" +
    ".plloc-text small{font-weight:500;color:#94a3b8}" +
    ".plloc-text p{margin:4px 0 0;font-size:12.5px;line-height:1.9;color:#64748b}" +
    ".plloc-btn{align-self:flex-start;display:inline-flex;align-items:center;gap:6px;height:38px;padding:0 14px;border:1.5px solid #bfdbfe;border-radius:10px;background:#eff6ff;color:#1d4ed8;font-family:inherit;font-size:13px;font-weight:700;cursor:pointer}" +
    ".plloc-btn:disabled{opacity:.6;cursor:default}" +
    ".plloc-status{font-size:12.5px;line-height:1.9;color:#166534}" +
    ".plloc-status.error{color:#b91c1c}" +
    ".plloc-status a{color:#1d4ed8;font-weight:700;text-decoration:underline}" +
    ".plloc-status button{border:0;background:none;padding:0;font:inherit;font-weight:700;color:#b91c1c;cursor:pointer;text-decoration:underline}" +
    ".plloc-help{color:#7a2e0e;background:#fff7ed;border:1px solid #fed7aa;border-radius:10px;padding:10px 12px}" +
    ".plloc-help strong{display:block;margin-bottom:4px;font-size:13px}" +
    ".plloc-help ol{margin:6px 18px 8px 0;padding:0}" +
    ".plloc-help li{margin-bottom:2px}" +
    ".plloc-help .plloc-retry{display:inline-flex;align-items:center;gap:5px;height:34px;padding:0 12px;border:1.5px solid #fdba74;border-radius:9px;background:#fff;color:#c2410c;font-weight:700;text-decoration:none}" +
    ".plloc-note{font-size:12px;color:#92400e;background:#fffbeb;border-radius:8px;padding:6px 10px;margin-top:4px}";
  var style = document.createElement("style");
  style.textContent = css;
  document.head.appendChild(style);

  var fa = function (n) { return String(n).replace(/\d/g, function (d) { return "۰۱۲۳۴۵۶۷۸۹"[d]; }); };
  var mapUrl = function (l) { return "https://www.openstreetmap.org/?mlat=" + l.lat + "&mlon=" + l.lng + "#map=17/" + l.lat + "/" + l.lng; };
  var valid = function (l) { return l && isFinite(Number(l.lat)) && isFinite(Number(l.lng)); };

  function mount(container) {
    container.innerHTML =
      '<div class="plloc"><div class="plloc-text"><strong>موقعیت روی نقشه (GPS) <small>— اختیاری</small></strong>' +
      "<p>با ثبت موقعیت، پیک آدرس شما را دقیق‌تر پیدا می‌کند. فقط با اجازهٔ شما گرفته می‌شود و همراه همین آدرس ذخیره می‌شود؛ می‌توانید هر زمان حذفش کنید. برای ثبت، <b>GPS (موقعیت) گوشی باید روشن باشد</b>.</p></div>" +
      '<button type="button" class="plloc-btn"><i class="ti ti-current-location"></i><span>ثبت موقعیت فعلی من</span></button>' +
      '<div class="plloc-status" hidden></div></div>';
    var btn = container.querySelector(".plloc-btn");
    var label = btn.querySelector("span");
    var status = container.querySelector(".plloc-status");
    var loc = null;

    var isIos = /iphone|ipad|ipod/i.test(navigator.userAgent || "");
    // راهنمای روشن‌کردن GPS گوشی یا اجازهٔ مرورگر؛ مرورگر نمی‌تواند GPS را خودش روشن کند، پس مرحله‌به‌مرحله راهنمایی می‌کنیم.
    function helpHtml(kind) {
      var steps = isIos
        ? "<li>برنامهٔ «تنظیمات» ← «حریم خصوصی و امنیت» ← «خدمات مکانی» را روشن کنید.</li><li>در همان صفحه برای مرورگر (Safari یا Chrome) گزینهٔ «هنگام استفاده از برنامه» را بزنید.</li><li>به همین صفحه برگردید و «تلاش دوباره» را بزنید.</li>"
        : "<li>نوار اعلان گوشی را پایین بکشید و آیکن «موقعیت مکانی / Location» را روشن کنید.</li><li>اگر مرورگر اجازه نخواست: روی قفل کنار آدرس سایت بزنید ← «مجوزها» ← «موقعیت» را روی «اجازه» بگذارید.</li><li>به همین صفحه برگردید و «تلاش دوباره» را بزنید.</li>";
      var title = kind === "timeout" ? "دریافت موقعیت طول کشید" : kind === "insecure" ? "موقعیت‌یابی فقط روی اتصال امن (https) کار می‌کند" : "موقعیت (GPS) گوشی شما خاموش است یا دسترسی داده نشده";
      return '<div class="plloc-help"><strong>' + title + "</strong>" + (kind === "insecure" ? "" : "<ol>" + steps + "</ol>") +
        '<a href="#" class="plloc-retry" data-plloc-retry><i class="ti ti-current-location"></i> تلاش دوباره</a></div>';
    }
    function render(error, helpKind) {
      status.className = "plloc-status" + (error || helpKind ? " error" : "");
      if (helpKind) { status.innerHTML = helpHtml(helpKind); status.hidden = false; }
      else if (error) { status.textContent = error; status.hidden = false; }
      else if (loc) {
        status.innerHTML = "✓ موقعیت ثبت شد" + (loc.accuracy ? " (دقت حدود " + fa(loc.accuracy) + " متر)" : "") +
          ' · <a href="' + mapUrl(loc) + '" target="_blank" rel="noopener">مشاهده روی نقشه</a> · <button type="button" data-plloc-clear>حذف</button>' +
          (loc.accuracy > 500 ? '<div class="plloc-note">دقت موقعیت پایین است. برای دقت بیشتر GPS گوشی را روشن کنید و دوباره «به‌روزرسانی موقعیت» را بزنید.</div>' : "");
        status.hidden = false;
      } else { status.hidden = true; status.textContent = ""; }
      label.textContent = loc ? "به‌روزرسانی موقعیت" : "ثبت موقعیت فعلی من";
    }
    status.addEventListener("click", function (event) {
      if (event.target.closest("[data-plloc-clear]")) { loc = null; render(); }
      if (event.target.closest("[data-plloc-retry]")) { event.preventDefault(); locate(); }
    });
    btn.addEventListener("click", locate);
    function locate() {
      if (!navigator.geolocation) return render("مرورگر شما از موقعیت‌یابی پشتیبانی نمی‌کند.");
      if (window.isSecureContext === false) return render("", "insecure");
      btn.disabled = true;
      label.textContent = "در حال دریافت موقعیت...";
      // موقعیتِ قدیمیِ کش‌شده توسط مرورگر/گوشی (مثلاً آخرین نقطهٔ همین دستگاه) پذیرفته نمی‌شود؛ فقط نقطهٔ تازه.
      // تا ۱۲ ثانیه تازه‌ترین و دقیق‌ترین نقطه نگه داشته می‌شود و با دقت کافی (≤ ۶۰ متر) زودتر تمام می‌شود.
      var started = Date.now(), best = null, done = false, watchId = null, timer = null;
      function stop() {
        done = true;
        if (watchId !== null) navigator.geolocation.clearWatch(watchId);
        clearTimeout(timer);
        btn.disabled = false;
      }
      function finish() {
        if (done) return;
        stop();
        if (!best) { label.textContent = loc ? "به‌روزرسانی موقعیت" : "ثبت موقعیت فعلی من"; return render("", "timeout"); }
        loc = {
          lat: Math.round(best.coords.latitude * 1e6) / 1e6,
          lng: Math.round(best.coords.longitude * 1e6) / 1e6,
          accuracy: Math.round(best.coords.accuracy || 0),
        };
        render();
      }
      watchId = navigator.geolocation.watchPosition(
        function (position) {
          if (done) return;
          if (position.timestamp && position.timestamp < started - 10000) return; // قدیمی
          if (!best || (position.coords.accuracy || 1e9) < (best.coords.accuracy || 1e9)) best = position;
          if ((best.coords.accuracy || 1e9) <= 60) finish();
        },
        function (error) {
          if (done) return;
          stop();
          label.textContent = loc ? "به‌روزرسانی موقعیت" : "ثبت موقعیت فعلی من";
          // کد ۱ (اجازه/GPS خاموش) و ۲ (موقعیت در دسترس نیست): راهنمای روشن‌کردن GPS؛ کد ۳: زمان‌بر
          render("", error && error.code === 3 ? "timeout" : "off");
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
      );
      timer = setTimeout(finish, 12000);
    }
    render();
    return {
      get: function () { return loc ? { lat: loc.lat, lng: loc.lng, accuracy: loc.accuracy } : null; },
      set: function (value) { loc = valid(value) ? { lat: Number(value.lat), lng: Number(value.lng), accuracy: Number(value.accuracy) || 0 } : null; render(); },
    };
  }
  window.PLLocation = { mount: mount, mapUrl: mapUrl };
})();
