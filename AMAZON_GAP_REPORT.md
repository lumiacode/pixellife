# گزارش فاصلهٔ «پیکسل لایف» تا یک بازارگاه شبیه آمازون

> روش: فقط خواندن کد (بدون تغییر در سایت). هر ادعا با مسیر فایل همراه است؛ اگر چیزی پیدا نشد، نوشته شده «پیدا نشد». روی سایت زنده یا پایگاه دادهٔ واقعی چیزی اجرا نشد.

## ۱. ساختار پروژه (خلاصه)

| بخش | محتوا |
|---|---|
| `src/app.js` | تنها نقطهٔ ورود Express؛ میدل‌ویرها، همهٔ روت‌ها، سایت‌مپ، صفحهٔ ۴۰۴، `setInterval` برای جاروی سفارش‌ها |
| `src/models/` (۱۳ مدل) | `User`, `Product`, `Order`, `review` (Review), `Address`, `DiscountCode`, `Wallet`, `WalletTopup`, `WalletTransaction`, `OTP`, `Setting`, `BehaviorEvent`, `AnalyticsDaily`, `ContactMessage` |
| `src/routes/` | `products.js` (کاتالوگ/جست‌وجو/پیشنهاد/پرفروش‌ترین)، `productPage.js` (HTML + سئو)، `orders.js`, `checkout.js`, `zarinpalPayments.js`, `balePayments.js`, `wallet.js`, `reviewRoutes.js`, `adminApi.js` (~۱۰۰۰+ خط)، `admin.js`, `adminDiscounts.js`, `adminAiProducts.js`, `aiAssistant.js`, `analytics.js`, `authRoutes.js`, `addressRoutes.js`, `testEmail.js` |
| `src/services/` | `checkoutPricing.js` (قیمت‌گذاری سمت سرور)، `inventory.js`, `orderExpiry.js`, `orderTracking.js`, `wallet.js`, `reviewStats.js`, `seo.js`, `otpService.js`, `smsService.js`, `shippingSettings.js`, `cacheBus.js`, … |
| `src/middleware/` | `authMiddleware.js` (`protect`, بررسی `role`)، `adminAuth.js`, `adminSession.js`, `aiLimiter.js`, `visitTracker.js`, `errorHandler.js` |
| فرانت | `views/*.html` (HTML با CSS/JS درون‌خطی)، `public/js`, `public/css`؛ تزریق منابع مشترک از `src/controllers/homeController.js` |
| اجرا | pm2 تک‌نمونه (`ecosystem.config.js`، بدون cluster)، nginx، MongoDB Atlas |

## ۲. جدول وضعیت مؤلفه‌ها

