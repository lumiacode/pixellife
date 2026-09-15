const express = require("express");
const path = require("path");
const router = express.Router();
const homeController = require("../controllers/homeController");

router.get("/", homeController.index);
router.get("/contact", homeController.contact);
router.post("/api/contact", homeController.submitContact);
router.get("/mobiles", homeController.mobiles);
// یک آدرس اصلی برای کاتالوگ موبایل؛ لینک‌ها و نتایج قدیمی گوگل
// با ریدایرکت دائمی به همان صفحهٔ واحد منتقل می‌شوند.
router.get(["/mobile", "/mobile.html", "/mobiles.html"], (req, res) =>
  res.redirect(301, "/mobiles"),
);
router.get("/mobile/samsung", (req, res) => res.redirect(301, "/samsung"));
router.get("/mobile/xiaomi", (req, res) => res.redirect(301, "/xiaomi"));
router.get("/categories", homeController.categories);
router.get("/login", homeController.login);
router.get("/cart", homeController.cart);
router.get("/mobile/apple", homeController.iphone);
router.get("/iphone", homeController.iphone);
router.get("/product", homeController.product);
// Backward-compatible alias for links/bookmarks using the old .html path.
router.get("/product.html", homeController.product);
router.get("/samsung", homeController.samsung);
router.get("/xiaomi", homeController.xiaomi);
router.get("/accessories", homeController.accessoriesAll);
router.get("/accessories/chargers", homeController.accessoriesChargers);
router.get("/accessories/apple", homeController.accessoriesApple);
router.get("/accessories/samsung", homeController.accessoriesSamsung);
router.get("/accessories/xiaomi", homeController.accessoriesXiaomi);
router.get("/ipad", homeController.ipad);
router.get("/tablets", homeController.tablets);
router.get("/samsungtab", homeController.samsungtab);
router.get("/xiaomitab", homeController.xiaomitab);
router.get("/headphones", homeController.headphones);
router.get("/smartwatches", homeController.smartwatches);
router.get("/console", homeController.console);
router.get("/amazing", homeController.amazing);

// Keep shared header/footer links valid until their dedicated pages are added.
router.get("/offers", (req, res) => res.redirect(302, "/amazing"));
router.get("/new", homeController.mobiles);
router.get("/bestsellers", homeController.mobiles);
router.get("/brands", homeController.mobiles);
router.get("/blog", homeController.index);
router.get("/support", homeController.contact);
router.get("/terms", homeController.terms);
router.get("/profile", homeController.profile);
router.get("/profile/orders", homeController.profile);
router.get("/profile/wishlist", homeController.profile);
router.get("/profile/addresses", homeController.profile);
router.get("/profile/wallet", homeController.profile);

module.exports = router;
