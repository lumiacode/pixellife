// وقتی ادمین محصولی را ذخیره/حذف می‌کند، کش‌های کوتاه‌مدت (کاتالوگ، سئو، پیشنهاد جست‌وجو) همان لحظه خالی می‌شوند
// تا متن قدیمی (مثلاً توضیحی که پاک شده) دیگر نمایش داده نشود.
const clearers = new Set();
function onProductChange(fn) { clearers.add(fn); }
function clearProductCaches() {
  clearers.forEach((fn) => { try { fn(); } catch (_) { /* کش اختیاری است */ } });
}
module.exports = { onProductChange, clearProductCaches };