| # | مؤلفه | وضعیت | شواهد در کد | کمبود |
|---|---|---|---|---|
| 1 | مدل فروشنده | **وجود ندارد** | `User.role` فقط `enum: ["user","admin"]` (`src/models/User.js:48`)؛ در `Product.js` و `Order.js` فیلد `seller`/`vendor` پیدا نشد | مدل Seller، مالکیت محصول، سفارش‌های جدا |
| 1 | پنل فروشنده | **وجود ندارد** | فقط پنل ادمین (`views/admin-*.html`, `src/routes/adminApi.js`) | ورود/پنل مجزا با محدودیت دسترسی به محصولات خود |
| 1 | تأیید فروشنده | **وجود ندارد** | پیدا نشد | گردش ثبت‌نام و تأیید مدارک |
| 1 | کمیسیون | **وجود ندارد** | پیدا نشد | قاعدهٔ کمیسیون بر دسته/فروشنده |
| 1 | سفارش چندفروشنده‌ای | **وجود ندارد** | `Order.items[]` بدون فروشنده؛ یک سفارش یک ارسال (`shippingMethod` یگانه) | تفکیک زیرسفارش (sub-order) |
| 1 | تسویه با فروشنده | **وجود ندارد** | `Wallet*` فقط برای مشتری (`src/services/wallet.js`) | حساب فروشنده، دفتر تسویه |
| 2 | واریانت | **ناقص** | `Product.variants[]` (حافظه+رنگ+موجودی+قیمت اختیاری) با `findVariant` در `src/services/inventory.js` | `_id` واریانت غیرفعال (`_id:false`)، تطبیق با رشتهٔ نام رنگ (نه کلید پایدار) |
| 2 | SKU | **وجود ندارد** | فقط `legacyId`/`slug` (`Product.js`)؛ `sku` پیدا نشد | کد SKU برای هر واریانت |
| 2 | فیلتر چندبُعدی | **ناقص** | `GET /api/products` فقط `brand`, `category`, `featured`, `amazing`, `search`, `exclude` (`src/routes/products.js:151-236`) | فیلتر قیمت، رنگ، حافظه، امتیاز، موجودی، ویژگی‌های فنی |
| 2 | مرتب‌سازی | **ناقص** | فقط `price-asc`/`price-desc`/پیش‌فرض (همان فایل، خط ~۲۳۵) | پرفروش‌ترین/جدیدترین/امتیاز |
| 2 | صفحه‌بندی | **ناقص** | فقط `limit` (`safeLimit`، حداکثر ۱۰۰) بدون `skip/page` | صفحه‌بندی واقعی (cursor/offset) |
| 2 | غلط‌یاب | **وجود ندارد** | فقط نرمال‌سازی «ی/ک» و نام‌های مستعار برند (`SUGGEST_ALIASES`, `tokenPattern`) | تحمل غلط املایی/فاصلهٔ ویرایش |
| 2 | ایندکس جست‌وجو | **ناقص** | جست‌وجو با `$regex` روی `name`/`brand` (`suggestFilter`)؛ ایندکس‌های محصول فقط `{category,featured,createdAt}`, `{category,price}`, `slug`, `legacyId` | بدون ایندکس متنی/Atlas Search؛ regex بدون لنگر = اسکن کامل |
| 2 | مقایسهٔ محصولات | **وجود ندارد** | پیدا نشد | صفحه و API مقایسه |
| 2 | قیمت چندفروشنده | **وجود ندارد** | هر محصول یک `price` | «سایر فروشنده‌ها» (Offer) |
| 3 | نظرات و امتیاز | **ناقص** | `src/models/review.js`, `src/routes/reviewRoutes.js`, `src/services/reviewStats.js`؛ تأیید ادمین (`status`), یک نظر برای هر کاربر/محصول (ایندکس یکتا)، `pros/cons`, پاسخ فروشگاه (`reply`) | `verified` همیشه `false` (خط ۷۶) – بررسی خرید وجود ندارد؛ `helpful` فقط فیلد است (روت رأی «مفید بود» پیدا نشد)؛ `productId` رشته است نه ObjectId؛ تصویر نظر پیدا نشد |
| 3 | پرسش و پاسخ | **وجود ندارد** | پیدا نشد | مدل و روت پرسش/پاسخ |
| 3 | خریدار تأییدشده | **وجود ندارد** | فیلد `verified` هست ولی هرگز محاسبه نمی‌شود | تطبیق با سفارش `paid/delivered` |
| 3 | پیشنهاد شخصی‌سازی‌شده | **ناقص** | `BehaviorEvent` و `recordBehaviorEvent` رویداد جمع می‌کنند (`src/services/behaviorAnalytics.js`)؛ «محصولات مشابه» در `views/product.html` (`relatedSlider`) | رویدادها فقط برای تحلیل ادمین‌اند؛ پیشنهاد فردی/«کسانی که این را خریدند» پیدا نشد |
| 4 | موجودی و انبار | **ناقص** | `src/services/inventory.js` (`applyOrderStock` با پرچم اتمیک `stockApplied`)؛ موجودی هم‌زمان در `stock` و `variants[].stock` | کسر فقط بعد از پرداخت؛ **رزرو موجودی هنگام ثبت سفارش وجود ندارد**؛ در کمبود هم‌زمان، موجودی به صفر می‌رسد و سفارش پرداخت‌شده برگشت نمی‌خورد (خطوط ~۷۱–۸۰)؛ بازگرداندن موجودی هنگام لغو/مرجوعی پیدا نشد؛ چند انبار ندارد |
| 4 | رهگیری مرحله‌ای | **کامل (در حد تک‌فروشنده)** | `Order.statusHistory`, `trackingSteps`, `src/services/orderTracking.js`, `GET /api/orders/:ref` | کد رهگیری پست/باربری و لینک شرکت حمل پیدا نشد |
| 4 | بازگشت کالا و استرداد | **ناقص** | ادمین می‌تواند وضعیت را `returned` بگذارد و `walletService.refundOrder` مبلغ را به کیف پول برمی‌گرداند (`src/routes/adminApi.js:~1074–1086`, `src/services/wallet.js`) | درخواست بازگشت از طرف مشتری، دلیل، بازهٔ مجاز، استرداد به کارت/درگاه پیدا نشد (فقط کیف پول) |
| 5 | عضویت ویژه | **وجود ندارد** | پیدا نشد | پلن اشتراک و مزایا |
| 5 | امتیاز/باشگاه | **وجود ندارد** | پیدا نشد؛ `DiscountCode` فقط کد تخفیف | کسب/مصرف امتیاز، سطح‌بندی |
| 5 | کیف پول | **کامل** | `Wallet`, `WalletTransaction`, `WalletTopup`, `src/routes/wallet.js`; عملیات اتمیک (`findOneAndUpdate` با `$gte`) | سقف/ضدتقلب پیشرفته پیدا نشد |
| 6 | کش (Redis) | **وجود ندارد** | فقط `Map` درون‌حافظه: `catalogResponseCache`, `suggestCache`, کش `productPage.js`؛ ابطال با `cacheBus` | با چند پروسه/سرور ناهماهنگ می‌شود؛ با ری‌استارت پاک می‌شود |
| 6 | صف پیام | **وجود ندارد** | پیدا نشد؛ کارها inline اجرا می‌شوند | صف برای پیامک/ایمیل/تسویه |
| 6 | CDN/بهینه‌سازی تصویر | **ناقص** | `sharp` + `src/utils/productImages.js`، مسیر `/api/products/image/:id?w=`؛ nginx بدون CDN | CDN، فرمت‌های AVIF/WebP روی همهٔ تصاویر |
| 6 | صفحه‌بندی | **ناقص** | (بالا) | — |
| 6 | ایندکس‌های Mongo | **ناقص** | `Order`: `{user,createdAt}`, `{status,createdAt}`؛ `Review`: `{productId,date}` + یکتا | `Product` بدون ایندکس روی `brand`, `name`, `amazingOffer`, `stock`, `updatedAt`؛ `User.mobile` یکتا ولی بررسی کامل نشد |
| 6 | لاگ/مانیتورینگ | **ناقص** | `console.error/log`، pm2 `time: true`؛ تحلیل بازدید داخلی (`visitTracker`, `AnalyticsDaily`) | winston/pino، Sentry، هشدار، health-check پیدا نشد |
| 6 | اعلان‌ها | **ناقص** | پیامک فقط برای OTP (`smsService` در `otpService.js`)؛ `mailer.js` فقط در `testEmail.js` | پیامک/ایمیل وضعیت سفارش، Push پیدا نشد |

