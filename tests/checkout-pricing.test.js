const assert = require("assert");
const { computePricing, evaluateDiscount, shippingFee } = require("../src/services/checkoutPricing");
const checkoutConfig = require("../src/config/checkout");

const post = checkoutConfig.shippingMethods[0];
const items = [{ price: 1399000, originalPrice: 2099000, quantity: 1 }];

// قیمت، تخفیف کالا، ارسال و سود
let pricing = computePricing({ items, shippingMethod: post });
assert.strictEqual(pricing.originalSubtotal, 2099000);
assert.strictEqual(pricing.productDiscount, 700000);
assert.strictEqual(pricing.shipping, post.fee);
assert.strictEqual(pricing.total, 1399000 + post.fee);
assert.strictEqual(pricing.savings, 700000);

// ارسال بالای آستانه رایگان است
assert.strictEqual(shippingFee(post, checkoutConfig.freeShippingThreshold), 0);
assert.strictEqual(shippingFee(post, checkoutConfig.freeShippingThreshold - 1), post.fee);

// کد تخفیف درصدی با سقف
const percent = { isActive: true, type: "percent", value: 20, maxDiscount: 100000, minOrderAmount: 0, usageLimit: 0, usedCount: 0 };
assert.strictEqual(evaluateDiscount(percent, 1399000).amount, 100000);
pricing = computePricing({ items, shippingMethod: post, discountAmount: 100000 });
assert.strictEqual(pricing.total, 1399000 + post.fee - 100000);
assert.strictEqual(pricing.savings, 800000);

// تخفیف هرگز از جمع کالا بیشتر نمی‌شود
const fixed = { isActive: true, type: "fixed", value: 9999999, maxDiscount: 0, minOrderAmount: 0, usageLimit: 0, usedCount: 0 };
assert.strictEqual(evaluateDiscount(fixed, 500000).amount, 500000);

// کدهای نامعتبر
assert.ok(evaluateDiscount(null, 1000).error);
assert.ok(evaluateDiscount({ ...percent, isActive: false }, 1000).error);
assert.ok(evaluateDiscount({ ...percent, expiresAt: new Date(Date.now() - 1000) }, 1000).error);
assert.ok(evaluateDiscount({ ...percent, usageLimit: 5, usedCount: 5 }, 1000).error);
assert.ok(evaluateDiscount({ ...percent, minOrderAmount: 5000000 }, 1000).error);

console.log("Checkout pricing test passed.");
