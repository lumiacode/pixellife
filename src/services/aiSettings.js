// کلید و مدل OpenAI: از پنل ادمین (/admin/ai) یا متغیرهای محیطی OPENAI_API_KEY / OPENAI_MODEL.
// کلیدِ ثبت‌شده در پنل هرگز به مرورگر برنمی‌گردد (فقط چهار نویسهٔ آخر) و در دیتابیس رمزنگاری‌شده (AES-256-GCM) ذخیره می‌شود؛
// کلید رمزنگاری از JWT_SECRET (یا AI_SETTINGS_SECRET) ساخته می‌شود، پس نشت دیتابیس به‌تنهایی کلید را فاش نمی‌کند.
const crypto = require("crypto");
const mongoose = require("mongoose");
const ApiError = require("../utils/ApiError");

const KEY = "ai";
const CACHE_TTL_MS = 10 * 1000;
const DEFAULT_MODEL = "gpt-4o-mini";
const KEY_RE = /^sk-[A-Za-z0-9._\-]{16,300}$/;
const MODEL_RE = /^[A-Za-z0-9._:\-]{2,60}$/;

let cache = { value: null, expires: 0 };
const resetAiCache = () => { cache = { value: null, expires: 0 }; };

const secretKey = () => {
  const secret = process.env.AI_SETTINGS_SECRET || process.env.JWT_SECRET || "";
  return secret ? crypto.createHash("sha256").update("pl-ai-settings:" + secret).digest() : null;
};

function encrypt(text) {
  const key = secretKey();
  if (!key) throw new ApiError(500, "کلید رمزنگاری سرور (JWT_SECRET) تنظیم نشده است؛ ذخیرهٔ امن ممکن نیست");
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const enc = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), enc]).toString("base64");
}

function decrypt(payload) {
  const key = secretKey();
  if (!key || !payload) return "";
  try {
    const raw = Buffer.from(String(payload), "base64");
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, raw.subarray(0, 12));
    decipher.setAuthTag(raw.subarray(12, 28));
    return Buffer.concat([decipher.update(raw.subarray(28)), decipher.final()]).toString("utf8");
  } catch (_) {
    return ""; // JWT_SECRET عوض شده یا داده خراب است؛ مثل «ثبت‌نشده» رفتار می‌شود
  }
}

const mask = (key) => (key ? "sk-…" + key.slice(-4) : "");

async function readStored() {
  if (mongoose.connection.readyState !== 1) return {};
  try {
    const Setting = require("../models/Setting");
    const doc = await Setting.findOne({ key: KEY }).lean();
    return (doc && doc.value) || {};
  } catch (_) { return {}; }
}

// مقدار نهایی برای استفاده در درخواست‌ها: { apiKey, model, source }
async function getAiConfig() {
  if (cache.value && cache.expires > Date.now()) return cache.value;
  const stored = await readStored();
  const panelKey = decrypt(stored.apiKeyEnc);
  const panelModel = MODEL_RE.test(String(stored.model || "")) ? stored.model : "";
  const envKey = process.env.OPENAI_API_KEY || "";
  const value = {
    apiKey: panelKey || envKey,
    model: panelModel || process.env.OPENAI_MODEL || DEFAULT_MODEL,
    source: panelKey ? "panel" : envKey ? "env" : "none",
  };
  cache = { value, expires: Date.now() + CACHE_TTL_MS };
  return value;
}

// نمای امن برای پنل ادمین (بدون کلید)
async function getAiPublicView() {
  const cfg = await getAiConfig();
  return { hasKey: Boolean(cfg.apiKey), masked: mask(cfg.apiKey), source: cfg.source, model: cfg.model, defaultModel: DEFAULT_MODEL };
}

// input: { apiKey?: string (خالی/نبودن = بدون تغییر), clearKey?: boolean, model?: string }
async function saveAiSettings(input = {}) {
  const Setting = require("../models/Setting");
  const current = await readStored();
  const next = { apiKeyEnc: current.apiKeyEnc || "", model: current.model || "" };

  if (input.clearKey === true || input.clearKey === "true") next.apiKeyEnc = "";
  const rawKey = typeof input.apiKey === "string" ? input.apiKey.trim() : "";
  if (rawKey) {
    if (!KEY_RE.test(rawKey)) throw new ApiError(400, "کلید معتبر نیست؛ باید با sk- شروع شود و بدون فاصله و کاراکتر اضافه باشد");
    next.apiKeyEnc = encrypt(rawKey);
  }
  if (input.model !== undefined) {
    const model = String(input.model || "").trim();
    if (model && !MODEL_RE.test(model)) throw new ApiError(400, "نام مدل معتبر نیست (مثلاً gpt-4o-mini)");
    next.model = model;
  }
  await Setting.updateOne({ key: KEY }, { $set: { value: next } }, { upsert: true });
  resetAiCache();
  return getAiPublicView();
}

// آزمایش اتصال با کلید فعلی (بدون مصرف توکن): فهرست مدل‌ها را می‌خواند
async function testAiConnection() {
  const { apiKey } = await getAiConfig();
  if (!apiKey) throw new ApiError(400, "هنوز کلیدی ثبت نشده است");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch("https://api.openai.com/v1/models?limit=1", { headers: { Authorization: `Bearer ${apiKey}` }, signal: controller.signal });
    if (response.status === 401) throw new ApiError(400, "OpenAI کلید را نپذیرفت (۴۰۱)؛ کلید را دوباره بررسی کنید");
    if (response.status === 429) throw new ApiError(400, "کلید معتبر است ولی سهمیه یا اعتبار حساب OpenAI تمام شده (۴۲۹)");
    if (!response.ok) throw new ApiError(502, `پاسخ نامنتظر از OpenAI (HTTP ${response.status})`);
    return { ok: true };
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(502, error.name === "AbortError" ? "پاسخی از OpenAI نیامد (مهلت تمام شد)؛ دسترسی سرور به api.openai.com را بررسی کنید" : "اتصال سرور به OpenAI برقرار نشد؛ ممکن است دسترسی از این سرور بسته باشد");
  } finally {
    clearTimeout(timer);
  }
}

module.exports = { DEFAULT_MODEL, getAiConfig, getAiPublicView, saveAiSettings, testAiConnection, resetAiCache, encrypt, decrypt, mask };
