const User = require("../models/User");
const OTP = require("../models/OTP");
const tokenService = require("../services/tokenService");
const otpService = require("../services/otpService");
const ApiError = require("../utils/ApiError");

const normalizeIdentifier = (identifier) => {
  if (typeof identifier !== "string") return identifier;
  const normalized = identifier
    .trim()
    .replace(/[۰-۹]/g, (digit) => "۰۱۲۳۴۵۶۷۸۹".indexOf(digit))
    .replace(/[٠-٩]/g, (digit) => "٠١٢٣٤٥٦٧٨٩".indexOf(digit))
    .replace(/[\s-]/g, "");
  if (/^\+989\d{9}$/.test(normalized)) return `0${normalized.slice(3)}`;
  if (/^00989\d{9}$/.test(normalized)) return `0${normalized.slice(4)}`;
  if (/^989\d{9}$/.test(normalized)) return `0${normalized.slice(2)}`;
  return normalized;
};

/**
 * کمک‌کننده: پیدا کردن کاربر بر اساس identifier (موبایل یا ایمیل)
 */
const findUserByIdentifier = async (identifier, selectPassword = false) => {
  const isMobile = /^09\d{9}$/.test(identifier);
  let query = isMobile
    ? User.findOne({ mobile: identifier })
    : User.findOne({ email: identifier });

  if (selectPassword) {
    query = query.select("+password");
  }

  return await query;
};

/**
 * کمک‌کننده: تشخیص کانال ارسال بر اساس identifier
 */
const getChannel = (identifier) => {
  return /^09\d{9}$/.test(identifier) ? "sms" : "email";
};

