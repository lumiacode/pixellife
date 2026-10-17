const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const ApiError = require("../utils/ApiError");
const checkoutConfig = require("../config/checkout");
const { buildQuote } = require("../services/checkoutPricing");

router.get("/config", (req, res) => {
  res.json({
    success: true,
    freeShippingThreshold: checkoutConfig.freeShippingThreshold,
    shippingMethods: checkoutConfig.shippingMethods.filter((method) => method.enabled).map(({ id, title, eta, fee }) => ({ id, title, eta, fee })),
    paymentMethods: checkoutConfig.paymentMethods.filter((method) => method.enabled).map(({ id, title, description }) => ({ id, title, description })),
  });
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
