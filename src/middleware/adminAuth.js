function requireAdmin(req, res, next) {
  if (req.session && req.session.isAdmin) {
    return next();
  }
  if (String(req.originalUrl || req.path).startsWith("/admin/api")) {
    return res.status(401).json({ success: false, message: "ابتدا وارد شوید" });
  }
  return res.redirect("/admin/login");
}

module.exports = requireAdmin;
