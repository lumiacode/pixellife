const OTP = require("../models/OTP");
const env = require("../config/env");
const smsService = require("./smsService");
const ApiError = require("../utils/ApiError");

// سقف دفعات واردکردن اشتباه یک کد و سقف درخواست کد برای هر شماره در ساعت.
const MAX_VERIFY_ATTEMPTS = 5;
const MAX_SENDS_PER_HOUR = 3;
const SEND_WINDOW_MS = 60 * 60 * 1000;
const sendLog = new Map(); // identifier -> زمان ارسال‌های اخیر (حافظهٔ همین پروسه)

function registerSend(identifier) {
  const now = Date.now();
  const recent = (sendLog.get(identifier) || []).filter((time) => now - time < SEND_WINDOW_MS);
  if (recent.length >= MAX_SENDS_PER_HOUR) {
    sendLog.set(identifier, recent);
    throw new ApiError(429, "تعداد درخواست کد برای این شماره زیاد بود؛ حدود یک ساعت دیگر دوباره تلاش کنید");
  }
  recent.push(now);
  sendLog.set(identifier, recent);
}

setInterval(() => {
  const now = Date.now();
  for (const [identifier, times] of sendLog) {
    if (!times.some((time) => now - time < SEND_WINDOW_MS)) sendLog.delete(identifier);
  }
}, 10 * 60 * 1000).unref();

/**
 * سرویس مدیریت کدهای تأیید OTP
 */
const otpService = {
  /**
   * تولید یک کد تصادفی
   */
  generateCode(length = null) {
    const len = length || env.otpLength;
    const min = Math.pow(10, len - 1);
    const max = Math.pow(10, len) - 1;
    return Math.floor(Math.random() * (max - min + 1) + min).toString();
  },

  /**
   * ایجاد و ارسال کد OTP
   * @param {string} identifier - شماره موبایل یا ایمیل
   * @param {string} type - نوع کد ("register", "login", "forgot")
   * @param {string} channel - کانال ارسال ("sms" یا "email")
   */
  async createAndSend(identifier, type, channel = "sms") {
    const expiryMinutes = env.otpExpiryMinutes;

    const recentOtp = await OTP.findOne({ identifier, type, createdAt: { $gte: new Date(Date.now() - 60 * 1000) } });
    if (recentOtp) throw new ApiError(429, "لطفاً کمی صبر کنید");
    registerSend(identifier);

    // حذف کدهای قبلی برای این شناسه و نوع
    await OTP.deleteMany({ identifier, type, isUsed: false });

    // تولید کد جدید
    const code = this.generateCode();
    const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);

    // ذخیره کد در دیتابیس
    const otpRecord = await OTP.create({
      identifier,
      code,
      type,
      channel,
      expiresAt,
    });

    // ارسال بر اساس کانال
    if (channel === "sms") {
      await smsService.sendOTP(identifier, code);
    }
    // TODO: در آینده ارسال از طریق ایمیل اضافه شود
    // if (channel === "email") {
    //   await emailService.sendOTPEmail(identifier, code);
    // }

    return otpRecord;
  },

  /**
   * تأیید کد OTP.
   * هر بار واردکردن یک «تلاش» حساب می‌شود (اتمیک)؛ بعد از MAX_VERIFY_ATTEMPTS تلاش اشتباه، کد باطل می‌شود.
   * consume=false فقط درستی کد را می‌سنجد و آن را مصرف نمی‌کند (مرحلهٔ بررسی کد فراموشی رمز).
   */
  async verify(identifier, code, type, { consume = true } = {}) {
    const record = await OTP.findOneAndUpdate(
      { identifier, type, isUsed: false, expiresAt: { $gt: new Date() }, attempts: { $lt: MAX_VERIFY_ATTEMPTS } },
      { $inc: { attempts: 1 } },
      { sort: { createdAt: -1 }, returnDocument: "after" },
    );

    if (!record) {
      const exhausted = await OTP.exists({ identifier, type, isUsed: false, expiresAt: { $gt: new Date() } });
      if (exhausted) {
        await OTP.updateMany({ identifier, type, isUsed: false }, { $set: { isUsed: true } });
        throw new ApiError(429, "تعداد تلاش‌های اشتباه زیاد بود؛ کد جدید دریافت کنید");
      }
      throw new ApiError(400, "کد تأیید نادرست یا منقضی شده است");
    }

    if (record.code !== String(code)) {
      if (record.attempts >= MAX_VERIFY_ATTEMPTS) {
        await OTP.updateOne({ _id: record._id }, { $set: { isUsed: true } });
        throw new ApiError(429, "تعداد تلاش‌های اشتباه زیاد بود؛ کد جدید دریافت کنید");
      }
      throw new ApiError(400, "کد تأیید نادرست یا منقضی شده است");
    }

    if (consume) {
      // مصرف اتمیک: دو درخواست هم‌زمان با کد درست نمی‌توانند هر دو موفق شوند.
      const used = await OTP.findOneAndUpdate({ _id: record._id, isUsed: false }, { $set: { isUsed: true } }, { returnDocument: "after" });
      if (!used) throw new ApiError(400, "کد تأیید نادرست یا منقضی شده است");
    }
    return record;
  },

  /**
   * بررسی وجود کد فعال
   */
  async hasActiveOTP(identifier, type) {
    const count = await OTP.countDocuments({
      identifier,
      type,
      isUsed: false,
      expiresAt: { $gt: new Date() },
    });
    return count > 0;
  },
};

module.exports = otpService;
