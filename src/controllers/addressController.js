const Address = require("../models/Address");
const ApiError = require("../utils/ApiError");

// موقعیت GPS اختیاری: فقط lat/lng/accuracy عددی نگه داشته می‌شود؛ مقدار تهی یعنی بدون موقعیت.
function cleanLocation(location) {
  if (!location || typeof location !== "object") return undefined;
  const lat = Number(location.lat);
  const lng = Number(location.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return undefined;
  const accuracy = Number(location.accuracy);
  return { lat, lng, ...(Number.isFinite(accuracy) && accuracy >= 0 ? { accuracy: Math.round(accuracy) } : {}) };
}

// ============================================================
// دریافت لیست آدرس‌های کاربر
// ============================================================
exports.listAddresses = async (req, res, next) => {
  try {
    const addresses = await Address.find({ user: req.user._id }).sort({
      isDefault: -1,
      createdAt: -1,
    });

    res.json({ success: true, data: addresses });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// ایجاد آدرس جدید
// ============================================================
exports.createAddress = async (req, res, next) => {
  try {
    const {
      title,
      province,
      city,
      fullAddress,
      postalCode,
      receiverName,
      receiverMobile,
      isDefault,
      location,
    } = req.body;

    if (isDefault) {
      await Address.updateMany(
        { user: req.user._id },
        { $set: { isDefault: false } },
      );
    }

    const address = await Address.create({
      user: req.user._id,
      title,
      province,
      city,
      fullAddress,
      postalCode,
      receiverName,
      receiverMobile,
      isDefault: !!isDefault,
      location: cleanLocation(location),
    });

    res.status(201).json({ success: true, data: address });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// ویرایش آدرس
// ============================================================
exports.updateAddress = async (req, res, next) => {
  try {
    const address = await Address.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!address) {
      return next(new ApiError(404, "آدرس یافت نشد"));
    }

    const {
      title,
      province,
      city,
      fullAddress,
      postalCode,
      receiverName,
      receiverMobile,
      isDefault,
      location,
    } = req.body;

    if (isDefault) {
      await Address.updateMany(
        { user: req.user._id, _id: { $ne: address._id } },
        { $set: { isDefault: false } },
      );
    }

    if (title !== undefined) address.title = title;
    if (province !== undefined) address.province = province;
    if (city !== undefined) address.city = city;
    if (fullAddress !== undefined) address.fullAddress = fullAddress;
    if (postalCode !== undefined) address.postalCode = postalCode;
    if (receiverName !== undefined) address.receiverName = receiverName;
    if (receiverMobile !== undefined) address.receiverMobile = receiverMobile;
    if (isDefault !== undefined) address.isDefault = !!isDefault;
    // موقعیت: شیء معتبر = ثبت/به‌روزرسانی، null = حذف، نفرستادن = بدون تغییر
    if (location !== undefined) address.location = cleanLocation(location);

    await address.save();

    res.json({ success: true, data: address });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// حذف آدرس
// ============================================================
exports.deleteAddress = async (req, res, next) => {
  try {
    const address = await Address.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!address) {
      return next(new ApiError(404, "آدرس یافت نشد"));
    }

    res.json({ success: true, message: "آدرس حذف شد" });
  } catch (error) {
    next(error);
  }
};
