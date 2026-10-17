const Product = require("../models/Product");
const Order = require("../models/Order");

// مقایسهٔ رنگ/حافظه دقیقاً مثل سبد خرید (views/cart.html) انجام می‌شود؛ «—» یعنی انتخاب نشده.
function normalizeVariantValue(value) {
  const normalized = String(value || "")
    .trim()
    .replace(/[يى]/g, "ی")
    .replace(/[ك]/g, "ک")
    .replace(/\s+/g, " ")
    .toLowerCase();
  return normalized === "—" || normalized === "-" ? "" : normalized;
}

function variantColorName(variant) {
  return variant?.color?.name || variant?.color || "";
}

// تنوعِ انتخاب‌شده (حافظه + رنگ) یا null اگر محصول تنوع ندارد / چیزی انتخاب نشده.
function findVariant(product, selection) {
  const variants = Array.isArray(product?.variants) ? product.variants : [];
  if (!variants.length) return null;
  const storage = normalizeVariantValue(selection.storage || selection.variant);
  const color = normalizeVariantValue(selection.color);
  if (!storage && !color) return null;
  return variants.find((variant) =>
    (!storage || normalizeVariantValue(variant.storage) === storage) &&
    (!color || normalizeVariantValue(variantColorName(variant)) === color)) || null;
}

// موجودی قابل فروشِ همان انتخاب؛ صفر یعنی ناموجود.
function availableStock(product, selection) {
  if (!product) return 0;
  const productStock = Math.max(0, Math.floor(Number(product.stock) || 0));
  if (String(product.availability || "").toLowerCase() === "out" || productStock < 1) return 0;
  const hasVariants = Array.isArray(product.variants) && product.variants.length > 0;
  const hasSelection = Boolean(normalizeVariantValue(selection.storage || selection.variant) || normalizeVariantValue(selection.color));
  if (hasVariants && hasSelection) {
    const variant = findVariant(product, selection);
    return variant ? Math.max(0, Math.floor(Number(variant.stock) || 0)) : 0;
  }
  return productStock;
}

// موجودی کل و وضعیت «ناموجود» را بعد از کسر دوباره هماهنگ می‌کند.
async function syncProductAvailability(productId) {
  const product = await Product.findById(productId).lean();
  if (!product) return;
  let stock = Math.max(0, Math.floor(Number(product.stock) || 0));
  if (Array.isArray(product.variants) && product.variants.length) {
    stock = product.variants.reduce((sum, variant) => sum + Math.max(0, Number(variant.stock) || 0), 0);
  }
  const update = { stock };
  if (stock <= 0) update.availability = "out";
  await Product.updateOne({ _id: productId }, { $set: update });
}

async function decrementItem(item) {
  const quantity = Math.max(1, Math.floor(Number(item.quantity) || 0));
  const product = await Product.findById(item.product).lean();
  if (!product) return;
  const variant = findVariant(product, item);
  if (variant) {
    const filter = {
      _id: product._id,
      variants: { $elemMatch: { storage: variant.storage || "", "color.name": variantColorName(variant), stock: { $gte: quantity } } },
    };
    const result = await Product.updateOne(filter, { $inc: { "variants.$.stock": -quantity, stock: -quantity } });
    if (!result.modifiedCount) {
      // موجودی از قبل کمتر از تعداد سفارش بوده (فروش هم‌زمان)؛ به صفر می‌رسد و منفی نمی‌شود.
      await Product.updateOne(
        { _id: product._id },
        { $set: { "variants.$[v].stock": 0 } },
        { arrayFilters: [{ "v.storage": variant.storage || "", "v.color.name": variantColorName(variant) }] },
      );
    }
  } else {
    const result = await Product.updateOne({ _id: product._id, stock: { $gte: quantity } }, { $inc: { stock: -quantity } });
    if (!result.modifiedCount) await Product.updateOne({ _id: product._id }, { $set: { stock: 0 } });
  }
  await syncProductAvailability(product._id);
}

// بعد از تأیید پرداخت، دقیقاً یک بار موجودی کالاهای سفارش کم می‌شود.
async function applyOrderStock(order) {
  const claim = await Order.updateOne({ _id: order._id, stockApplied: { $ne: true } }, { $set: { stockApplied: true } });
  if (!claim.modifiedCount) return false;
  for (const item of order.items || []) {
    try {
      await decrementItem(item);
    } catch (error) {
      console.error("Stock decrement error:", item.name, error.message);
    }
  }
  return true;
}

module.exports = { normalizeVariantValue, findVariant, availableStock, applyOrderStock };
