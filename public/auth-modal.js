(function () {
  // جلوگیری از اجرای دوباره
  if (window.__sharedAuthModal) return;
  window.__sharedAuthModal = true;

  // ─── استایل ───
  const style = document.createElement("style");
  style.textContent = `
    #sharedAuthModal {
      position: fixed;
      inset: 0;
      z-index: 99999;
      display: none;
      align-items: center;
      justify-content: center;
      background: rgba(15, 23, 42, 0.45);
      backdrop-filter: blur(4px);
      padding: 20px;
    }
    #sharedAuthModal.open { display: flex; }

    #sharedAuthModal .shared-auth-box {
      width: 400px;
      max-width: 100%;
      background: #fff;
      border-radius: 20px;
      padding: 28px;
      box-shadow: 0 20px 60px rgba(15, 23, 42, 0.22);
      direction: rtl;
      font-family: inherit;
      box-sizing: border-box;
      position: relative;
    }

    #sharedAuthModal h2 {
      margin: 0 0 10px;
      color: #0f172a;
      font-size: 22px;
      font-weight: 800;
    }

    #sharedAuthModal p {
      color: #64748b;
      font-size: 14px;
      line-height: 1.8;
      margin: 0 0 22px;
    }

    #sharedAuthModal .shared-auth-close {
      position: absolute;
      top: 16px;
      left: 16px;
      border: 0;
      border-radius: 50%;
      width: 40px;
      height: 40px;
      background: #f8fafc;
      color: #64748b;
      font-size: 22px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      line-height: 1;
    }
    #sharedAuthModal .shared-auth-close:hover {
      background: #fee2e2;
      color: #dc2626;
    }

    #sharedAuthModal label {
      display: block;
      color: #334155;
      font-weight: 700;
      margin-bottom: 8px;
      font-size: 14px;
    }

    #sharedAuthModal input {
      box-sizing: border-box;
      width: 100%;
      padding: 14px;
      border: 1.5px solid #e2e8f0;
      border-radius: 10px;
      font-size: 15px;
      direction: ltr;
      text-align: center;
      outline: none;
      background: #f8fafc;
      transition: border-color 0.2s, box-shadow 0.2s;
    }
    #sharedAuthModal input:focus {
      border-color: #2563eb;
      background: #fff;
      box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
    }

    #sharedAuthModal button[type="submit"] {
      width: 100%;
      margin-top: 18px;
      border: 0;
      border-radius: 10px;
      padding: 14px;
      background: #2563eb;
      color: #fff;
      font-weight: 700;
      font-size: 15px;
      cursor: pointer;
      transition: background 0.2s;
    }
    #sharedAuthModal button[type="submit"]:hover { background: #1d4ed8; }
    #sharedAuthModal button[type="submit"]:disabled {
      opacity: 0.65;
      cursor: not-allowed;
    }

    .shared-auth-error {
      display: none;
      margin-top: 10px;
      padding: 10px 12px;
      border-radius: 8px;
      background: #fef2f2;
      color: #dc2626;
      font-size: 13px;
      line-height: 1.7;
    }
    .shared-auth-error.show { display: block; }

    .shared-auth-success {
      display: none;
      margin-top: 10px;
      padding: 10px 12px;
      border-radius: 8px;
      background: #f0fdf4;
      color: #15803d;
      font-size: 13px;
      line-height: 1.7;
    }
    .shared-auth-success.show { display: block; }

    .shared-auth-back {
      margin-top: 12px;
      width: 100%;
      border: 0;
      background: transparent;
      color: #64748b;
      font-size: 13px;
      cursor: pointer;
      padding: 8px;
    }
    .shared-auth-back:hover { color: #2563eb; }

    .shared-auth-terms { margin: 14px 0 0; font-size: 12px; line-height: 1.9; color: #64748b; text-align: center; }
    .shared-auth-terms a { color: #2563eb; text-decoration: underline; }
    .shared-auth-resend {
      margin-top: 8px;
      width: 100%;
      border: 0;
      background: transparent;
      color: #2563eb;
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
      padding: 8px;
    }
    .shared-auth-resend:disabled {
      color: #94a3b8;
      cursor: not-allowed;
      font-weight: 500;
    }

    .shared-auth-timer {
      text-align: center;
      margin-top: 12px;
      color: #64748b;
      font-size: 12.5px;
    }

    .shared-auth-mobile {
      direction: ltr;
      display: inline-block;
      font-weight: 700;
      color: #1e293b;
    }

    .shared-auth-row {
      display: flex;
      gap: 12px;
    }
    .shared-auth-row .shared-auth-field {
      flex: 1;
      min-width: 0;
    }

    #sharedAuthModal .shared-auth-field input {
      text-align: right;
    }

    #sharedAuthModal input[readonly] {
      direction: ltr;
      text-align: center;
      color: #94a3b8;
      cursor: not-allowed;
    }

    .shared-auth-hint {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 6px;
      margin-top: 8px;
      color: #94a3b8;
      font-size: 12.5px;
    }
    .shared-auth-hint svg { flex-shrink: 0; }

    .shared-auth-otp-input {
      text-align: center !important;
      direction: ltr !important;
      letter-spacing: 12px;
      font-size: 24px !important;
      font-weight: 800;
    }

    .shared-auth-loading {
      display: inline-block;
      width: 16px;
      height: 16px;
      border: 2px solid rgba(255,255,255,.45);
      border-top-color: #fff;
      border-radius: 50%;
      animation: sharedAuthSpin .7s linear infinite;
      vertical-align: middle;
      margin-left: 6px;
    }
    @keyframes sharedAuthSpin {
      to { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(style);

  // ─── ساخت مودال ───
  const modal = document.createElement("div");
  modal.id = "sharedAuthModal";
  modal.setAttribute("role", "dialog");
  modal.setAttribute("aria-modal", "true");
  modal.setAttribute("aria-labelledby", "sharedAuthTitle");
  modal.innerHTML = `
    <div class="shared-auth-box">
      <button class="shared-auth-close" type="button" aria-label="بستن">×</button>
      <div id="sharedAuthContent"></div>
    </div>
  `;
  document.body.appendChild(modal);

  const content = document.getElementById("sharedAuthContent");

  let currentIdentifier = "";
  let currentType = "login"; // login یا register
  let timerInterval = null;
  let resendSeconds = 120;

  // ─── توابع کمکی ───
  function toEnglishDigits(str) {
    return String(str || "")
      .replace(/[۰-۹]/g, (d) => "۰۱۲۳۴۵۶۷۸۹".indexOf(d))
      .replace(/[٠-٩]/g, (d) => "٠١٢٣٤٥٦٧٨٩".indexOf(d));
  }

  function normalizeIranMobile(value) {
    let mobile = toEnglishDigits(value).trim();
    mobile = mobile.replace(/[^\d+]/g, "");

    if (mobile.startsWith("+98")) mobile = "0" + mobile.slice(3);
    else if (mobile.startsWith("0098")) mobile = "0" + mobile.slice(4);
    else if (mobile.startsWith("98") && mobile.length === 12)
      mobile = "0" + mobile.slice(2);
    else if (/^9\d{9}$/.test(mobile)) mobile = "0" + mobile;

    return mobile;
  }

  function showError(message) {
    const el = document.getElementById("sharedAuthError");
    if (!el) return;
    el.textContent = message;
    el.classList.add("show");
  }

  function clearError() {
    const el = document.getElementById("sharedAuthError");
    if (!el) return;
    el.textContent = "";
    el.classList.remove("show");
  }

  function setLoading(button, loading, normalText) {
    if (!button) return;
    button.disabled = loading;
    button.innerHTML = loading
      ? `<span class="shared-auth-loading"></span> لطفاً صبر کنید...`
      : normalText;
  }

  async function apiRequest(url, body) {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(body),
    });

    let data = {};
    try {
      data = await response.json();
    } catch (_) {
      throw new Error("پاسخ نامعتبر از سرور دریافت شد.");
    }

    if (!response.ok || data.success === false) {
      let message =
        data.message ||
        data.error ||
        (Array.isArray(data.errors) && data.errors[0]?.msg) ||
        "خطایی در ارتباط با سرور رخ داد.";
      throw new Error(message);
    }

    return data;
  }

  // ─── تایمر ارسال مجدد ───
  function updateTimer() {
    const timer = document.getElementById("sharedAuthTimer");
    const resend = document.getElementById("sharedAuthResend");
    if (!timer || !resend) return;

    if (resendSeconds > 0) {
      const m = Math.floor(resendSeconds / 60);
      const s = String(resendSeconds % 60).padStart(2, "0");
      timer.textContent = `امکان ارسال مجدد تا ${m}:${s}`;
      resend.disabled = true;
      resend.textContent = "ارسال مجدد کد";
    } else {
      timer.textContent = "اکنون می‌توانید کد را دوباره ارسال کنید.";
      resend.disabled = false;
      resend.textContent = "ارسال مجدد کد";
    }
  }

  function startTimer() {
    clearInterval(timerInterval);
    resendSeconds = 120;
    updateTimer();
    timerInterval = setInterval(() => {
      resendSeconds--;
      if (resendSeconds <= 0) clearInterval(timerInterval);
      updateTimer();
    }, 1000);
  }

  // ─── مرحله ۱: شماره موبایل ───
  function showPhoneStep() {
    clearInterval(timerInterval);
    content.innerHTML = `
      <h2 id="sharedAuthTitle">ورود به حساب کاربری</h2>
      <p>شماره موبایل خود را وارد کنید تا کد تأیید برای شما ارسال شود.</p>
      <form id="sharedAuthPhoneForm">
        <label for="sharedAuthIdentifier">شماره موبایل</label>
        <input
          id="sharedAuthIdentifier"
          type="tel"
          inputmode="numeric"
          autocomplete="tel"
          placeholder="09123456789"
          maxlength="13"
          required
        />
        <div id="sharedAuthError" class="shared-auth-error"></div>
        <button type="submit" id="sharedAuthSubmit">دریافت کد تأیید</button>
        <p class="shared-auth-terms">با ورود یا ثبت‌نام، <a href="/terms" target="_blank" rel="noopener">قوانین و مقررات</a> سایت را می‌پذیرید.</p>
      </form>
    `;

    const input = document.getElementById("sharedAuthIdentifier");
    if (currentIdentifier) input.value = currentIdentifier;
    input.focus();

    document
      .getElementById("sharedAuthPhoneForm")
      .addEventListener("submit", sendOtp);
  }

  // ─── مرحله ۲: وارد کردن OTP ───
  function showOtpStep() {
    content.innerHTML = `
      <h2 id="sharedAuthTitle">تأیید شماره موبایل</h2>
      <p>
        کد تأیید به شماره
        <span class="shared-auth-mobile">${currentIdentifier}</span>
        ارسال شد.
      </p>
      <form id="sharedAuthOtpForm">
        <label for="sharedAuthOtp">کد تأیید</label>
        <input
          id="sharedAuthOtp"
          class="shared-auth-otp-input"
          type="text"
          inputmode="numeric"
          autocomplete="one-time-code"
          maxlength="5"
          placeholder="•••••"
          required
        />
        <div id="sharedAuthError" class="shared-auth-error"></div>
        <button type="submit" id="sharedAuthVerify">تأیید و ورود</button>
        <div id="sharedAuthTimer" class="shared-auth-timer"></div>
        <button type="button" id="sharedAuthResend" class="shared-auth-resend" disabled>
          ارسال مجدد کد
        </button>
        <button type="button" id="sharedAuthBack" class="shared-auth-back">
          ← تغییر شماره موبایل
        </button>
      </form>
    `;

    const otpInput = document.getElementById("sharedAuthOtp");
    otpInput.focus();
    otpInput.addEventListener("input", function () {
      this.value = toEnglishDigits(this.value)
        .replace(/[^\d]/g, "")
        .slice(0, 5);
    });

    document
      .getElementById("sharedAuthOtpForm")
      .addEventListener("submit", verifyOtp);
    document
      .getElementById("sharedAuthResend")
      .addEventListener("click", resendOtp);
    document
      .getElementById("sharedAuthBack")
      .addEventListener("click", showPhoneStep);

    startTimer();
  }

  // ─── مرحله ۳: تکمیل اطلاعات کاربری ───
  function showProfileStep() {
    clearInterval(timerInterval);
    content.innerHTML = `
      <h2 id="sharedAuthTitle">تکمیل اطلاعات کاربری</h2>
      <form id="sharedAuthProfileForm">
        <div class="shared-auth-row">
          <div class="shared-auth-field">
            <label for="sharedAuthFirstName">نام</label>
            <input
              id="sharedAuthFirstName"
              type="text"
              autocomplete="given-name"
              placeholder="نام"
              maxlength="50"
              required
            />
          </div>
          <div class="shared-auth-field">
            <label for="sharedAuthLastName">نام خانوادگی</label>
            <input
              id="sharedAuthLastName"
              type="text"
              autocomplete="family-name"
              placeholder="نام خانوادگی"
              maxlength="50"
              required
            />
          </div>
        </div>

        <div class="shared-auth-row" style="margin-top:18px;">
          <div class="shared-auth-field">
            <label for="sharedAuthNationalCode">کد ملی (اختیاری)</label>
            <input
              id="sharedAuthNationalCode"
              type="text"
              inputmode="numeric"
              autocomplete="off"
              placeholder="کد ملی ۱۰ رقمی"
              maxlength="10"
            />
          </div>
          <div class="shared-auth-field">
            <label for="sharedAuthBirthDate">تاریخ تولد (اختیاری)</label>
            <input
              id="sharedAuthBirthDate"
              type="date"
              autocomplete="bday"
            />
          </div>
        </div>

        <div class="shared-auth-field" style="margin-top:18px;">
          <label for="sharedAuthMobileReadonly">تلفن همراه</label>
          <input
            id="sharedAuthMobileReadonly"
            type="text"
            value="${currentIdentifier}"
            readonly
          />
          <div class="shared-auth-hint">
            <span>شماره تلفن همراه قابل ویرایش نمی‌باشد</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="16" x2="12" y2="12"></line>
              <line x1="12" y1="8" x2="12.01" y2="8"></line>
            </svg>
          </div>
        </div>

        <div id="sharedAuthError" class="shared-auth-error"></div>
        <button type="submit" id="sharedAuthProfileSubmit">ذخیره تغییرات</button>
      </form>
    `;

    const firstNameInput = document.getElementById("sharedAuthFirstName");
    firstNameInput.focus();

    document
      .getElementById("sharedAuthProfileForm")
      .addEventListener("submit", saveProfile);
  }

  // ─── ذخیره اطلاعات کاربری ───
  async function saveProfile(event) {
    event.preventDefault();
    clearError();

    const firstNameInput = document.getElementById("sharedAuthFirstName");
    const lastNameInput = document.getElementById("sharedAuthLastName");
    const button = document.getElementById("sharedAuthProfileSubmit");

    const firstName = firstNameInput.value.trim();
    const lastName = lastNameInput.value.trim();
    const nationalCode = document
      .getElementById("sharedAuthNationalCode")
      .value.trim()
      .replace(/[۰-۹]/g, (digit) => "۰۱۲۳۴۵۶۷۸۹".indexOf(digit))
      .replace(/[٠-٩]/g, (digit) => "٠١٢٣٤٥٦٧٨٩".indexOf(digit));
    const birthDate = document.getElementById("sharedAuthBirthDate").value;

    if (firstName.length < 2 || lastName.length < 2) {
      showError("لطفاً نام و نام خانوادگی را به‌درستی وارد کنید.");
      return;
    }
    if (nationalCode && !/^\d{10}$/.test(nationalCode)) {
      showError("کد ملی باید ۱۰ رقم باشد یا خالی بماند.");
      return;
    }

    setLoading(button, true, "ذخیره تغییرات");

    try {
      await apiRequest("/api/auth/complete-profile", {
        firstName,
        lastName,
        ...(nationalCode ? { nationalCode } : {}),
        ...(birthDate ? { birthDate } : {}),
      });

      clearInterval(timerInterval);
      document.body.classList.add("logged-in");

      content.innerHTML = `
        <h2 id="sharedAuthTitle">ورود موفق ✓</h2>
        <p>اطلاعات شما ذخیره شد. در حال بروزرسانی...</p>
      `;

      setTimeout(() => {
        window.location.reload();
      }, 800);
    } catch (error) {
      console.error("Save Profile Error:", error);
      showError(
        error.message || "ذخیره اطلاعات انجام نشد. لطفاً دوباره تلاش کنید.",
      );
      setLoading(button, false, "ذخیره تغییرات");
    }
  }

  // ─── ارسال OTP ───
  async function sendOtp(event) {
    event.preventDefault();
    clearError();

    const input = document.getElementById("sharedAuthIdentifier");
    const button = document.getElementById("sharedAuthSubmit");
    const mobile = normalizeIranMobile(input.value);

    if (!/^09\d{9}$/.test(mobile)) {
      showError("لطفاً یک شماره موبایل معتبر مانند 09123456789 وارد کنید.");
      return;
    }

    currentIdentifier = mobile;
    setLoading(button, true, "دریافت کد تأیید");

    try {
      // بررسی وجود کاربر برای تعیین type
      try {
        const check = await apiRequest("/api/auth/check-user", {
          identifier: currentIdentifier,
        });
        currentType = check.data?.exists ? "login" : "register";
      } catch (_) {
        currentType = "login";
      }

      await apiRequest("/api/auth/send-otp", {
        identifier: currentIdentifier,
        type: currentType,
      });

      showOtpStep();
    } catch (error) {
      console.error("Send OTP Error:", error);
      showError(
        error.message || "ارسال کد تأیید انجام نشد. لطفاً دوباره تلاش کنید.",
      );
      setLoading(button, false, "دریافت کد تأیید");
    }
  }

  // ─── تأیید OTP ───
  async function verifyOtp(event) {
    event.preventDefault();
    clearError();

    const input = document.getElementById("sharedAuthOtp");
    const button = document.getElementById("sharedAuthVerify");
    const code = toEnglishDigits(input.value.trim());

    if (!/^\d{5}$/.test(code)) {
      showError("کد تأیید باید ۵ رقم باشد.");
      return;
    }

    setLoading(button, true, "تأیید و ورود");

    try {
      const result = await apiRequest("/api/auth/verify-login-otp", {
        identifier: currentIdentifier,
        code,
      });

      if (result.token) {
        localStorage.setItem("token", result.token);
        localStorage.setItem("authToken", result.token);
      }
      if (result.user) {
        localStorage.setItem("user", JSON.stringify(result.user));
      }

      clearInterval(timerInterval);
      document.body.classList.add("logged-in");

      // اگر کاربر نام و نام خانوادگی ثبت نکرده، مرحله تکمیل اطلاعات را نشان بده
      if (result.needsProfile) {
        showProfileStep();
        return;
      }

      content.innerHTML = `
        <h2 id="sharedAuthTitle">ورود موفق ✓</h2>
        <p>ورود شما با موفقیت انجام شد. در حال بروزرسانی...</p>
      `;

      setTimeout(() => {
        window.location.reload();
      }, 800);
    } catch (error) {
      console.error("Verify OTP Error:", error);
      showError(error.message || "کد تأیید نادرست یا منقضی شده است.");
      setLoading(button, false, "تأیید و ورود");
      input.focus();
      input.select();
    }
  }

  // ─── ارسال مجدد OTP ───
  async function resendOtp() {
    clearError();
    const button = document.getElementById("sharedAuthResend");
    if (!button || resendSeconds > 0) return;

    button.disabled = true;
    button.textContent = "در حال ارسال...";

    try {
      await apiRequest("/api/auth/resend-otp", {
        identifier: currentIdentifier,
        type: currentType,
      });

      startTimer();

      const success = document.createElement("div");
      success.className = "shared-auth-success show";
      success.textContent = "کد تأیید جدید ارسال شد.";
      const form = document.getElementById("sharedAuthOtpForm");
      form.insertBefore(success, form.firstChild);
      setTimeout(() => success.remove(), 3000);
    } catch (error) {
      console.error("Resend OTP Error:", error);
      showError(error.message || "ارسال مجدد کد انجام نشد.");
      button.disabled = false;
      button.textContent = "ارسال مجدد کد";
    }
  }

  // ─── باز و بسته کردن مودال ───
  function openLoginModal() {
    showPhoneStep();
    modal.classList.add("open");
    setTimeout(() => {
      const input = document.getElementById("sharedAuthIdentifier");
      if (input) input.focus();
    }, 50);
  }

  function closeLoginModal() {
    modal.classList.remove("open");
    clearInterval(timerInterval);
  }

  // در دسترس قرار دادن برای دکمه‌های سایت
  window.openLoginModal = openLoginModal;
  window.closeLoginModal = closeLoginModal;

  // رویدادها
  modal
    .querySelector(".shared-auth-close")
    .addEventListener("click", closeLoginModal);
  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeLoginModal();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modal.classList.contains("open")) {
      closeLoginModal();
    }
  });

  // اگر کاربر از قبل لاگین است
  try {
    const saved =
      localStorage.getItem("user") || localStorage.getItem("authToken");
    if (saved) document.body.classList.add("logged-in");
  } catch (_) {}
})();

;(() => {
  const script = document.createElement("script");
  script.src = "/js/product-ratings.js?v=2";
  script.defer = true;
  document.head.appendChild(script);
})();