## ۳. مشکلات فنی و امنیتی (به ترتیب شدت)

### بحرانی / بالا
1. **`POST /api/test-email` بدون احراز هویت** (`src/app.js` خط ~۲۸۰، `src/routes/testEmail.js`): هر کسی می‌تواند به هر آدرس ایمیل بفرستد؛ ابزار اسپم با دامنهٔ شما. خود کد نوشته «موقت… حذف شود».
2. **نبود رزرو موجودی + شرایط رقابتی**: `buildQuote` موجودی را هنگام ثبت می‌سنجد ولی کسر فقط پس از پرداخت است (`applyOrderStock`). دو نفر می‌توانند آخرین کالا را همزمان پرداخت کنند؛ هر دو سفارش `paid` می‌شود و موجودی بی‌صدا به ۰ می‌رسد (`inventory.js` خطوط ~۷۱–۸۰). فروش بیش از موجودی.
3. **ورود ادمین ضعیف** (`src/routes/admin.js` خطوط ۳۴–۴۴): یک رمز مشترک از `.env`، مقایسه با `===` (نه زمان‌ثابت)، بدون محدودیت تعداد تلاش، بدون حساب جدا برای هر ادمین/لاگ حسابرسی. `rate-limit` فقط برای AI وجود دارد (`aiLimiter.js`).
4. **رمز پیش‌فرض نشست** (`src/app.js` خط ~۱۲۰ و `adminSession.js`): اگر `SESSION_SECRET` تنظیم نشده باشد، رمز ثابت در کد است؛ ضمناً دو نمونهٔ `express-session` با رمزهای پیش‌فرض متفاوت وجود دارد و نشست‌ها در MemoryStore (با ری‌استارت پاک، در پروسهٔ تکی). `cookie.secure` تنظیم نشده.
5. **راز عبور تعمیرات در کد**: `maintenance_bypass` با مقدار ثابت در `src/app.js` خطوط ~۱۴۹–۱۶۰ (و در تاریخچهٔ گیت).

