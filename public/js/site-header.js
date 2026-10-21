/* رفتار هدر مشترک در صفحه‌هایی که کد هدر را خودشان ندارند (مثل پروفایل):
   نام کاربر، منوی پروفایل، خروج و جستجو. */
(function () {
  if (window.__plSiteHeader) return;
  window.__plSiteHeader = true;
  var $ = function (id) { return document.getElementById(id); };

  function storedUser() {
    try { return JSON.parse(localStorage.getItem("user") || "null"); } catch (e) { return null; }
  }
  function displayName(user) {
    var full = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
    return full || user.mobile || user.email || "کاربر";
  }
  function showUser(user) {
    if (!user) return;
    document.body.classList.add("logged-in");
    var name = displayName(user);
    if ($("profileName")) $("profileName").textContent = name;
    if ($("pdropName")) $("pdropName").textContent = name;
    if ($("pdropMobile")) {
      var mobile = user.mobile ? String(user.mobile).replace(/(\d{4})(\d{3})(\d{4})/, "$1 $2 $3") : "";
      $("pdropMobile").textContent = name === user.mobile ? (user.email || "") : (mobile || user.email || "");
    }
  }
  showUser(storedUser());
  // نام تازه بعد از ذخیرهٔ پروفایل (کلید user در localStorage عوض می‌شود)
  window.plRefreshHeaderUser = function () { showUser(storedUser()); };

  var trigger = $("profileTrigger");
  var dropdown = $("profileDropdown");
  if (trigger && dropdown) {
    trigger.addEventListener("click", function (event) {
      event.stopPropagation();
      var open = dropdown.classList.toggle("open");
      trigger.classList.toggle("open", open);
    });
    document.addEventListener("click", function (event) {
      if (!trigger.contains(event.target) && !dropdown.contains(event.target)) {
        dropdown.classList.remove("open");
        trigger.classList.remove("open");
      }
    });
  }
  var logout = $("headerLogoutBtn");
  if (logout) {
    logout.addEventListener("click", function () {
      fetch("/api/auth/logout", { credentials: "include" }).catch(function () {}).then(function () {
        ["user", "token", "authToken"].forEach(function (key) { try { localStorage.removeItem(key); } catch (e) {} });
        location.href = "/";
      });
    });
  }
  var search = $("searchInput");
  if (search) {
    var go = function () {
      var q = search.value.trim();
      if (q) location.href = "/search.html?q=" + encodeURIComponent(q);
    };
    search.addEventListener("keydown", function (event) { if (event.key === "Enter") go(); });
    var btn = document.querySelector(".search-btn");
    if (btn) btn.addEventListener("click", go);
  }
})();
