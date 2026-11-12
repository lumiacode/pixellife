const crypto = require("crypto");
const OTP = require("../models/OTP");
const env = require("../config/env");
const smsService = require("./smsService");
const ApiError = require("../utils/ApiError");

// سقف دفعات واردکردن اشتباه یک کد و سقف درخواست کد برای هر شماره در ساعت.
const MAX_VERIFY_ATTEMPTS = 5;
const MAX_SENDS_PER_HOUR = 3;
const SEND_WINDOW_MS = 60 * 60 * 1000;
const sendLog = new Map(); // identifier -> زمان ارسال‌های اخیر (حافظهٔ همین پروسه)
// قفل روزانه: بعد از این تعداد کد اشتباه در ۲۴ ساعت، آن شماره تا پایان پنجره نمی‌تواند کد امتحان کند
// (۵ تلاش برای هر کد × ۳ کد در ساعت، بدون این سقف در یک روز به صدها حدس می‌رسید).
const MAX_FAILED_PER_DAY = 20;
const FAIL_WINDOW_MS = 24 * 60 * 60 * 1000;
const failLog = new Map(); // identifier -> زمان تلاش‌های اشتباه
const recentFails = (identifier) => (failLog.get(identifier) || []).filter((time) => Date.now() - time < FAIL_WINDOW_MS);
function assertNotLocked(identifier) {
  if (recentFails(identifier).length >= MAX_FAILED_PER_DAY) throw new ApiError(429, "به‌دلیل تلاش‌های اشتباه زیاد، ورود با کد برای این شماره موقتاً بسته شد؛ بعداً دوباره تلاش کنید");
}
function registerFail(identifier) {
  const list = recentFails(identifier); list.push(Date.now()); failLog.set(identifier, list);
  if (failLog.size > 50000) failLog.clear();
}
const sameCode = (a, b) => { const x = Buffer.from(String(a)); const y = Buffer.from(String(b)); return x.length === y.length && crypto.timingSafeEqual(x, y); };

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
  for (const [identifier, times] of failLog) {
    if (!times.some((time) => now - time < FAIL_WINDOW_MS)) failLog.delete(identifier);
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
    // مولد تصادفی رمزنگاری (نه Math.random که قابل پیش‌بینی است)
    return crypto.randomInt(min, max + 1).toString();
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
    assertNotLocked(identifier);
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

    if (!sameCode(record.code, code)) {
      registerFail(identifier);
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