### متوسط
6. **`cors()` بدون محدودیت** (`src/app.js:75`) و **نبود `helmet`** (هدرهای امنیتی CSP/HSTS/X-Frame-Options).
7. **تزریق NoSQL/ReDoS**: `/api/products` و `/search` ورودی کاربر را در `$regex` می‌دهند. بخش `suggest` ورودی را escape می‌کند، اما `brand`/`category` (`products.js` خطوط ~۱۸۶–۲۰۰ و `categoryPattern`) را باید بازبینی کرد؛ همچنین `exclude` مستقیم در `_id` می‌رود (خطای cast ممکن). `express.urlencoded({extended:true})` ورودی آبجکتی (`{$gt:…}`) را می‌پذیرد؛ `express-mongo-sanitize` یا اعتبارسنجی schema پیدا نشد.
8. **اعتبارسنجی نظر**: `JSON.parse` ورودی `pros/cons` داخل try/catch کلی است ولی لیست‌ها طول/تعداد ندارند؛ `productId` نظر اعتبارسنجی نمی‌شود (می‌توان برای محصول ناموجود نظر ثبت کرد).
9. **عدم تراکنش در ثبت سفارش** (`src/routes/orders.js`): `supersedePendingOrders` ← رزرو تخفیف ← `Order.create` چند نوشتن جدا هستند؛ جبران فقط با `catch` دستی. `startSession/withTransaction` در کل پروژه پیدا نشد.
10. **هم‌ترازی `stock` و `variants[].stock`** با دو `updateOne` جدا و `syncProductAvailability` (خواندن+نوشتن) → احتمال ناهماهنگی در کسر هم‌زمان.
11. **کش درون‌حافظه با ری‌استارت ۳۵۰MB** (`max_memory_restart`): کش و MemoryStore نشست ادمین هر ری‌استارت پاک می‌شود؛ در آینده cluster ممکن نیست.
12. **جست‌وجوی regex بدون ایندکس**: با رشد کاتالوگ، هر تایپ (suggest) یک اسکن کامل می‌شود (کشِ ۲۰ ثانیه‌ای فقط جزئی کمک می‌کند).

