// پیش‌نویس محصول با هوش مصنوعی: بدون اتصال واقعی به OpenAI (HTTP ساختگی). ساختار درخواست، پاک‌سازی خروجی، خطاها و کارها بررسی می‌شوند.
const assert = require("assert");
const fs = require("fs");
const path = require("path");
process.env.OPENAI_API_KEY = "sk-test-0123456789abcdefghijkl";
delete process.env.OPENAI_BASE_URL;
const { getOpenAiBaseUrl } = require("../src/services/aiSettings");
const draft = require("../src/services/aiProductDraft");

const wrap = (obj, sources = [{ url: "https://example.com/spec?utm_source=x", title: "Spec" }, { url: "javascript:alert(1)", title: "bad" }]) => ({
  data: { output: [{ type: "web_search_call" }, { type: "message", content: [{ type: "output_text", text: JSON.stringify(obj), annotations: sources.map((s) => ({ type: "url_citation", ...s })) }] }] },
});
const good = {
  brand: "سامسونگ <b>", category: "موبایل", introTitle: "معرفی", description: "توضیح <script>x</script> کوتاه",
  specGroups: [{ title: "نمایشگر", subtitle: "", items: [{ label: "اندازه", value: "6.8 اینچ" }, { label: "", value: "حذف می‌شود" }] }, { title: "خالی", subtitle: "", items: [] }],
  compatibleModels: ["A", "a", "B"], reviewSections: [{ title: "باتری", content: "متن" }, { title: "بیرون از فهرست", content: "x" }],
  pros: ["الف"], cons: ["ب"], verdict: "خوب", verdictScore: 11, unverified: ["وزن"],
};

