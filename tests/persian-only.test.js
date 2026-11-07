// قانون «فقط فارسی» برای نام، استان، شهر، آدرس، نام گیرنده و عنوان آدرس (سمت سرور).
const assert = require("assert");
const { validationResult } = require("express-validator");
const { hasLatinLetters } = require("../src/utils/persianText");
const { completeProfileValidator } = require("../src/validators/authValidator");
const { createAddressValidator, updateAddressValidator } = require("../src/validators/addressValidator");

assert.strictEqual(hasLatinLetters("ساسان"), false);
assert.strictEqual(hasLatinLetters("خیابان رحمانی - پلاک ۸۰ / 188"), false, "ارقام و علامت‌ها مجازند");
assert.strictEqual(hasLatinLetters("Sasan"), true);
assert.strictEqual(hasLatinLetters("ساسان A"), true);

const run = async (validators, body) => {
  const req = { body: JSON.parse(JSON.stringify(body)) };
  for (const v of validators) await v.run(req);
  return validationResult(req).array().map((e) => e.msg);
};

const goodProfile = { firstName: "ساسان", lastName: "هدایت", address: { province: "تهران", city: "تهران", fullAddress: "تهرانپارس غربی، خیابان رحمانی، پلاک ۸۰", postalCode: "1655815916" } };
const goodAddress = { province: "تهران", city: "تهران", fullAddress: "تهرانپارس غربی، خیابان رحمانی، پلاک ۸۰", postalCode: "1655815916", receiverName: "ساسان هدایت", title: "منزل" };

(async () => {
  assert.deepStrictEqual(await run(completeProfileValidator, goodProfile), []);
  assert.deepStrictEqual(await run(createAddressValidator, goodAddress), []);
  assert.deepStrictEqual(await run(updateAddressValidator, goodAddress), []);

  let errs = await run(completeProfileValidator, { ...goodProfile, firstName: "Sasan" });
  assert.ok(errs.some((m) => /فارسی/.test(m)), "نام لاتین رد شود: " + errs);
  errs = await run(completeProfileValidator, { ...goodProfile, lastName: "هدایتH" });
  assert.ok(errs.some((m) => /فارسی/.test(m)));
  errs = await run(completeProfileValidator, { ...goodProfile, address: { ...goodProfile.address, city: "Tehran" } });
  assert.ok(errs.some((m) => /شهر/.test(m)));
  errs = await run(completeProfileValidator, { ...goodProfile, address: { ...goodProfile.address, fullAddress: "Tehran street number 10" } });
  assert.ok(errs.some((m) => /آدرس/.test(m)));

  for (const [field, label] of [["province", "استان"], ["city", "شهر"], ["fullAddress", "آدرس"], ["receiverName", "نام گیرنده"], ["title", "عنوان"]]) {
    for (const validators of [createAddressValidator, updateAddressValidator]) {
      errs = await run(validators, { ...goodAddress, [field]: field === "fullAddress" ? "Valiasr street 123456" : "Latin" });
      assert.ok(errs.some((m) => m.includes(label) && /فارسی/.test(m)), `${field} لاتین باید رد شود: ${errs}`);
    }
  }
  console.log("persian-only tests passed");
})().catch((e) => { console.error(e); process.exit(1); });
