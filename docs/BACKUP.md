# پشتیبان‌گیری پیکسل‌لایف

## چه چیزی کجاست
| چه چیزی | کجا ذخیره می‌شود | در پشتیبان؟ |
|---|---|---|
| کد برنامه | گیت‌هاب (`lumiacode/pixellife`) | با `git clone --mirror` |
| مشتری‌ها، سفارش‌ها، محصولات، کیف پول، تنظیمات، **عکس محصولات** (GridFS) | MongoDB | `scripts/backup.sh` (mongodump) |
| کلیدها (زرین‌پال، پیامک، OpenAI، `JWT_SECRET`…) | `.env` روی VPS (در گیت نیست) | `scripts/backup.sh` |
| تنظیمات سرور | nginx و pm2 | `scripts/backup.sh` |

مهم: `JWT_SECRET` را هم‌راه پشتیبان نگه دارید. کلید OpenAI ذخیره‌شده در پنل با آن رمزنگاری می‌شود؛ با `JWT_SECRET` عوض‌شده، آن کلید دیگر خوانده نمی‌شود.

## نصب (یک‌بار، روی VPS)
```bash
# ابزار mongodump
sudo apt-get install -y mongodb-database-tools   # یا از سایت MongoDB دانلود کنید

# رمز پشتیبان: یک عبارت طولانی و تصادفی. آن را جدا از سرور هم یادداشت کنید؛ بدون آن پشتیبان باز نمی‌شود!
sudo sh -c 'umask 077; head -c 48 /dev/urandom | base64 > /root/.pixellife-backup-pass'

cd /var/www/pixellife && git pull origin main
sudo bash scripts/backup.sh          # اولین اجرا، دستی
ls -lh /var/backups/pixellife/
```

## اجرای روزانه خودکار (cron)
```bash
sudo crontab -e
# هر شب ساعت ۳:۱۷
17 3 * * * /bin/bash /var/www/pixellife/scripts/backup.sh >> /var/log/pixellife-backup.log 2>&1
```
تنظیمات اختیاری (متغیر محیطی): `BACKUP_DIR` (پیش‌فرض `/var/backups/pixellife`)، `KEEP_DAYS` (پیش‌فرض ۱۴)، `OFFSITE_RSYNC=user@host:/path/` برای کپی روی یک سرور دیگر.

**حتماً یک کپی خارج از همین VPS هم نگه دارید** (کامپیوتر خودتان یا سرور دیگر). پشتیبانی که کنار خود سرور بماند، با خراب‌شدن سرور از بین می‌رود:
```bash
scp root@SERVER:/var/backups/pixellife/pixellife-<تاریخ>.tar.gz.enc* .
```

## بازیابی
```bash
# ۱) باز کردن (به همان فایل رمز نیاز دارید)
openssl enc -d -aes-256-cbc -pbkdf2 -iter 200000 -pass file:/root/.pixellife-backup-pass \
  -in pixellife-<تاریخ>.tar.gz.enc | tar -xzf -
cd pixellife-<تاریخ>
cat INFO.txt                       # commit گیت در زمان پشتیبان

# ۲) اول روی یک دیتابیس آزمایشی امتحان کنید (دیتابیس اصلی را خراب نمی‌کند)
mongorestore --uri="mongodb://127.0.0.1:27017" --archive=db.archive.gz --gzip \
  --nsFrom='DBNAME.*' --nsTo='DBNAME_restoretest.*'

# ۳) بازیابی واقعی (دادهٔ فعلی همان مجموعه‌ها را جایگزین می‌کند!)
mongorestore --uri="$MONGO_URI" --archive=db.archive.gz --gzip --drop

# ۴) فایل‌ها: env را به‌عنوان /var/www/pixellife/.env برگردانید؛ uploads.tar.gz را در public/ باز کنید؛
#    nginx.tar.gz را در /etc/nginx باز کنید و nginx -t && systemctl reload nginx
```
حداقل ماهی یک بار بازیابی آزمایشی انجام دهید؛ پشتیبانی که هرگز بازیابی نشده، مطمئن نیست.

## نکته‌های امنیتی
- فایل پشتیبان شامل اطلاعات شخصی مشتری‌ها و کلیدهاست؛ برای همین رمزنگاری می‌شود. آن را در گیت‌هاب یا فضای عمومی نگذارید.
- رمز پشتیبان را در گیت و در همان پوشهٔ پشتیبان نگذارید.
