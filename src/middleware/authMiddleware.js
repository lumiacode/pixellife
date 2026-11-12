const tokenService = require("../services/tokenService");
const User = require("../models/User");
const ApiError = require("../utils/ApiError");

/**
 * میدلور محافظت از مسیرها - بررسی توکن JWT
 */
exports.protect = async (req, res, next) => {
  try {
    let token = req.cookies?.token;

    if (!token && req.headers.authorization?.startsWith("Bearer")) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      return next(new ApiError(401, "برای دسترسی باید وارد شوید"));
    }

    const decoded = tokenService.verifyToken(token);
    const user = await User.findById(decoded.id);

    if (!user) {
      return next(new ApiError(401, "کاربر یافت نشد"));
    }

    if (!tokenService.isCurrent(decoded, user)) {
      return next(new ApiError(401, "نشست شما منقضی شده است. لطفاً دوباره وارد شوید"));
    }

    if (!user.isActive) {
      return next(new ApiError(403, "حساب کاربری شما غیرفعال شده است"));
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};

exports.isAdmin = (req, res, next) => {
  if (req.user?.role !== "admin") return next(new ApiError(403, "دسترسی غیرمجاز"));
  next();
};