// ============================================================
// مرحله ۱: بررسی وجود کاربر (Check User)
// ============================================================
exports.checkUser = async (req, res, next) => {
  try {
    const identifier = normalizeIdentifier(req.body.identifier);

    const user = await findUserByIdentifier(identifier);

    if (!user) {
      return res.json({
        success: true,
        data: {
          exists: false,
          hasPassword: false,
          channel: getChannel(identifier),
        },
      });
    }

    res.json({
      success: true,
      data: {
        exists: true,
        hasPassword: user.hasPassword(),
        channel: getChannel(identifier),
      },
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// مرحله ۲: ارسال کد تأیید OTP (Send OTP)
// ثبت‌نام خودکار برای کاربران جدید
// ============================================================
exports.sendOtp = async (req, res, next) => {
  try {
    const { type } = req.body;
    const identifier = normalizeIdentifier(req.body.identifier);
    const channel = getChannel(identifier);
    if (channel === "email")
      return next(new ApiError(400, "ورود با ایمیل هنوز فعال نیست"));
    if (type === "forgot") return next(new ApiError(400, "نوع کد تأیید نامعتبر است"));

    // حساب کاربر جدید فقط بعد از تأیید کد ساخته می‌شود (در verifyLoginOtp)؛ ارسال کد رکوردی نمی‌سازد.

    // ارسال کد تأیید
    await otpService.createAndSend(identifier, type, channel);

    res.json({
      success: true,
      message: "کد تأیید ارسال شد",
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// مرحله ۳: تأیید OTP و ورود (Verify Login OTP)
// ============================================================
exports.verifyLoginOtp = async (req, res, next) => {
  try {
    const { code } = req.body;
    const identifier = normalizeIdentifier(req.body.identifier);

    // تأیید کد OTP (register یا login). خطای «تلاش زیاد» مستقیم به کاربر برمی‌گردد.
    let verified = false;
    let lastError = null;
    for (const type of ["register", "login"]) {
      try {
        await otpService.verify(identifier, code, type);
        verified = true;
        break;
      } catch (e) {
        if (e.statusCode === 429) return next(e);
        lastError = e;
      }
    }
    if (!verified) {
      return next(lastError || new ApiError(400, "کد تأیید نادرست یا منقضی شده است"));
    }

    // کاربر جدید فقط پس از اثبات مالکیت شماره ساخته می‌شود.
    let user = await findUserByIdentifier(identifier);
    if (!user) {
      const isMobile = /^09\d{9}$/.test(identifier);
      user = await User.create(isMobile ? { mobile: identifier } : { email: identifier });
    }
    if (!user.isActive) {
      return next(new ApiError(403, "حساب کاربری شما غیرفعال شده است"));
    }

    // فعال‌سازی حساب
    user.isVerified = true;
    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    // ساخت توکن
    const token = tokenService.generateToken(user._id);
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    const needsProfile = !user.firstName || !user.lastName;

    res.json({
      success: true,
      message: "ورود موفق",
      token,
      needsProfile,
      user: {
        id: user._id,
        mobile: user.mobile,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        isVerified: user.isVerified,
        role: user.role,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// ورود با رمز عبور (Login with Password)
// ============================================================
exports.login = async (req, res, next) => {
  try {
    const { password } = req.body;
    const identifier = normalizeIdentifier(req.body.identifier);

    // جستجوی کاربر
    const user = await findUserByIdentifier(identifier, true);
    if (!user) {
      return next(new ApiError(401, "نام کاربری یا رمز عبور اشتباه است"));
    }

    // مقایسه رمز عبور
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return next(new ApiError(401, "نام کاربری یا رمز عبور اشتباه است"));
    }

    // بررسی فعال بودن حساب
    if (!user.isActive) {
      return next(new ApiError(403, "حساب کاربری شما غیرفعال شده است"));
    }

    // بروزرسانی آخرین ورود
    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    // ساخت توکن
    const token = tokenService.generateToken(user._id);
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    res.json({
      success: true,
      message: "ورود موفق",
      token,
      user: {
        id: user._id,
        mobile: user.mobile,
        email: user.email,
        isVerified: user.isVerified,
        role: user.role,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// فراموشی رمز عبور (Forgot Password)
// ============================================================
exports.forgotPassword = async (req, res, next) => {
  try {
    const identifier = normalizeIdentifier(req.body.identifier);

    const user = await findUserByIdentifier(identifier);
    if (!user) {
      return next(new ApiError(404, "کاربری با این اطلاعات یافت نشد"));
    }

    const channel = getChannel(identifier);
    await otpService.createAndSend(identifier, "forgot", channel);

    res.json({
      success: true,
      message: "کد تأیید ارسال شد",
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// تأیید OTP فراموشی رمز عبور (Verify Forgot Password OTP)
// ============================================================
exports.verifyForgotOtp = async (req, res, next) => {
  try {
    const { code } = req.body;
    const identifier = normalizeIdentifier(req.body.identifier);

    // فقط بررسی صحت کد، بدون مصرف آن؛ تلاش‌های اشتباه شمرده می‌شوند.
    await otpService.verify(identifier, code, "forgot", { consume: false });

    res.json({
      success: true,
      message: "کد تأیید صحیح است. اکنون می‌توانید رمز عبور جدید تعیین کنید",
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// تعیین رمز عبور جدید (Reset Password)
// ============================================================
exports.resetPassword = async (req, res, next) => {
  try {
    const { code, password } = req.body;
    const identifier = normalizeIdentifier(req.body.identifier);

    const user = await findUserByIdentifier(identifier);
    if (!user) {
      return next(new ApiError(404, "کاربری با این اطلاعات یافت نشد"));
    }

    // بررسی کد OTP (استفاده از otpService برای تأیید و isUsed کردن)
    await otpService.verify(identifier, code, "forgot");

    // بروزرسانی رمز عبور
    user.password = password;
    await user.save();

    // ساخت توکن جدید
    const token = tokenService.generateToken(user._id);
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    res.json({
      success: true,
      message: "رمز عبور با موفقیت تغییر کرد",
      token,
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// ارسال مجدد OTP (Resend OTP)
// ============================================================
exports.resendOtp = async (req, res, next) => {
  try {
    const { type } = req.body;
    const identifier = normalizeIdentifier(req.body.identifier);
    const channel = getChannel(identifier);
    if (channel === "email")
      return next(new ApiError(400, "ورود با ایمیل هنوز فعال نیست"));

    // برای register/login کاربر ممکن است هنوز ساخته نشده باشد (ساخت بعد از تأیید کد).

    // برای نوع forgot: کاربر باید وجود داشته باشد
    if (type === "forgot") {
      const user = await findUserByIdentifier(identifier);
      if (!user) {
        return next(new ApiError(404, "کاربری با این اطلاعات یافت نشد"));
      }
    }

    await otpService.createAndSend(identifier, type, channel);

    res.json({
      success: true,
      message: "کد تأیید جدید ارسال شد",
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// تکمیل اطلاعات کاربری (نام و نام خانوادگی)
// ============================================================
exports.completeProfile = async (req, res, next) => {
  try {
    const { firstName, lastName, nationalCode, birthDate } = req.body;

    const user = await User.findById(req.user._id);
    if (!user) {
      return next(new ApiError(404, "کاربر یافت نشد"));
    }

    user.firstName = firstName;
    user.lastName = lastName;
    if (nationalCode !== undefined) user.nationalCode = nationalCode;
    if (birthDate !== undefined) user.birthDate = birthDate || null;
    await user.save({ validateBeforeSave: false });

    res.json({
      success: true,
      message: "اطلاعات کاربری با موفقیت ذخیره شد",
      user: {
        id: user._id,
        mobile: user.mobile,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        nationalCode: user.nationalCode,
        birthDate: user.birthDate,
        isVerified: user.isVerified,
        role: user.role,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// دریافت اطلاعات کاربر جاری (Me)
// ============================================================
exports.me = async (req, res, next) => {
  try {
    const user = req.user;
    res.json({
      success: true,
      user: {
        id: user._id,
        mobile: user.mobile,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        nationalCode: user.nationalCode,
        birthDate: user.birthDate,
        isVerified: user.isVerified,
        role: user.role,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// خروج (Logout)
// ============================================================
exports.logout = (req, res, next) => {
  try {
    res.clearCookie("token");
    res.json({
      success: true,
      message: "خروج موفق",
    });
  } catch (error) {
    next(error);
  }
};
