/* پنجرهٔ ورود | ثبت‌نام (مشترک همهٔ صفحه‌ها)
   - با کلیک بیرون از پنجره بسته نمی‌شود؛ فقط با دکمهٔ ✕ (یا Esc).
   - شمارهٔ موبایل ← کد تأیید ← (در صورت نیاز) تکمیل اطلاعات. کاربری که رمز دارد می‌تواند با رمز هم وارد شود.
   - بعد از ورود، کاربرِ ناقص یک مرحلهٔ مشخص می‌بیند (نه کادری که بپرد و صفحه‌ای که ناگهان عوض شود). */
(function () {
  if (window.__plAuthModal) return;
  if (location.pathname === "/login") return; // صفحهٔ مستقل ورود، منطق خودش را دارد
  window.__plAuthModal = true;

  var MOBILE_RE = /^09\d{9}$/;
  var OTP_SECONDS = 120;
  var state = { identifier: "", info: null, mode: "login", timer: null, lastFocus: null, busy: false, resetCode: "" };
  var root, card, body;

  /* ───────── استایل ───────── */
  function injectStyle() {
    if (document.getElementById("plAuthStyle")) return;
    var css = [
      "#loginModal{display:none!important}",
      "#plAuth{position:fixed;inset:0;z-index:5000;display:none;align-items:center;justify-content:center;padding:16px;background:rgba(15,23,42,.55);-webkit-backdrop-filter:blur(3px);backdrop-filter:blur(3px);direction:rtl;font-family:Vazirmatn,Tahoma,sans-serif}",
      "#plAuth.open{display:flex;animation:plAuthFade .18s ease-out}",
      "@keyframes plAuthFade{from{opacity:0}to{opacity:1}}",
      "@keyframes plAuthPop{from{opacity:0;transform:translateY(14px) scale(.98)}to{opacity:1;transform:none}}",
      "@keyframes plAuthShake{0%,100%{transform:none}25%{transform:translateX(-6px)}75%{transform:translateX(6px)}}",
      "@keyframes plAuthTick{from{stroke-dashoffset:30}to{stroke-dashoffset:0}}",
      ".pla-card{position:relative;width:100%;max-width:410px;max-height:calc(100dvh - 32px);overflow:auto;background:#fff;border-radius:26px;box-shadow:0 30px 80px rgba(15,23,42,.35);padding:30px 26px 24px;animation:plAuthPop .22s cubic-bezier(.2,.8,.2,1)}",
      ".pla-close{position:absolute;top:14px;left:14px;width:38px;height:38px;border:0;border-radius:50%;background:#f1f5f9;color:#475569;cursor:pointer;display:grid;place-items:center;transition:background .15s,color .15s,transform .15s}",
      ".pla-close:hover{background:#e2e8f0;color:#0f172a}.pla-close:active{transform:scale(.92)}.pla-close svg{width:18px;height:18px}",
      ".pla-close:focus-visible,.pla-btn:focus-visible,.pla-link:focus-visible,.pla-field input:focus-visible{outline:3px solid rgba(37,99,235,.35);outline-offset:2px}",
      ".pla-logo{display:flex;justify-content:center;margin-bottom:14px}.pla-logo img{width:52px;height:52px;object-fit:contain}",
      ".pla-title{margin:0 0 6px;text-align:center;font-size:21px;font-weight:800;color:#0f172a;line-height:1.5}",
      ".pla-sub{margin:0 0 22px;text-align:center;font-size:13.5px;line-height:1.9;color:#64748b}",
      ".pla-sub b{color:#0f172a;direction:ltr;unicode-bidi:embed}",
      ".pla-field{margin-bottom:6px}.pla-field label{display:block;margin-bottom:7px;font-size:12.5px;font-weight:700;color:#334155}",
      ".pla-field input{width:100%;height:54px;padding:0 16px;border:1.5px solid transparent;border-radius:15px;background:#f1f5f9;color:#0f172a;font:600 17px Vazirmatn,Tahoma,sans-serif;text-align:center;direction:ltr;outline:none;transition:border-color .15s,background .15s,box-shadow .15s}",
      ".pla-field input::placeholder{color:#a3adbd;font-weight:500}",
      ".pla-field input:focus{background:#fff;border-color:#2563eb;box-shadow:0 0 0 4px rgba(37,99,235,.12)}",
      ".pla-field input.err{border-color:#ef4444;background:#fff5f5;animation:plAuthShake .3s}",
      ".pla-otp input{font-size:26px;letter-spacing:12px;padding-inline-start:12px}",
      ".pla-pw{position:relative}.pla-pw input{padding-inline:48px}.pla-pw button{position:absolute;top:50%;right:10px;transform:translateY(-50%);width:34px;height:34px;border:0;background:transparent;color:#64748b;cursor:pointer;border-radius:50%;display:grid;place-items:center}.pla-pw svg{width:20px;height:20px}",
      ".pla-err{min-height:22px;margin:4px 2px 10px;font-size:12.5px;color:#dc2626;text-align:center;line-height:1.7}",
      ".pla-btn{display:flex;align-items:center;justify-content:center;gap:8px;width:100%;height:54px;border:0;border-radius:15px;background:linear-gradient(180deg,#3b82f6,#2563eb);color:#fff;font:800 15.5px Vazirmatn,Tahoma,sans-serif;cursor:pointer;box-shadow:0 8px 20px rgba(37,99,235,.28);transition:transform .15s,box-shadow .15s,opacity .15s}",
      ".pla-btn:hover{box-shadow:0 10px 24px rgba(37,99,235,.36)}.pla-btn:active{transform:scale(.985)}.pla-btn[disabled]{opacity:.65;cursor:default;box-shadow:none}",
      ".pla-btn.ghost{background:#f1f5f9;color:#334155;box-shadow:none;margin-top:10px}.pla-btn.ghost:hover{background:#e2e8f0}",
      ".pla-spin{width:18px;height:18px;border:2.5px solid rgba(255,255,255,.4);border-top-color:#fff;border-radius:50%;animation:plAuthSpin .7s linear infinite}@keyframes plAuthSpin{to{transform:rotate(360deg)}}",
      ".pla-links{display:flex;flex-direction:column;align-items:center;gap:6px;margin-top:14px}",
      ".pla-link{border:0;background:transparent;color:#2563eb;font:700 13px Vazirmatn,Tahoma,sans-serif;cursor:pointer;padding:6px 10px;border-radius:10px}.pla-link:hover{background:#eff6ff}.pla-link[disabled]{color:#94a3b8;cursor:default;background:transparent}",
      ".pla-muted{color:#64748b;font-size:12.5px}",
      ".pla-terms{margin:16px 0 0;text-align:center;font-size:11.5px;line-height:1.9;color:#94a3b8}.pla-terms a{color:#2563eb;font-weight:700;text-decoration:none}",
      ".pla-ok{width:76px;height:76px;margin:6px auto 16px;border-radius:50%;background:#ecfdf5;display:grid;place-items:center}.pla-ok svg{width:40px;height:40px;stroke:#16a34a;stroke-width:3;fill:none;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:30;animation:plAuthTick .5s .1s ease-out both}",
      ".pla-step{animation:plAuthPop .2s ease-out}",
      "@media(max-width:600px){#plAuth{align-items:flex-end;padding:0}.pla-card{max-width:none;border-radius:26px 26px 0 0;padding:28px 20px calc(22px + env(safe-area-inset-bottom));max-height:92dvh}}",
      "@media(prefers-reduced-motion:reduce){#plAuth.open,.pla-card,.pla-step,.pla-field input.err,.pla-ok svg{animation:none}.pla-ok svg{stroke-dashoffset:0}}",
    ].join("\n");
    var style = document.createElement("style");
    style.id = "plAuthStyle";
    style.textContent = css;
    document.head.appendChild(style);
  }

  var ICON_X = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';
  var ICON_EYE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>';
  var ICON_CHECK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';

  /* ───────── ابزار ───────── */
  function esc(v) { return String(v == null ? "" : v).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function toLatin(v) {
    return String(v || "").replace(/[۰-۹]/g, function (d) { return "۰۱۲۳۴۵۶۷۸۹".indexOf(d); }).replace(/[٠-٩]/g, function (d) { return "٠١٢٣٤٥٦٧٨٩".indexOf(d); });
  }
  function normalizeId(raw) {
    var v = toLatin(raw).trim().replace(/[\s-]/g, "");
    if (/^\+989\d{9}$/.test(v)) return "0" + v.slice(3);
    if (/^00989\d{9}$/.test(v)) return "0" + v.slice(4);
    if (/^989\d{9}$/.test(v)) return "0" + v.slice(2);
    return v.toLowerCase();
  }
  function $(sel) { return card.querySelector(sel); }
  function api(url, data) {
    return fetch(url, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data || {}) })
      .then(function (res) { return res.json().catch(function () { return {}; }).then(function (json) { if (!res.ok || !json.success) { var e = new Error(json.message || "خطا در ارتباط با سرور"); e.status = res.status; throw e; } return json; }); });
  }
  function setBusy(btn, busy, label) {
    state.busy = busy;
    if (!btn) return;
    btn.disabled = busy;
    if (busy) { btn.setAttribute("data-label", btn.innerHTML); btn.innerHTML = '<span class="pla-spin"></span>'; }
    else if (btn.hasAttribute("data-label")) { btn.innerHTML = btn.getAttribute("data-label"); btn.removeAttribute("data-label"); }
    if (label && !busy) btn.innerHTML = label;
  }
  function showError(msg, input) {
    var el = $(".pla-err");
    if (el) el.textContent = msg || "";
    if (input) { input.classList.remove("err"); void input.offsetWidth; if (msg) input.classList.add("err"); }
  }

  /* ───────── ساخت پنجره ───────── */
  function build() {
    if (root) return;
    injectStyle();
    root = document.createElement("div");
    root.id = "plAuth";
    root.innerHTML = '<div class="pla-card" role="dialog" aria-modal="true" aria-labelledby="plaTitle" tabindex="-1"><button type="button" class="pla-close" aria-label="بستن">' + ICON_X + '</button><div class="pla-logo"><img src="/images/brand/logo-mark-192.png" alt="" width="52" height="52"></div><div id="plaBody"></div></div>';
    document.body.appendChild(root);
    card = root.querySelector(".pla-card");
    body = root.querySelector("#plaBody");
    card.querySelector(".pla-close").addEventListener("click", close);
    // عمداً با کلیک روی پس‌زمینه بسته نمی‌شود.
    document.addEventListener("keydown", function (e) {
      if (!root.classList.contains("open")) return;
      if (e.key === "Escape") { e.preventDefault(); close(); return; }
      if (e.key === "Tab") trapFocus(e);
    });
  }
  function trapFocus(e) {
    var items = Array.prototype.slice.call(card.querySelectorAll('button:not([disabled]),input,a[href]')).filter(function (el) { return el.offsetParent !== null; });
    if (!items.length) return;
    var first = items[0], last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
  function render(html, focusSel) {
    body.innerHTML = '<div class="pla-step">' + html + "</div>";
    if (focusSel) setTimeout(function () { var el = card.querySelector(focusSel); if (el) el.focus(); }, 60);
  }

  /* ───────── مرحله‌ها ───────── */
  function stepPhone(message) {
    clearInterval(state.timer);
    render(
      '<h2 class="pla-title" id="plaTitle">ورود | ثبت‌نام</h2>' +
      '<p class="pla-sub">شمارهٔ موبایل خود را وارد کنید تا کد تأیید برایتان پیامک شود.</p>' +
      '<div class="pla-field"><label for="plaId">شمارهٔ موبایل</label><input id="plaId" type="tel" inputmode="tel" autocomplete="tel" dir="ltr" placeholder="09123456789" maxlength="40"></div>' +
      '<div class="pla-err" role="alert">' + esc(message || "") + "</div>" +
      '<button type="button" class="pla-btn" id="plaGo">دریافت کد تأیید</button>' +
      '<p class="pla-terms">با ورود، <a href="/terms" target="_blank" rel="noopener">قوانین و مقررات</a> پیکسل لایف را می‌پذیرید.</p>',
      "#plaId"
    );
    var input = $("#plaId");
    if (state.identifier) input.value = state.identifier;
    input.addEventListener("input", function () { input.value = toLatin(input.value); showError("", input); });
    input.addEventListener("keydown", function (e) { if (e.key === "Enter") submitPhone(); });
    $("#plaGo").addEventListener("click", submitPhone);
  }

  function submitPhone() {
    if (state.busy) return;
    var input = $("#plaId"), btn = $("#plaGo");
    var id = normalizeId(input.value);
    var isMobile = MOBILE_RE.test(id), isEmail = /^\S+@\S+\.\S+$/.test(id);
    if (!id) return showError("شمارهٔ موبایل را وارد کنید", input);
    if (!isMobile && !isEmail) return showError("شمارهٔ موبایل معتبر نیست؛ مثلاً 09123456789", input);
    showError("");
    setBusy(btn, true);
    api("/api/auth/check-user", { identifier: id }).then(function (resp) {
      state.identifier = id;
      state.info = resp.data || {};
      if (isEmail) {
        setBusy(btn, false);
        if (state.info.exists && state.info.hasPassword) return stepPassword();
        return showError("ورود با ایمیل فعال نیست؛ با شمارهٔ موبایل وارد شوید", input);
      }
      state.mode = state.info.exists ? "login" : "register";
      return api("/api/auth/send-otp", { identifier: id, type: state.mode }).then(function () { setBusy(btn, false); stepOtp(); });
    }).catch(function (err) { setBusy(btn, false); showError(err.message, input); });
  }

  function stepOtp(kind) {
    var forgot = kind === "forgot";
    render(
      '<h2 class="pla-title" id="plaTitle">' + (forgot ? "بازیابی رمز عبور" : "کد تأیید را وارد کنید") + "</h2>" +
      '<p class="pla-sub">کد ۵ رقمی به <b>' + esc(state.identifier) + "</b> ارسال شد.</p>" +
      '<div class="pla-field pla-otp"><label for="plaCode" class="pla-muted">کد تأیید</label><input id="plaCode" type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="5" dir="ltr" placeholder="•••••"></div>' +
      '<div class="pla-err" role="alert"></div>' +
      '<button type="button" class="pla-btn" id="plaVerify">' + (forgot ? "ادامه" : "تأیید و ورود") + "</button>" +
      '<div class="pla-links"><span class="pla-muted" id="plaTimer"></span><button type="button" class="pla-link" id="plaResend" hidden>ارسال مجدد کد</button>' +
      (!forgot && state.info && state.info.hasPassword ? '<button type="button" class="pla-link" id="plaToPw">ورود با رمز عبور</button>' : "") +
      '<button type="button" class="pla-link" id="plaEdit">ویرایش شماره</button></div>',
      "#plaCode"
    );
    var input = $("#plaCode");
    input.addEventListener("input", function () {
      input.value = toLatin(input.value).replace(/\D/g, "").slice(0, 5);
      showError("", input);
      if (input.value.length === 5) (forgot ? verifyForgot : verifyOtp)();
    });
    input.addEventListener("keydown", function (e) { if (e.key === "Enter") (forgot ? verifyForgot : verifyOtp)(); });
    $("#plaVerify").addEventListener("click", forgot ? verifyForgot : verifyOtp);
    $("#plaEdit").addEventListener("click", function () { stepPhone(); });
    $("#plaResend").addEventListener("click", function () { resend(kind); });
    var toPw = $("#plaToPw"); if (toPw) toPw.addEventListener("click", stepPassword);
    startTimer(OTP_SECONDS);
  }

  function startTimer(sec) {
    clearInterval(state.timer);
    var label = $("#plaTimer"), resend = $("#plaResend");
    if (!label || !resend) return;
    resend.hidden = true; label.hidden = false;
    var left = sec;
    function tick() {
      if (!$("#plaTimer")) { clearInterval(state.timer); return; }
      var m = String(Math.floor(left / 60)).padStart(2, "0"), s = String(left % 60).padStart(2, "0");
      label.textContent = "ارسال مجدد تا " + m + ":" + s;
      if (left <= 0) { clearInterval(state.timer); label.hidden = true; resend.hidden = false; }
      left--;
    }
    tick();
    state.timer = setInterval(tick, 1000);
  }

  function resend(kind) {
    var btn = $("#plaResend");
    if (state.busy) return;
    setBusy(btn, true);
    var call = kind === "forgot" ? api("/api/auth/forgot-password", { identifier: state.identifier }) : api("/api/auth/resend-otp", { identifier: state.identifier, type: state.mode });
    call.then(function () { setBusy(btn, false); startTimer(OTP_SECONDS); showError(""); var i = $("#plaCode"); if (i) { i.value = ""; i.focus(); } })
      .catch(function (err) { setBusy(btn, false); showError(err.message); });
  }

  function verifyOtp() {
    if (state.busy) return;
    var input = $("#plaCode"), btn = $("#plaVerify");
    var code = toLatin(input.value).trim();
    if (!/^\d{5}$/.test(code)) return showError("کد باید ۵ رقم باشد", input);
    setBusy(btn, true);
    api("/api/auth/verify-login-otp", { identifier: state.identifier, code: code })
      .then(function (resp) { clearInterval(state.timer); setBusy(btn, false); onLoggedIn(resp.user, resp.token, resp.needsProfile); })
      .catch(function (err) { setBusy(btn, false); input.value = ""; showError(err.message, input); input.focus(); });
  }

  function stepPassword() {
    clearInterval(state.timer);
    render(
      '<h2 class="pla-title" id="plaTitle">ورود با رمز عبور</h2>' +
      '<p class="pla-sub">رمز عبور حساب <b>' + esc(state.identifier) + "</b> را وارد کنید.</p>" +
      '<div class="pla-field"><label for="plaPw">رمز عبور</label><div class="pla-pw"><input id="plaPw" type="password" autocomplete="current-password" dir="ltr" placeholder="••••••••"><button type="button" id="plaEye" aria-label="نمایش رمز">' + ICON_EYE + "</button></div></div>" +
      '<div class="pla-err" role="alert"></div>' +
      '<button type="button" class="pla-btn" id="plaLogin">ورود</button>' +
      '<div class="pla-links"><button type="button" class="pla-link" id="plaForgot">فراموشی رمز عبور</button>' +
      (/^09/.test(state.identifier) ? '<button type="button" class="pla-link" id="plaViaOtp">ورود با کد تأیید</button>' : "") +
      '<button type="button" class="pla-link" id="plaEdit">ویرایش شماره</button></div>',
      "#plaPw"
    );
    var input = $("#plaPw");
    input.addEventListener("input", function () { showError("", input); });
    input.addEventListener("keydown", function (e) { if (e.key === "Enter") passwordLogin(); });
    $("#plaLogin").addEventListener("click", passwordLogin);
    $("#plaEye").addEventListener("click", function () { input.type = input.type === "password" ? "text" : "password"; });
    $("#plaEdit").addEventListener("click", function () { stepPhone(); });
    $("#plaForgot").addEventListener("click", startForgot);
    var via = $("#plaViaOtp");
    if (via) via.addEventListener("click", function () {
      if (state.busy) return;
      setBusy(via, true);
      api("/api/auth/send-otp", { identifier: state.identifier, type: "login" }).then(function () { setBusy(via, false); stepOtp(); }).catch(function (err) { setBusy(via, false); showError(err.message); });
    });
  }

  function passwordLogin() {
    if (state.busy) return;
    var input = $("#plaPw"), btn = $("#plaLogin");
    if (!input.value) return showError("رمز عبور را وارد کنید", input);
    setBusy(btn, true);
    api("/api/auth/login", { identifier: state.identifier, password: input.value })
      .then(function (resp) { setBusy(btn, false); onLoggedIn(resp.user, resp.token, resp.needsProfile); })
      .catch(function (err) { setBusy(btn, false); showError(err.message, input); });
  }

  function startForgot() {
    if (state.busy) return;
    var link = $("#plaForgot");
    setBusy(link, true);
    api("/api/auth/forgot-password", { identifier: state.identifier })
      .then(function () { setBusy(link, false); stepOtp("forgot"); })
      .catch(function (err) { setBusy(link, false); showError(err.message); });
  }

  function verifyForgot() {
    if (state.busy) return;
    var input = $("#plaCode"), btn = $("#plaVerify");
    var code = toLatin(input.value).trim();
    if (!/^\d{5}$/.test(code)) return showError("کد باید ۵ رقم باشد", input);
    setBusy(btn, true);
    api("/api/auth/verify-forgot-otp", { identifier: state.identifier, code: code })
      .then(function () { clearInterval(state.timer); setBusy(btn, false); state.resetCode = code; stepNewPassword(); })
      .catch(function (err) { setBusy(btn, false); input.value = ""; showError(err.message, input); input.focus(); });
  }

  function stepNewPassword() {
    render(
      '<h2 class="pla-title" id="plaTitle">رمز عبور جدید</h2>' +
      '<p class="pla-sub">یک رمز عبور تازه برای حساب خود تعیین کنید.</p>' +
      '<div class="pla-field"><label for="plaNew">رمز عبور جدید</label><div class="pla-pw"><input id="plaNew" type="password" autocomplete="new-password" dir="ltr" placeholder="حداقل ۶ نویسه"><button type="button" id="plaEye" aria-label="نمایش رمز">' + ICON_EYE + "</button></div></div>" +
      '<div class="pla-err" role="alert"></div>' +
      '<button type="button" class="pla-btn" id="plaSave">ثبت و ورود</button>',
      "#plaNew"
    );
    var input = $("#plaNew");
    input.addEventListener("input", function () { showError("", input); });
    input.addEventListener("keydown", function (e) { if (e.key === "Enter") saveNewPassword(); });
    $("#plaEye").addEventListener("click", function () { input.type = input.type === "password" ? "text" : "password"; });
    $("#plaSave").addEventListener("click", saveNewPassword);
  }

  function saveNewPassword() {
    if (state.busy) return;
    var input = $("#plaNew"), btn = $("#plaSave");
    if (input.value.length < 6) return showError("رمز عبور باید دست‌کم ۶ نویسه باشد", input);
    setBusy(btn, true);
    api("/api/auth/reset-password", { identifier: state.identifier, code: state.resetCode, password: input.value })
      .then(function (resp) {
        return fetch("/api/auth/me", { credentials: "include", cache: "no-store" }).then(function (r) { return r.json(); }).then(function (me) {
          setBusy(btn, false);
          onLoggedIn(me.user, resp.token, me.user && me.user.profileComplete === false);
        });
      })
      .catch(function (err) { setBusy(btn, false); showError(err.message, input); });
  }

  /* ───────── بعد از ورود ───────── */
  function displayName(user) {
    var full = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
    return full || user.mobile || user.email || "کاربر";
  }
  function applyLoginState(user, token) {
    if (!user) return;
    try { if (token) localStorage.setItem("authToken", token); localStorage.setItem("user", JSON.stringify(user)); } catch (e) {}
    try { sessionStorage.removeItem("pl_session_synced"); } catch (e) {}
    if (typeof window.applyLogin === "function") { try { window.applyLogin(user, token); } catch (e) {} }
    document.body.classList.add("logged-in");
    if (typeof window.plRefreshHeaderUser === "function") { try { window.plRefreshHeaderUser(); } catch (e) {} }
    ["profileName", "pdropName"].forEach(function (id) { var el = document.getElementById(id); if (el) el.textContent = displayName(user); });
    window.dispatchEvent(new Event("cartUpdated"));
  }
  function afterLogin() {
    // صفحه‌هایی که با ورود باید دوباره بارگذاری شوند (مثل پرداخت: سبد/آدرس از سرور خوانده می‌شود)
    if (location.pathname.indexOf("/checkout") === 0 || location.pathname.indexOf("/profile") === 0) location.reload();
  }
  function onLoggedIn(user, token, needsProfile) {
    applyLoginState(user, token);
    var incomplete = needsProfile === true || (user && user.profileComplete === false);
    var name = user ? displayName(user) : "";
    if (!incomplete) {
      render('<div class="pla-ok">' + ICON_CHECK + '</div><h2 class="pla-title" id="plaTitle">خوش آمدید!</h2><p class="pla-sub">' + esc(name) + " عزیز، ورود شما با موفقیت انجام شد.</p>");
      setTimeout(function () { close(); afterLogin(); }, 1100);
      return;
    }
    // کاربر جدید یا ناقص: یک مرحلهٔ مشخص و ماندگار، بدون بسته‌شدن ناگهانی یا جابه‌جایی خودکار صفحه
    var next = encodeURIComponent(location.pathname + location.search);
    render(
      '<div class="pla-ok">' + ICON_CHECK + '</div><h2 class="pla-title" id="plaTitle">ورود موفق بود</h2>' +
      '<p class="pla-sub">برای ثبت سفارش، نام و آدرس خود را کامل کنید. این کار فقط یک‌بار لازم است.</p>' +
      '<a class="pla-btn" href="/profile?complete=1&next=' + next + '" style="text-decoration:none">تکمیل اطلاعات حساب</a>' +
      '<button type="button" class="pla-btn ghost" id="plaLater">بعداً، ادامهٔ مشاهدهٔ سایت</button>'
    );
    $("#plaLater").addEventListener("click", function () { close(); afterLogin(); });
  }

  /* ───────── باز و بسته ───────── */
  function open() {
    build();
    if (root.classList.contains("open")) return;
    state.lastFocus = document.activeElement;
    state.identifier = ""; state.info = null;
    stepPhone();
    root.classList.add("open");
    document.documentElement.style.overflow = "hidden";
  }
  function close() {
    if (!root) return;
    clearInterval(state.timer);
    root.classList.remove("open");
    document.documentElement.style.overflow = "";
    if (state.lastFocus && state.lastFocus.focus) { try { state.lastFocus.focus(); } catch (e) {} }
  }
  window.openLoginModal = open;
  window.closeLoginModal = close;

  // کلیدهایی که با addEventListener به تابع قدیمیِ هر صفحه وصل شده‌اند هم به همین پنجره بروند
  document.addEventListener("click", function (event) {
    var trigger = event.target.closest && event.target.closest('#authPillBtn, [onclick*="openLoginModal"], [data-open-login]');
    if (!trigger) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    open();
  }, true);

  injectStyle();
  if (new URLSearchParams(location.search).get("openLogin") === "1") {
    var go = function () { if (!document.body.classList.contains("logged-in")) open(); };
    document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", go) : go();
  }
})();
