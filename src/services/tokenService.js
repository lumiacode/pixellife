const jwt = require("jsonwebtoken");
const env = require("../config/env");

/**
 * سرویس مدیریت توکن‌های JWT
 */
const tokenService = {
  /**
   * ساخت توکن JWT برای کاربر
   * @param {string} userId - شناسه کاربر
   * @returns {string} توکن JWT
   */
  generateToken(userId, tokenVersion = 0) {
    return jwt.sign({ id: userId, v: Number(tokenVersion) || 0 }, env.jwtSecret, {
      expiresIn: env.jwtExpiresIn,
      algorithm: "HS256",
    });
  },

  // توکنِ صادرشده پیش از آخرین تغییر رمز معتبر نیست (توکن‌های قدیمیِ بدون v نسخهٔ ۰ حساب می‌شوند).
  isCurrent(decoded, user) {
    return (Number(decoded && decoded.v) || 0) === (Number(user && user.tokenVersion) || 0);
  },

  /**
   * تأیید و دیکد توکن JWT
   * @param {string} token - توکن JWT
   * @returns {object} payload توکن
   */
  verifyToken(token) {
    return jwt.verify(token, env.jwtSecret, { algorithms: ["HS256"] });
  },
};

module.exports = tokenService;