### پایین
13. **توکن JWT قابل ابطال نیست** (۳۰ روز) – خروج فقط کوکی را پاک می‌کند.
14. **`orderNumber` بر پایهٔ `Date.now()` و عدد تصادفی ۴ رقمی** (`Order.js` pre-validate): در بار بالا احتمال برخورد (اگرچه ایندکس یکتا جلوی تکرار را می‌گیرد و خطا می‌دهد).
15. **`console.error` به‌جای لاگ ساختاریافته**؛ خطاهای پرداخت/موجودی فقط در لاگ pm2 می‌مانند.
16. **`BehaviorEvent` با TTL** مناسب است، اما `productId` رشته و ایندکس‌های زیاد؛ هزینهٔ نوشتن در هر رویداد.

## ۴. نقشهٔ راه سه‌مرحله‌ای

### مرحلهٔ ۱ — پایه‌های بازارگاه (چندفروشندگی، نظرات، جست‌وجوی پیشرفته)
| کار | حجم | وابستگی |
|---|---|---|
| ۱-الف: مدل `Seller`، نقش `seller`، ثبت‌نام و تأیید ادمین، `Product.seller`، فیلتر دسترسی در `adminApi`/روت‌های محصول | زیاد | — |
| ۱-ب: پنل فروشنده (محصول/موجودی/سفارش‌های خودش) | زیاد | ۱-الف |
| ۱-ج: `Order.items[].seller` + تفکیک `SubOrder` برای ارسال و وضعیت هر فروشنده | زیاد | ۱-الف |
| ۱-د: `Commission` ساده (درصد بر دسته/فروشنده) و دفتر `SellerLedger` | متوسط | ۱-ج |
| ۱-ه: نظرات: محاسبهٔ `verified` از سفارش، رأی «مفید بود»، محدودیت‌های اعتبارسنجی، `productId` به ObjectId | کم–متوسط | — (مستقل) |
| ۱-و: جست‌وجو: ایندکس متنی/Atlas Search، فیلتر قیمت/رنگ/حافظه/امتیاز/موجودی، مرتب‌سازی بیشتر، صفحه‌بندی | متوسط | — (مستقل) |
| ۱-ز: رفع مشکلات بحرانی بخش ۳ (test-email، رزرو موجودی، ورود ادمین، رمز نشست، CORS/helmet) | کم–متوسط | **باید پیش از ۱-الف انجام شود** |

### مرحلهٔ ۲ — اعتماد و عملیات
| کار | حجم | وابستگی |
|---|---|---|
| ۲-الف: پرسش و پاسخ | کم–متوسط | ۱-ه |
| ۲-ب: درخواست بازگشت از سوی مشتری + استرداد به درگاه | متوسط | ۱-ج |
| ۲-ج: Redis برای کش و نشست، صف (BullMQ) برای پیامک/ایمیل | متوسط | — |
| ۲-د: اعلان وضعیت سفارش (پیامک/ایمیل) | کم | ۲-ج |
| ۲-ه: مقایسهٔ محصولات و «سایر فروشنده‌ها» (چند Offer برای یک محصول) | متوسط–زیاد | ۱-الف، ۱-ج |
| ۲-و: لاگ ساختاریافته + Sentry + health-check | کم | — |

### مرحلهٔ ۳ — رشد و وفاداری
| کار | حجم | وابستگی |
|---|---|---|
| ۳-الف: باشگاه مشتریان (امتیاز، سطح) و عضویت ویژه | متوسط–زیاد | کیف پول (موجود) |
| ۳-ب: پیشنهاد شخصی‌سازی‌شده از `BehaviorEvent` | زیاد | ۲-ج |
| ۳-ج: CDN و تصاویر AVIF/WebP، چند انبار | متوسط | — |
| ۳-د: تسویهٔ خودکار با فروشنده | زیاد | ۱-د، ۲-ج |
| ۳-ه: cluster/افقی‌سازی | متوسط | ۲-ج |

## ۵. تغییرات پیشنهادی مدل‌های داده (فقط طرح)

