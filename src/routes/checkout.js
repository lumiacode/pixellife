const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const ApiError = require("../utils/ApiError");
const checkoutConfig = require("../config/checkout");
const { buildQuote } = require("../services/checkoutPricing");
const { loadShippingMethods } = require("../services/shippingSettings");

router.get("/config", async (req, res, next) => {
  try {
    const methods = (await loadShippingMethods()).filter((method) => method.enabled);
    res.json({
      success: true,
      // ۰ یعنی ارسال رایگان نداریم
      freeShippingThreshold: methods[0] ? methods[0].freeThreshold : 0,
      shippingMethods: methods.map(({ id, title, eta, fee, freeThreshold }) => ({ id, title, eta, fee, freeThreshold })),
      paymentMethods: checkoutConfig.paymentMethods.filter((method) => method.enabled).map(({ id, title, description }) => ({ id, title, description })),
    });
  } catch (error) {
    next(error);
  }
});

router.post("/quote", protect, async (req, res, next) => {
  try {
    const items = Array.isArray(req.body.items) ? req.body.items : [];
    if (!items.length) throw new ApiError(400, "سبد خرید خالی است");
    const quote = await buildQuote({ items, shippingMethodId: req.body.shippingMethod, discountCode: req.body.discountCode });
    res.json({
      success: true,
      items: quote.lines.map((line) => ({ productId: String(line.product), name: line.name, brand: line.brand, image: line.image, price: line.price, originalPrice: line.originalPrice, quantity: line.quantity, color: line.color, storage: line.storage, warranty: line.warranty })),
      shippingMethod: { id: quote.shippingMethod.id, title: quote.shippingMethod.title, eta: quote.shippingMethod.eta },
      pricing: quote.pricing,
      discount: quote.discount ? { code: quote.discount.doc.code, title: quote.discount.doc.title, amount: quote.discount.amount } : null,
      discountError: quote.discountError,
    });
  } catch (error) {
    // کالاهای ناموجود/حذف‌شده را به مرورگر می‌گوییم تا از سبد خرید پاک شوند.
    if (error.statusCode === 409 && error.details?.unavailable) {
      return res.status(409).json({ success: false, message: error.message, unavailable: error.details.unavailable });
    }
    next(error);
  }
});

module.exports = router;
