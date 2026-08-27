# 🌿 ربات دعوت دوستان Nature Plus

نسخه سبک و فارسی ربات Referral برای کانال [@nature_plus](https://t.me/nature_plus).

این Fork علاوه بر نسخه اصلی، یک پیاده‌سازی سبک برای **Cloudflare Workers + D1** دارد.

## امکانات

- 🇮🇷 رابط و پیام‌های فارسی
- 🔗 لینک دعوت اختصاصی برای هر عضو
- 👥 شمارش دعوت‌های موفق
- 🏆 جدول ۱۰ نفر برتر
- 📊 نمایش رتبه کاربر
- 🚫 جلوگیری از دعوت کردن خود
- 🔒 هر کاربر فقط یک بار می‌تواند به‌عنوان دعوت موفق ثبت شود
- ✅ بررسی عضویت واقعی در `@nature_plus` قبل از ثبت دعوت
- ☁️ بدون VPS؛ مناسب Cloudflare Workers + D1

## راه‌اندازی Cloudflare

وارد پوشه `worker` شوید:

```bash
cd worker
npm install
```

### 1. ساخت D1

```bash
npx wrangler d1 create nature-plus-referrals
```

شناسه دیتابیس را در `worker/wrangler.toml` جایگزین `YOUR_D1_DATABASE_ID` کنید.

### 2. ساخت جداول

```bash
npx wrangler d1 execute nature-plus-referrals --remote --file=./schema.sql
```

### 3. تنظیم Secretها

```bash
npx wrangler secret put BOT_TOKEN
```

و نام کاربری ربات را در `wrangler.toml` قرار دهید:

```toml
[vars]
CHANNEL_USERNAME = "nature_plus"
BOT_USERNAME = "YourBotUsername"
```

### 4. Deploy

```bash
npx wrangler deploy
```

### 5. تنظیم Webhook

پس از Deploy، آدرس Worker را به شکل زیر به Telegram معرفی کنید:

```text
https://YOUR-WORKER-DOMAIN/webhook
```

ربات را به کانال `@nature_plus` اضافه کنید و برای بررسی عضویت کاربران، دسترسی مناسب مدیریتی به ربات بدهید.

## دستورات ربات

```text
/start       شروع کار
/ref_link    دریافت لینک دعوت
/verify      بررسی عضویت و ثبت دعوت
/leaderboard جدول برترین‌ها
/position    رتبه من
```

## نکته مهم

برای اینکه بررسی عضویت کانال با `getChatMember` درست کار کند، ربات باید دسترسی لازم در کانال `@nature_plus` را داشته باشد.

## ساختار Worker

```text
worker/
├── src/
│   └── index.ts
├── schema.sql
├── package.json
└── wrangler.toml
```

نسخه Python اصلی پروژه در پوشه `bot/` حفظ شده است؛ پیاده‌سازی Cloudflare سبک در `worker/` قرار دارد تا مهاجرت به Workers بدون وابستگی به PostgreSQL، Redis و Docker انجام شود.

## مجوز

MIT — بر پایه پروژه اصلی `alerrad/referral-bot`.