```js
// Seller (جدید)
{ user: ObjectId→User (unique), storeName, slug (unique), status: pending|active|suspended,
  commissionRate: Number, payout: { iban, holder }, createdAt }

// User: role enum += "seller"  ·  seller: ObjectId→Seller (اختیاری)

// Product
+ seller: ObjectId→Seller (index)
+ variants[]: _id فعال، sku (unique sparse), attributes: { color, storage, ... }
+ ratingAvg, ratingCount (به‌جای rating/reviewCount فعلی)
+ index: { brand:1 }, { seller:1, createdAt:-1 }, { amazingOffer:1, featured:-1 }, text index بر name/brand

// Offer (برای قیمت چندفروشنده؛ مرحلهٔ ۲)
{ product, seller, variantSku, price, stock, handlingDays, status }

// Order  →  SubOrder (جدید)
Order: + subOrders: [ObjectId→SubOrder]
SubOrder: { order, seller, items[], subtotal, commission, status, trackingCode, carrier, statusHistory[] }
OrderItem: + sku, + seller, + reservedUntil

// StockReservation (جدید، TTL)
{ product, sku, order, qty, expiresAt (TTL index) }

// SellerLedger (جدید)
{ seller, subOrder, type: sale|commission|refund|payout, amount, balanceAfter, createdAt }

// Review
+ product: ObjectId (به‌جای productId رشته)، order: ObjectId (برای verified)، images[], helpfulBy: [userId]
// Question/Answer (جدید)
{ product, user, text, status, answers: [{ user|seller, text, official }] }

// ReturnRequest (جدید)
{ order, item, user, reason, status, refundMethod: wallet|gateway, amount }
```

## ۶. سؤال‌هایی که برای تصمیم‌گیری لازم دارم

1. **هدف کسب‌وکار:** واقعاً می‌خواهید فروشندهٔ خارجی داشته باشید (بازارگاه) یا همان تک‌فروشنده با تجربهٔ شبیه آمازون (فیلتر/نظر/جست‌وجو قوی)؟ این تصمیم هزینهٔ مرحلهٔ ۱ را چند برابر عوض می‌کند.
2. **قانون:** برای فروش چندفروشنده‌ای در ایران، آیا مجوز/نماد (اینماد) و فرایند احراز هویت فروشنده را در نظر گرفته‌اید؟ مسئولیت مرجوعی و گارانتی با کیست؟
3. **تسویه و کمیسیون:** درصد کمیسیون، دورهٔ تسویه، روش پرداخت به فروشنده؟ آیا درگاه شما تسهیم (Split Payment) پشتیبانی می‌کند؟
4. **موجودی:** رزرو هنگام ثبت سفارش (مدت ۱۰ دقیقه مثل مهلت پرداخت فعلی) قابل قبول است؟
5. **نظرات:** فقط خریدار تأییدشده نظر بدهد یا همه (با برچسب)؟ تصویر/ویدیو در نظرات لازم است؟
6. **جست‌وجو:** آیا از Atlas Search (روی MongoDB Atlas فعلی) استفاده کنیم یا موتور جدا (Meilisearch/Elasticsearch)؟ هزینهٔ سرور چقدر مجاز است؟
7. **زیرساخت:** برای Redis/صف، سرور بیشتری دارید یا باید روی همان VPS اجرا شود؟ رم فعلی (محدودیت ۳۵۰MB) برای این کار کافی نیست.
8. **امنیت:** اجازه می‌دهید ابتدا مشکلات بحرانی (بخش ۳، موارد ۱–۵) را بدون تغییر ظاهر سایت رفع کنم؟
9. **حذف یا محافظت `test-email`:** ایمیل Zoho هنوز لازم است یا مسیر حذف شود؟
10. **ارسال و رهگیری:** از چه شرکت حمل‌ونقلی استفاده می‌کنید و آیا API رهگیری دارد؟

---
*این گزارش فقط بر اساس خواندن کد تهیه شده است؛ داده‌های واقعی سایت (حجم محصول، ترافیک، سفارش‌ها) و تنظیمات سرور (nginx، متغیرهای `.env`) بررسی نشده‌اند.*
