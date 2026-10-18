// تنظیم اختیاری pm2 برای سرور واقعی:
//   pm2 delete pixellife && pm2 start ecosystem.config.js && pm2 save
// NODE_ENV=production کش صفحه‌ها و فایل‌های استاتیک را فعال می‌کند و max_memory_restart اپ را قبل از پر شدن رم ۱ گیگی ری‌استارت می‌کند.
module.exports = {
  apps: [
    {
      name: "pixellife",
      script: "src/app.js",
      env: { NODE_ENV: "production" },
      max_memory_restart: "350M",
      time: true,
    },
  ],
};
