// قانون «فقط فارسی» برای اطلاعات شخصی و آدرس: هر حرف لاتین (A-Z, a-z) ممنوع است.
// ارقام (فارسی/انگلیسی/عربی)، فاصله و علامت‌ها (- / . ، ,) مجازند تا پلاک و واحد نوشته شود.
const LATIN_LETTER = /[A-Za-z]/;

const hasLatinLetters = (value) => LATIN_LETTER.test(String(value == null ? "" : value));

const FA_ONLY_MESSAGE = "فقط با حروف فارسی وارد کنید";

// تکه‌ای برای زنجیرهٔ express-validator: .custom(faOnly)
const faOnly = (value) => {
  if (hasLatinLetters(value)) throw new Error(FA_ONLY_MESSAGE);
  return true;
};

module.exports = { hasLatinLetters, faOnly, FA_ONLY_MESSAGE };
