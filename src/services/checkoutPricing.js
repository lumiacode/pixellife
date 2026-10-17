const Product = require("../models/Product");
const DiscountCode = require("../models/DiscountCode");
const ApiError = require("../utils/ApiError");
const checkoutConfig = require("../config/checkout");

const OBJECT_ID_RE = /^[a-f\d]{24}$/i;

function findShippingMethod(id) {
  const methods = checkoutConfig.shippingMethods.filter((method) => method.enabled);
  return methods.find((method) => method.id === id) || methods[0] || null;
}

function findPaymentMethod(id) {
  const methods = checkoutConfig.paymentMethods.filter((method) => method.enabled);
  return methods.find((method) => method.id === id) || null;
}

function shippingFee(method, subtotal) {
  if (!method) return 0;
  return subtotal >= checkoutConfig.freeShippingThreshold ? 0 : method.fee;
}

// قیمت‌ها همیشه از دیتابیس خوانده می‌شوند؛ قیمتی که مرورگر می‌فرستد معتبر نیست.
async function loadLineItems(requestedItems) {
  const products = await Promise.all(requestedItems.map((item) => {
    const id = String(item.productId || "").trim();
    if (OBJECT_ID_RE.test(id)) return Product.findById(id).lean();
    return Product.findOne({ $or: [{ slug: id }, { legacyId: id }] }).lean();
  }));
  const lines = requestedItems.map((item, index) => {
    const product = products[index];
    const quantity = Math.max(1, Math.floor(Number(item.quantity) || 0));
    if (!product || product.availability === "out" || Number(product.stock) < quantity) {
      throw new ApiError(409, `محصول «${product?.name || "انتخاب‌شده"}» موجود نیست`);
    }
    const originalPrice = Math.round(Number(product.price));
    const price = Math.round(originalPrice * (1 - Math.max(0, Number(product.discount) || 0) / 100));
    return {
      product: product._id,
      name: product.name,
      brand: product.brand,
      image: product.mainImage || product.images?.[0] || "",
      category: product.category || "",
      price,
      originalPrice,
      quantity,
      color: String(item.color || ""),
      storage: String(item.storage || ""),
      warranty: String(item.warranty || ""),
    };
  });
  return lines;
}

// بررسی کد تخفیف؛ خروجی { amount, error } است و هیچ‌وقت exception نمی‌دهد.
function evaluateDiscount(doc, subtotal, now = new Date()) {
  if (!doc || !doc.isActive) return { amount: 0, error: "کد تخفیف معتبر نیست" };
  if (doc.expiresAt && new Date(doc.expiresAt) < now) return { amount: 0, error: "مهلت استفاده از این کد تخفیف تمام شده است" };
  if (doc.usageLimit > 0 && doc.usedCount >= doc.usageLimit) return { amount: 0, error: "ظرفیت استفاده از این کد تخفیف تمام شده است" };
  if (subtotal < doc.minOrderAmount) {
    return { amount: 0, error: `این کد برای سفارش‌های بالای ${doc.minOrderAmount.toLocaleString("fa-IR")} تومان قابل استفاده است` };
  }
  let amount = doc.type === "percent" ? Math.floor(subtotal * Math.min(doc.value, 100) / 100) : doc.value;
  if (doc.type === "percent" && doc.maxDiscount > 0) amount = Math.min(amount, doc.maxDiscount);
  return { amount: Math.max(0, Math.min(amount, subtotal)), error: "" };
}

function computePricing({ items, shippingMethod, discountAmount = 0 }) {
  const originalSubtotal = items.reduce((sum, item) => sum + item.originalPrice * item.quantity, 0);
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const productDiscount = originalSubtotal - subtotal;
  const shipping = shippingFee(shippingMethod, subtotal);
  const codeDiscount = Math.max(0, Math.min(discountAmount, subtotal));
  const total = subtotal + shipping - codeDiscount;
  return {
    itemsCount: items.reduce((sum, item) => sum + item.quantity, 0),
    originalSubtotal,
    subtotal,
    productDiscount,
    shipping,
    codeDiscount,
    total,
    savings: productDiscount + codeDiscount,
  };
}

async function findDiscountCode(rawCode) {
  const code = String(rawCode || "").trim().toUpperCase();
  if (!code) return null;
  return DiscountCode.findOne({ code });
}

// آیتم‌ها + قیمت‌گذاری + کد تخفیف در یک مرحله
async function buildQuote({ items, shippingMethodId, discountCode }) {
  const lines = await loadLineItems(items);
  const shippingMethod = findShippingMethod(shippingMethodId);
  if (!shippingMethod) throw new ApiError(400, "روش ارسال معتبر نیست");
  const subtotal = lines.reduce((sum, item) => sum + item.price * item.quantity, 0);
  let discount = null;
  let discountError = "";
  const doc = await findDiscountCode(discountCode);
  if (String(discountCode || "").trim()) {
    const result = evaluateDiscount(doc, subtotal);
    if (result.error) discountError = result.error;
    else discount = { doc, amount: result.amount };
  }
  const pricing = computePricing({ items: lines, shippingMethod, discountAmount: discount?.amount || 0 });
  return { lines, shippingMethod, discount, discountError, pricing };
}

module.exports = { findShippingMethod, findPaymentMethod, shippingFee, loadLineItems, evaluateDiscount, computePricing, buildQuote };
