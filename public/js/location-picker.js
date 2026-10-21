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
    ".plloc-status button{border:0;background:none;padding:0;font:inherit;font-weight:700;color:#b91c1c;cursor:pointer;text-decoration:underline}";
  var style = document.createElement("style");
  style.textContent = css;
  document.head.appendChild(style);

  var fa = function (n) { return String(n).replace(/\d/g, function (d) { return "۰۱۲۳۴۵۶۷۸۹"[d]; }); };
  var mapUrl = function (l) { return "https://www.openstreetmap.org/?mlat=" + l.lat + "&mlon=" + l.lng + "#map=17/" + l.lat + "/" + l.lng; };
  var valid = function (l) { return l && isFinite(Number(l.lat)) && isFinite(Number(l.lng)); };

  function mount(container) {
    container.innerHTML =
      '<div class="plloc"><div class="plloc-text"><strong>موقعیت روی نقشه (GPS) <small>— اختیاری</small></strong>' +
      "<p>با ثبت موقعیت، پیک آدرس شما را دقیق‌تر پیدا می‌کند. فقط با اجازهٔ شما گرفته می‌شود و همراه همین آدرس ذخیره می‌شود؛ می‌توانید هر زمان حذفش کنید.</p></div>" +
      '<button type="button" class="plloc-btn"><i class="ti ti-current-location"></i><span>ثبت موقعیت فعلی من</span></button>' +
      '<div class="plloc-status" hidden></div></div>';
    var btn = container.querySelector(".plloc-btn");
    var label = btn.querySelector("span");
    var status = container.querySelector(".plloc-status");
    var loc = null;

    function render(error) {
      status.className = "plloc-status" + (error ? " error" : "");
      if (error) { status.textContent = error; status.hidden = false; }
      else if (loc) {
        status.innerHTML = "✓ موقعیت ثبت شد" + (loc.accuracy ? " (دقت حدود " + fa(loc.accuracy) + " متر)" : "") +
          ' · <a href="' + mapUrl(loc) + '" target="_blank" rel="noopener">مشاهده روی نقشه</a> · <button type="button" data-plloc-clear>حذف</button>';
        status.hidden = false;
      } else { status.hidden = true; status.textContent = ""; }
      label.textContent = loc ? "به‌روزرسانی موقعیت" : "ثبت موقعیت فعلی من";
    }
    status.addEventListener("click", function (event) {
      if (event.target.closest("[data-plloc-clear]")) { loc = null; render(); }
    });
    btn.addEventListener("click", function () {
      if (!navigator.geolocation) return render("مرورگر شما از موقعیت‌یابی پشتیبانی نمی‌کند.");
      btn.disabled = true;
      label.textContent = "در حال دریافت موقعیت...";
      navigator.geolocation.getCurrentPosition(
        function (position) {
          btn.disabled = false;
          loc = {
            lat: Math.round(position.coords.latitude * 1e6) / 1e6,
            lng: Math.round(position.coords.longitude * 1e6) / 1e6,
            accuracy: Math.round(position.coords.accuracy || 0),
          };
          render();
        },
        function (error) {
          btn.disabled = false;
          var text = error && error.code === 1
            ? "اجازهٔ دسترسی به موقعیت داده نشد. می‌توانید بدون آن ادامه دهید یا اجازه را در تنظیمات مرورگر فعال کنید."
            : error && error.code === 3
              ? "دریافت موقعیت طول کشید. دوباره تلاش کنید یا بدون آن ادامه دهید."
              : "موقعیت شما در دسترس نیست. می‌توانید بدون آن ادامه دهید.";
          render(text);
        },
        { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 },
      );
    });
    render();
    return {
      get: function () { return loc ? { lat: loc.lat, lng: loc.lng, accuracy: loc.accuracy } : null; },
      set: function (value) { loc = valid(value) ? { lat: Number(value.lat), lng: Number(value.lng), accuracy: Number(value.accuracy) || 0 } : null; render(); },
    };
  }
  window.PLLocation = { mount: mount, mapUrl: mapUrl };
})();