(async () => {
  // آدرس پایه
  assert.strictEqual(getOpenAiBaseUrl(), "https://api.openai.com");
  process.env.OPENAI_BASE_URL = "https://gw.example.com/openai/";
  assert.strictEqual(getOpenAiBaseUrl(), "https://gw.example.com/openai");
  process.env.OPENAI_BASE_URL = "http://insecure.example.com"; assert.strictEqual(getOpenAiBaseUrl(), "https://api.openai.com");
  process.env.OPENAI_BASE_URL = "https://user:pw@evil.example.com"; assert.strictEqual(getOpenAiBaseUrl(), "https://api.openai.com");
  process.env.OPENAI_BASE_URL = "https://gw.example.com";

  // طرح JSON سخت‌گیرانه: همهٔ کلیدها required و additionalProperties=false (شرط Structured Outputs)
  const walk = (node) => { if (node && node.type === "object") { assert.strictEqual(node.additionalProperties, false); assert.deepStrictEqual([...node.required].sort(), Object.keys(node.properties).sort()); Object.values(node.properties).forEach(walk); } if (node && node.type === "array") walk(node.items); };
  walk(draft.SCHEMA);
  for (const forbidden of ["price", "stock", "warranty", "discount"]) assert.ok(!(forbidden in draft.SCHEMA.properties), forbidden + " نباید در خروجی باشد");

  // ورودی
  const input = draft.normalizeInput({ name: "  گلکسی <i>S24</i> ", reviewProperties: "باتری\nباتری\n دوربین ،نمایشگر", useWeb: undefined });
  assert.strictEqual(input.name, "گلکسی S24"); assert.deepStrictEqual(input.reviewProperties, ["باتری", "دوربین", "نمایشگر"]); assert.ok(input.useWeb && input.wantSpecs && input.wantReview);
  assert.strictEqual(draft.normalizeInput({ name: "x", reviewProperties: "" }).wantReview, false);

  // درخواست موفق + پاک‌سازی
  const calls = [];
  const http = { post: async (url, body, opts) => { calls.push({ url, body, opts }); return wrap(good); } };
  const result = await draft.requestDraft(draft.normalizeInput({ name: "گلکسی S24", brand: "سامسونگ", reviewProperties: "باتری\nدوربین" }), { http });
  assert.strictEqual(calls[0].url, "https://gw.example.com/v1/responses");
  assert.strictEqual(calls[0].opts.headers.Authorization, "Bearer " + process.env.OPENAI_API_KEY);
  assert.deepStrictEqual(calls[0].body.tools, [{ type: "web_search" }]);
  assert.strictEqual(calls[0].body.text.format.type, "json_schema"); assert.strictEqual(calls[0].body.text.format.strict, true);
  assert.ok(/دوربین/.test(calls[0].body.input[1].content) && /گلکسی S24/.test(calls[0].body.input[1].content));
  assert.ok(!JSON.stringify(calls[0].body).includes(process.env.OPENAI_API_KEY), "کلید داخل بدنه نباشد");
  const d = result.draft;
  assert.strictEqual(d.brand, "سامسونگ"); assert.ok(!/[<>]/.test(d.description)); assert.strictEqual(d.category, "موبایل");
  assert.strictEqual(d.specGroups.length, 1); assert.strictEqual(d.specGroups[0].items.length, 1);
  assert.deepStrictEqual(d.compatibleModels, ["A", "B"]);
  assert.strictEqual(d.verdictScore, 10);
  assert.deepStrictEqual(d.missingReviewProperties, ["دوربین"], "پارامتر خواسته‌شده‌ای که بخش نگرفته گزارش می‌شود");
  assert.strictEqual(d.reviewSections.length, 2);
  assert.deepStrictEqual(result.sources, [{ url: "https://example.com/spec", title: "Spec" }], "فقط http(s) و بدون utm");

  // دستهٔ نامعتبر حذف؛ بدون جست‌وجو ابزار فرستاده نمی‌شود؛ بررسی نخواستن => بخش‌های بررسی خالی
  const noWeb = []; const http2 = { post: async (u, b) => { noWeb.push(b); return wrap({ ...good, category: "چیز دیگر" }); } };
  const r2 = await draft.requestDraft(draft.normalizeInput({ name: "x", useWeb: false, wantReview: false }), { http: http2 });
  assert.strictEqual(noWeb[0].tools, undefined); assert.strictEqual(r2.draft.category, ""); assert.strictEqual(r2.draft.reviewSections.length, 0); assert.strictEqual(r2.draft.verdictScore, null); assert.strictEqual(r2.webSearch, false);

  // اگر web_search پشتیبانی نشود، web_search_preview امتحان می‌شود
  const tools = [];
  const http3 = { post: async (u, b) => { tools.push(b.tools[0].type); if (b.tools[0].type === "web_search") { const e = new Error("x"); e.response = { status: 400, data: { error: { message: "Tool 'web_search' is not supported with this model" } } }; throw e; } return wrap(good); } };
  await draft.requestDraft(draft.normalizeInput({ name: "x" }), { http: http3 });
  assert.deepStrictEqual(tools, ["web_search", "web_search_preview"]);

  // خطاها: پیام فارسی روشن
  const fail = (status, code) => ({ post: async () => { const e = new Error("net"); if (status) e.response = { status, data: { error: { message: "m" } } }; if (code) e.code = code; throw e; } });
  for (const [status, code, re] of [[401, null, /نپذیرفت/], [403, null, /منطقه|دسترسی/], [429, null, /سهمیه|اعتبار/], [500, null, /HTTP 500/], [null, "ECONNABORTED", /مهلت/], [null, "ENOTFOUND", /اتصال/]]) {
    await assert.rejects(draft.requestDraft(draft.normalizeInput({ name: "x", useWeb: false }), { http: fail(status, code) }), (e) => re.test(e.message));
  }
  await assert.rejects(draft.requestDraft(draft.normalizeInput({ name: "x", useWeb: false }), { http: { post: async () => ({ data: { output: [] } }) } }), /قابل‌استفاده/);
  await assert.rejects(draft.requestDraft(draft.normalizeInput({ name: "x", useWeb: false }), { http: { post: async () => ({ data: { output_text: "not json" } }) } }), /ساختار/);
  // پشتیبانی از output_text در SDK/دروازه
  const viaText = await draft.requestDraft(draft.normalizeInput({ name: "x", useWeb: false }), { http: { post: async () => ({ data: { output_text: JSON.stringify(good) } }) } });
  assert.strictEqual(viaText.draft.brand, "سامسونگ");

  // کارها: شناسه، جداسازی مالک، یک کار فعال برای هر مالک، سقف روزانه
  draft._jobs.clear(); draft._usage.day = ""; draft._usage.count = 0;
  const slow = { post: () => new Promise((resolve) => setTimeout(() => resolve(wrap(good)), 80)) };
  const { id } = draft.startJob({ name: "محصول" }, "admin-1", { http: slow });
  assert.strictEqual(draft.getJob(id, "admin-1").status, "running");
  assert.strictEqual(draft.getJob(id, "admin-2"), null, "مالک دیگر نباید ببیند");
  assert.throws(() => draft.startJob({ name: "دوم" }, "admin-1", { http: slow }), (e) => e.statusCode === 429);
  assert.throws(() => draft.startJob({ name: "" }, "admin-3"), (e) => e.statusCode === 400);
  await new Promise((r) => setTimeout(r, 200));
  const done = draft.getJob(id, "admin-1"); assert.strictEqual(done.status, "done"); assert.strictEqual(done.result.draft.brand, "سامسونگ");
  const bad = draft.startJob({ name: "خطا" }, "admin-4", { http: fail(401) }); await new Promise((r) => setTimeout(r, 50));
  assert.strictEqual(draft.getJob(bad.id, "admin-4").status, "error"); assert.ok(/نپذیرفت/.test(draft.getJob(bad.id, "admin-4").message));
  process.env.AI_DRAFT_DAILY_LIMIT = "1"; draft._usage.count = 1;
  assert.throws(() => draft.startJob({ name: "سقف" }, "admin-5", { http: slow }), (e) => e.statusCode === 429 && /سقف/.test(e.message));
  delete process.env.AI_DRAFT_DAILY_LIMIT;

  // مسیرها و فرم ادمین
  const route = fs.readFileSync(path.join(__dirname, "../src/routes/adminAiProducts.js"), "utf8");
  assert.ok(route.includes('router.post("/product-draft"') && route.includes('router.get("/product-draft/:id"') && route.includes("router.use(adminSession)") && /requireAdmin/.test(route));
  const admin = fs.readFileSync(path.join(__dirname, "../views/admin-products.html"), "utf8");
  for (const id of ["aiDraftPanel", "aiReviewProps", "aiUseWeb", "aiDraftBtn", "aiDraftResult"]) assert.ok(admin.includes(`id="${id}"`), id);
  assert.ok(admin.includes("/admin/api/ai/product-draft") && !/sk-[A-Za-z0-9]{16}/.test(admin), "فرم نباید کلید داشته باشد");
  console.log("AI product draft test passed.");
  process.exit(0);
})().catch((error) => { console.error(error); process.exit(1); });
