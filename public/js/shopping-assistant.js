(() => {
  const add = (tag, attrs = {}, text = "") => { const el = document.createElement(tag); Object.assign(el, attrs); if (text) el.textContent = text; return el; };
  const start = () => {
    if (document.getElementById("plAssistant")) return;

    if (!document.getElementById("pl-assistant-toggle-style")) {
      const style = add("style", { id: "pl-assistant-toggle-style" });
      style.textContent = `
        #plAssistantToggle {
          position: fixed; right: 22px; left: auto !important; bottom: 92px; z-index: 1750;
          width: 58px !important; height: 58px !important; padding: 0; border: 0; border-radius: 50%;
          display: grid; place-items: center; cursor: pointer; color: #fff;
          background: var(--pl-blue-strong, #2563eb) !important;
          box-shadow: 0 8px 22px rgba(37, 99, 235, .38) !important;
          outline: none !important;
          appearance: none;
          transition: transform .2s ease, box-shadow .2s ease, background .2s ease;
        }
        #plAssistantToggle:hover { transform: translateY(-2px) !important; box-shadow: 0 12px 28px rgba(37, 99, 235, .45) !important; }
        #plAssistantToggle:active { transform: scale(.96) !important; }
        #plAssistantToggle:focus-visible { outline: 3px solid rgba(37, 99, 235, .35) !important; outline-offset: 3px; }
        #plAssistantToggle::before { content: none !important; }
        #plAssistantToggle svg { display: block; width: 40px; height: 40px; filter: none !important; }

        #plAssistant {
          position: fixed; right: 22px; bottom: 158px; z-index: 1749;
          width: min(360px, calc(100vw - 32px)); max-height: min(520px, calc(100vh - 190px));
          display: none; flex-direction: column; overflow: hidden;
          direction: rtl; background: #fff; border: 1px solid #cfe1fb; border-radius: 18px;
          box-shadow: 0 16px 38px rgba(59, 130, 246, .18);
          font-family: Vazirmatn, Tahoma, sans-serif;
        }
        #plAssistant.open { display: flex; animation: plAssistantPop .16s ease-out; }
        @keyframes plAssistantPop { from { opacity: 0; transform: translateY(8px) scale(.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
        .pl-ai-head { display:flex; align-items:center; justify-content:space-between; gap:10px; padding:13px 15px; background:#eff6ff; border-bottom:1px solid #dbeafe; color:#2563eb; }
        .pl-ai-title { display:flex; flex-direction:column; gap:2px; font-weight:800; font-size:14px; }
        .pl-ai-title small { color:#64748b; font-size:10px; font-weight:600; }
        #plAssistantClose { width:30px; height:30px; border:0; border-radius:9px; background:#dbeafe; color:#4b89dd; font-size:22px; line-height:1; cursor:pointer; }
        .pl-ai-messages { flex:1; min-height:160px; overflow:auto; padding:13px; background:#fff; }
        .pl-ai-msg { width:fit-content; max-width:88%; margin:0 0 9px; padding:9px 11px; border-radius:12px; font-size:12px; line-height:1.8; }
        .pl-ai-msg.bot { background:#eff6ff; color:#334155; border:1px solid #dbeafe; }
        .pl-ai-msg.user { margin-right:auto; background:#75acf0; color:#fff; }
        .pl-ai-form { display:flex; gap:7px; padding:11px; background:#f8fbff; border-top:1px solid #e5efff; }
        #plAssistantInput { flex:1; min-width:0; height:38px; border:1px solid #cfe1fb; border-radius:10px; padding:0 10px; outline:none; font:12px Vazirmatn,Tahoma,sans-serif; }
        #plAssistantInput:focus { border-color:#93c5fd; box-shadow:0 0 0 3px rgba(147,197,253,.22); }
        .pl-ai-form button { border:0; border-radius:10px; padding:0 13px; background:#75acf0; color:#fff; font:700 12px Vazirmatn,Tahoma,sans-serif; cursor:pointer; }

        #plAssistantMenu {
          position: fixed; right: 22px; bottom: 158px; z-index: 1751; width: min(268px, calc(100vw - 32px));
          display: none; flex-direction: column; gap: 4px; padding: 8px; direction: rtl;
          background: #fff; border: 1px solid #dbeafe; border-radius: 18px; box-shadow: 0 16px 38px rgba(15, 23, 42, .16);
          font-family: Vazirmatn, Tahoma, sans-serif;
        }
        #plAssistantMenu.open { display: flex; animation: plAssistantPop .16s ease-out; }
        .pl-ai-opt { display: flex; align-items: center; gap: 11px; width: 100%; padding: 10px 11px; border: 0; border-radius: 13px; background: transparent; color: #0f172a; text-align: right; text-decoration: none; cursor: pointer; font-family: inherit; }
        .pl-ai-opt:hover, .pl-ai-opt:focus-visible { background: #eff6ff; outline: none; }
        .pl-ai-opt-ico { flex: 0 0 38px; height: 38px; border-radius: 12px; display: grid; place-items: center; background: #eaf2ff; color: #2563eb; }
        .pl-ai-opt-ico.bale { background: #e9f8ef; color: #16a34a; }
        .pl-ai-opt-ico svg { width: 21px; height: 21px; }
        .pl-ai-opt b { display: block; font-size: 13px; font-weight: 800; line-height: 1.6; }
        .pl-ai-opt small { display: block; font-size: 11px; color: #64748b; line-height: 1.6; font-weight: 500; }
        .pl-ai-bale-link { display: inline-flex; align-items: center; gap: 5px; margin: 0 0 9px; padding: 5px 10px; border: 1px solid #bbf7d0; border-radius: 999px; background: #f0fdf4; color: #15803d; font-size: 11.5px; font-weight: 700; text-decoration: none; }
        @media (max-width: 768px) {
          #plAssistantMenu { right: 16px; bottom: 148px; }
          #plAssistantToggle { right: 16px; bottom: 84px; width: 54px !important; height: 54px !important; }
          #plAssistantToggle svg { width: 37px; height: 37px; }
          #plAssistant { right: 16px; bottom: 148px; max-height: min(500px, calc(100vh - 170px)); }
        }
      `;
      document.head.appendChild(style);
    }

    const toggle = add("button", { id: "plAssistantToggle", type: "button", title: "گفتگو و پشتیبانی", ariaLabel: "گفتگو با دستیار هوشمند یا پشتیبانی", ariaHaspopup: "true", ariaExpanded: "false" });
    // آیکن حباب گفتگو با سه نقطه: دایرهٔ آبی با خطوط سفید (هم‌رنگ تم سایت).
    toggle.innerHTML = '<svg viewBox="0 0 64 64" width="34" height="34" aria-hidden="true" focusable="false"><path d="M19 15h26a7 7 0 0 1 7 7v18a7 7 0 0 1-7 7H37l-5 7-5-7h-8a7 7 0 0 1-7-7V22a7 7 0 0 1 7-7z" fill="none" stroke="#fff" stroke-width="3.6" stroke-linejoin="round"/><circle cx="23.5" cy="31" r="2.8" fill="#fff"/><circle cx="32" cy="31" r="2.8" fill="#fff"/><circle cx="40.5" cy="31" r="2.8" fill="#fff"/></svg>';
    const panel = add("section", { id: "plAssistant", ariaLabel: "دستیار PixelLife" });
    panel.innerHTML = '<div class="pl-ai-head"><div class="pl-ai-title"><span>دستیار هوشمند PixelLife</span><small dir="rtl">قدرت گرفته از <bdi>OpenAI</bdi></small></div><button id="plAssistantClose" type="button" aria-label="بستن">×</button></div><div class="pl-ai-messages" id="plAssistantMessages"><div class="pl-ai-msg bot">سلام! برای انتخاب گوشی، تبلت یا کنسول و همچنین سؤال دربارهٔ سفارش و پرداخت کمکتان می‌کنم.</div></div><form class="pl-ai-form" id="plAssistantForm"><input id="plAssistantInput" maxlength="800" autocomplete="off" placeholder="مثلاً گوشی مناسب بازی تا ۵۰ میلیون" /><button type="submit">ارسال</button></form>';
    const menu = add("div", { id: "plAssistantMenu", role: "menu", ariaLabel: "انتخاب نوع گفتگو" });
    document.body.append(toggle, panel, menu);
    let baleUrl = "";
    const AI_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8z"/><path d="M18.5 15l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z"/></svg>';
    const BALE_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 5h16v11H9l-5 4z"/><path d="M8.5 9.5h7M8.5 12.5h4"/></svg>';
    const buildMenu = () => {
      menu.textContent = "";
      const ai = add("button", { type: "button", className: "pl-ai-opt", role: "menuitem" });
      ai.innerHTML = '<span class="pl-ai-opt-ico">' + AI_ICON + '</span><span><b>دستیار هوشمند</b><small>پاسخ فوری به سؤال‌های خرید و سفارش</small></span>';
      ai.addEventListener("click", () => { closeMenu(); openPanel(); });
      menu.appendChild(ai);
      if (baleUrl) {
        const bale = add("a", { className: "pl-ai-opt", role: "menuitem", href: baleUrl, target: "_blank", rel: "noopener noreferrer" });
        bale.innerHTML = '<span class="pl-ai-opt-ico bale">' + BALE_ICON + '</span><span><b>پشتیبانی در بله</b><small>گفتگوی مستقیم با پشتیبان در پیام‌رسان بله</small></span>';
        bale.addEventListener("click", closeMenu);
        menu.appendChild(bale);
      }
    };
    // لینک بله از تنظیمات پنل ادمین؛ تا رسیدن پاسخ (یا اگر ثبت نشده باشد) فقط دستیار هوشمند باز می‌شود.
    fetch("/api/ai/support-link").then((r) => r.json()).then((d) => { if (d && typeof d.baleUrl === "string") { baleUrl = d.baleUrl; syncBaleLink(); } }).catch(() => {});
    const input = document.getElementById("plAssistantInput"), messages = document.getElementById("plAssistantMessages");
    const history = [];
    const remember = (role, content) => { history.push({ role, content: String(content).slice(0, 800) }); if (history.length > 12) history.shift(); };
    const offerHandoff = () => {
      if (messages.querySelector(".pl-ai-handoff")) return;
      const btn = add("button", { type: "button", className: "pl-ai-msg bot pl-ai-handoff" }, "ارسال به پشتیبان انسانی");
      btn.style.cssText = "cursor:pointer;border:1px solid #93c5fd;background:#fff;color:#2563eb;font:700 12px Vazirmatn,Tahoma,sans-serif";
      btn.addEventListener("click", async () => {
        btn.disabled = true;
        const send = async (extra) => {
          const r = await fetch("/api/ai/handoff", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ history, ...extra }) });
          return { ok: r.ok, data: await r.json().catch(() => ({})) };
        };
        try {
          let res = await send({});
          if (!res.ok && res.data.needContact) {
            const name = (prompt("نام و نام خانوادگی:") || "").trim();
            const phone = (prompt("شمارهٔ تماس:") || "").trim();
            if (!name || !phone) { btn.disabled = false; return; }
            res = await send({ name, phone });
          }
          addMessage(res.data.message || (res.ok ? "درخواست ثبت شد." : "ثبت نشد؛ از صفحهٔ تماس با ما اقدام کنید."), "bot");
          if (res.ok) btn.remove(); else btn.disabled = false;
        } catch (_) { addMessage("ثبت نشد؛ از صفحهٔ تماس با ما اقدام کنید.", "bot"); btn.disabled = false; }
      });
      messages.appendChild(btn); messages.scrollTop = messages.scrollHeight;
    };
    const addMessage = (text, kind) => { const el = add("div", { className: "pl-ai-msg " + kind }, text); messages.appendChild(el); messages.scrollTop = messages.scrollHeight; return el; };
    const closeMenu = () => { menu.classList.remove("open"); toggle.setAttribute("aria-expanded", String(panel.classList.contains("open"))); };
    const closePanel = () => { panel.classList.remove("open"); toggle.setAttribute("aria-expanded", "false"); };
    const openPanel = () => { panel.classList.add("open"); toggle.setAttribute("aria-expanded", "true"); input.focus(); };
    // لینک بله داخل خود پنل گفتگو هم نمایش داده می‌شود (برای کاربری که وسط گفتگو می‌خواهد با انسان صحبت کند)
    const syncBaleLink = () => {
      const old = messages.querySelector(".pl-ai-bale-link"); if (old) old.remove();
      if (!baleUrl) return;
      const link = add("a", { className: "pl-ai-bale-link", href: baleUrl, target: "_blank", rel: "noopener noreferrer" }, "گفتگو با پشتیبان در بله");
      messages.insertBefore(link, messages.firstChild);
    };
    toggle.addEventListener("click", () => {
      if (panel.classList.contains("open")) { closePanel(); return; }
      if (!baleUrl) { menu.classList.remove("open"); openPanel(); return; }
      const isOpen = menu.classList.toggle("open");
      if (isOpen) { buildMenu(); const first = menu.querySelector(".pl-ai-opt"); if (first) first.focus(); }
      toggle.setAttribute("aria-expanded", String(isOpen));
    });
    document.getElementById("plAssistantClose").addEventListener("click", closePanel);
    document.addEventListener("click", (event) => {
      if (toggle.contains(event.target) || menu.contains(event.target)) return;
      if (panel.classList.contains("open") && !panel.contains(event.target)) closePanel();
      if (menu.classList.contains("open")) closeMenu();
    });
    document.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") return;
      if (menu.classList.contains("open")) { closeMenu(); toggle.focus(); }
      else if (panel.classList.contains("open")) { closePanel(); toggle.focus(); }
    });
    document.getElementById("plAssistantForm").addEventListener("submit", async (event) => {
      event.preventDefault(); const message = input.value.trim(); if (!message) return;
      addMessage(message, "user"); input.value = ""; input.disabled = true;
      const pending = addMessage("در حال بررسی…", "bot");
      try {
        const response = await fetch("/api/ai/assistant", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message, history }) });
        const data = await response.json(); pending.remove();
        if (!response.ok || !data.success) throw new Error(data.message || "خطا");
        addMessage(data.answer, "bot"); remember("user", message); remember("assistant", data.answer);
        if (data.handoff) offerHandoff();
        if (data.products?.length) addMessage("محصولات مرتبط: " + data.products.slice(0, 3).map((p) => p.name).join("، "), "bot");
      } catch (error) { pending.textContent = error.message && error.message !== "خطا" ? error.message : "متأسفانه در حال حاضر امکان پاسخ‌گویی وجود ندارد. لطفاً دوباره تلاش کنید."; offerHandoff(); }
      input.disabled = false; input.focus();
    });
  };
  document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", start) : start();
})();