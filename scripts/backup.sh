#!/usr/bin/env bash
# پشتیبان‌گیری کامل پیکسل‌لایف (روی VPS اجرا شود):
#   • دیتابیس MongoDB (همهٔ مجموعه‌ها؛ عکس محصولات هم در GridFS همین دیتابیس است)
#   • فایل .env (کلیدها)، ecosystem.config.js، پوشهٔ public/uploads، تنظیمات nginx و فهرست pm2
# خروجی: یک فایل «رمزنگاری‌شده» pixellife-<تاریخ>.tar.gz.enc (چون شامل اطلاعات مشتری‌ها و کلیدهاست).
# استفادهٔ اولیه و بازیابی: docs/BACKUP.md
set -euo pipefail
umask 077

APP_DIR="${APP_DIR:-/var/www/pixellife}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/pixellife}"
KEEP_DAYS="${KEEP_DAYS:-14}"
PASS_FILE="${BACKUP_PASSPHRASE_FILE:-/root/.pixellife-backup-pass}"
OFFSITE_RSYNC="${OFFSITE_RSYNC:-}"   # اختیاری: user@host:/path/ برای کپی خارج از همین سرور

fail() { echo "[backup] خطا: $*" >&2; exit 1; }
log() { echo "[backup] $(date '+%F %T') $*"; }

[ -d "$APP_DIR" ] || fail "پوشهٔ برنامه پیدا نشد: $APP_DIR"
[ -f "$APP_DIR/.env" ] || fail "فایل .env پیدا نشد: $APP_DIR/.env"
[ -s "$PASS_FILE" ] || fail "فایل رمز پشتیبان (BACKUP_PASSPHRASE_FILE=$PASS_FILE) وجود ندارد یا خالی است؛ بدون رمز، پشتیبان ساخته نمی‌شود"
[ -n "$BACKUP_DIR" ] && [ "$BACKUP_DIR" != "/" ] || fail "BACKUP_DIR نامعتبر است"
command -v mongodump >/dev/null || fail "mongodump نصب نیست (بستهٔ mongodb-database-tools)"
command -v openssl >/dev/null || fail "openssl نصب نیست"

# MONGO_URI بدون source کردن .env (مقدار فقط خوانده می‌شود، اجرا نمی‌شود)
MONGO_URI="$(grep -E '^MONGO_URI=' "$APP_DIR/.env" | head -n1 | cut -d= -f2- | sed -e 's/^["'\'']//' -e 's/["'\'']$//')"
[ -n "$MONGO_URI" ] || fail "MONGO_URI در $APP_DIR/.env پیدا نشد"

mkdir -p "$BACKUP_DIR"
STAMP="$(date +%F_%H%M%S)"
WORK="$(mktemp -d "$BACKUP_DIR/.work-XXXXXX")"
trap 'rm -rf -- "$WORK"' EXIT
PKG="$WORK/pixellife-$STAMP"
mkdir -p "$PKG"

log "دیتابیس…"
mongodump --uri="$MONGO_URI" --archive="$PKG/db.archive.gz" --gzip --quiet
[ -s "$PKG/db.archive.gz" ] || fail "خروجی دیتابیس خالی است"

log "فایل‌های برنامه…"
cp "$APP_DIR/.env" "$PKG/env"
[ -f "$APP_DIR/ecosystem.config.js" ] && cp "$APP_DIR/ecosystem.config.js" "$PKG/ecosystem.config.js"
if [ -d "$APP_DIR/public/uploads" ]; then tar -C "$APP_DIR/public" -czf "$PKG/uploads.tar.gz" uploads; fi
if [ -d /etc/nginx/sites-available ]; then tar -czf "$PKG/nginx.tar.gz" -C /etc/nginx sites-available sites-enabled 2>/dev/null || true; fi
[ -f "${HOME:-/root}/.pm2/dump.pm2" ] && cp "${HOME:-/root}/.pm2/dump.pm2" "$PKG/pm2-dump.pm2"
{
  echo "date=$STAMP"
  (cd "$APP_DIR" && echo "git_commit=$(git rev-parse HEAD 2>/dev/null || echo unknown)" && git remote -v 2>/dev/null) || true
} > "$PKG/INFO.txt"

log "فشرده‌سازی و رمزنگاری…"
OUT="$BACKUP_DIR/pixellife-$STAMP.tar.gz.enc"
tar -C "$WORK" -czf - "pixellife-$STAMP" | openssl enc -aes-256-cbc -pbkdf2 -iter 200000 -salt -pass "file:$PASS_FILE" -out "$OUT.partial"
mv "$OUT.partial" "$OUT"
( cd "$BACKUP_DIR" && sha256sum "$(basename "$OUT")" > "$(basename "$OUT").sha256" )
log "ساخته شد: $OUT ($(du -h "$OUT" | cut -f1))"

# فقط فایل‌های پشتیبان همین پوشه که از KEEP_DAYS روز قدیمی‌ترند حذف می‌شوند
find "$BACKUP_DIR" -maxdepth 1 -type f \( -name 'pixellife-*.tar.gz.enc' -o -name 'pixellife-*.tar.gz.enc.sha256' \) -mtime "+$KEEP_DAYS" -delete

if [ -n "$OFFSITE_RSYNC" ]; then
  command -v rsync >/dev/null || fail "rsync نصب نیست (OFFSITE_RSYNC تنظیم شده)"
  log "کپی خارج از سرور…"
  rsync -a "$OUT" "$OUT.sha256" "$OFFSITE_RSYNC"
fi
log "تمام شد"
