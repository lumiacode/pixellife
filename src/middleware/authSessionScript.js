// اسکریپت هم‌سازی نشست در همهٔ صفحه‌های HTML عمومی تزریق می‌شود (بجز پنل ادمین):
// دکمهٔ «خروج» هر صفحه حتماً کوکی نشست را هم روی سرور پاک کند، نه فقط وضعیت ظاهری را.
const TAG = '<script src="/js/auth-session.js?v=1" defer></script>';

function authSessionScript(req, res, next) {
  if (req.method !== "GET" || req.path.startsWith("/admin") || req.path.startsWith("/api/")) return next();
  const send = res.send.bind(res);
  res.send = (body) => {
    try {
      if (typeof body === "string" && /text\/html/i.test(String(res.get("Content-Type") || "")) && !body.includes("/js/auth-session.js") && body.includes("</body>")) {
        body = body.replace("</body>", `${TAG}\n</body>`);
      }
    } catch (error) {
      console.error("auth-session inject error:", error.message);
    }
    return send(body);
  };
  next();
}

module.exports = { authSessionScript, TAG };
