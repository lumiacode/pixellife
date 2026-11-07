/* اطلاعات شخصی و آدرس فقط با حروف فارسی: تایپ یا چسباندن حروف لاتین (A-Z, a-z) در این فیلدها ممکن نیست.
   ارقام (فارسی/انگلیسی) و علامت‌ها مجازند. رویدادها روی document هستند تا فیلدهای ساخته‌شده با JS (فرم آدرس پرداخت) هم پوشش داده شوند.
   سرور هم همین قاعده را دارد (src/utils/persianText.js)، پس دور زدن این اسکریپت فایده‌ای ندارد. */
(function () {
  var IDS = [
    "firstNameInput", "lastNameInput", "infoCity", "infoFullAddress",
    "addrProvince", "addrCity", "addrFull", "addrReceiverName",
    "adTitle", "adReceiver", "adProvince", "adCity", "adFull"
  ];
  var LATIN = /[A-Za-z]/;
  var LATIN_ALL = /[A-Za-z]/g;
  var MESSAGE = "فقط با حروف فارسی بنویسید؛ کیبورد را روی فارسی بگذارید.";
  var timers = new WeakMap();

  function isTarget(el) { return el && el.id && IDS.indexOf(el.id) !== -1 && (el.tagName === "INPUT" || el.tagName === "TEXTAREA"); }

  function injectStyle() {
    if (document.getElementById("pl-fa-hint-style")) return;
    var st = document.createElement("style");
    st.id = "pl-fa-hint-style";
    st.textContent = ".pl-fa-hint{margin:6px 0 0;padding:6px 10px;border-radius:8px;background:#fef2f2;border:1px solid #fecaca;color:#b91c1c;font-size:12.5px;font-weight:600;line-height:1.7}.pl-fa-hint[hidden]{display:none}";
    document.head.appendChild(st);
  }

  function hint(el) {
    injectStyle();
    var box = el.nextElementSibling && el.nextElementSibling.classList && el.nextElementSibling.classList.contains("pl-fa-hint") ? el.nextElementSibling : null;
    if (!box) {
      box = document.createElement("div");
      box.className = "pl-fa-hint";
      box.setAttribute("role", "alert");
      el.insertAdjacentElement("afterend", box);
    }
    box.textContent = MESSAGE;
    box.hidden = false;
    clearTimeout(timers.get(el));
    timers.set(el, setTimeout(function () { box.hidden = true; }, 2800));
  }

  // جلوگیری از تایپ مستقیم حرف لاتین
  document.addEventListener("beforeinput", function (e) {
    var el = e.target;
    if (!isTarget(el) || !e.data || !LATIN.test(e.data)) return;
    if (e.cancelable) e.preventDefault();
    hint(el);
  }, true);

  // پاک‌کردن حرف لاتین باقی‌مانده (چسباندن، کیبوردهای پیش‌بینی‌کننده/IME که beforeinput را قابل لغو نمی‌کنند)
  document.addEventListener("input", function (e) {
    var el = e.target;
    if (!isTarget(el) || !LATIN.test(el.value)) return;
    var pos = el.selectionStart;
    var before = el.value;
    var cleaned = before.replace(LATIN_ALL, "");
    var removedBeforeCaret = pos == null ? 0 : (before.slice(0, pos).match(LATIN_ALL) || []).length;
    el.value = cleaned;
    if (pos != null && el.setSelectionRange) { var np = Math.max(0, pos - removedBeforeCaret); try { el.setSelectionRange(np, np); } catch (_) {} }
    hint(el);
  }, true);
})();
