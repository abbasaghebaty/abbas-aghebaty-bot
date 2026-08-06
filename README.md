# 🤖 Abbas Assistant Bot

ربات تلگرامی «منشی عباس» — روی Cloudflare Workers با Grammy.js و دیتابیس Cloudflare D1.

## ساختار پروژه

```
abbas-assistant-bot/
├── src/index.js     ← کل منطق ربات (Worker + Bot)
├── schema.sql        ← ساختار جدول‌های D1
├── wrangler.toml      ← تنظیمات Cloudflare Workers / D1
├── package.json
└── README.md
```

## پیش‌نیازها

- Node.js نصب باشد
- یک اکانت Cloudflare
- توکن ربات از @BotFather

## مراحل راه‌اندازی

### ۱. نصب پکیج‌ها

```bash
cd abbas-assistant-bot
npm install
```

### ۲. لاگین به Cloudflare

```bash
npx wrangler login
```

### ۳. ساخت دیتابیس D1

```bash
npm run db:create
```

خروجی این دستور یک `database_id` به شما می‌دهد؛ آن را در فایل `wrangler.toml`
داخل بخش `[[d1_databases]]` جای‌گزین `YOUR_DATABASE_ID` کن.

### ۴. اجرای اسکیمای دیتابیس

روی محیط لوکال (برای تست با `wrangler dev`):
```bash
npm run db:init
```

روی محیط واقعی (پروداکشن):
```bash
npm run db:init:remote
```

### ۵. تنظیم مقادیر امن (Secret) و متغیرها (Variables)

توکن ربات را به‌صورت Secret ست کن:
```bash
npm run secret:bot-token
```
(از شما مقدار BOT_TOKEN را می‌پرسد — همان توکنی که از BotFather گرفتی)

آیدی عددی تلگرام عباس (ادمین) را داخل `wrangler.toml` در بخش `[vars]`
مقابل `ADMIN_ID` قرار بده. برای پیدا کردن آیدی عددی‌ات می‌توانی به ربات
`@userinfobot` پیام بدهی.

### ۶. دیپلوی

```bash
npm run deploy
```

بعد از دیپلوی، آدرس Worker شما چیزی شبیه این خواهد بود:
`https://abbas-assistant-bot.<your-subdomain>.workers.dev`

### ۷. ثبت Webhook در تلگرام

یک‌بار در مرورگر (یا با curl) این آدرس را باز کن:

```
https://<your-worker-domain>/register-webhook
```

این کار به‌صورت خودکار Webhook ربات را روی تلگرام تنظیم می‌کند.
اگر پیام `{"ok":true,...}` را دیدی یعنی موفق بوده.

## تست

به ربات در تلگرام پیام `/start` بده. باید پیام خوش‌آمدگویی و کیبورد اصلی
(شامل چهار دکمه) نمایش داده شود و همه‌ی دکمه‌ها بدون خطا پاسخ بدهند.

## نکات مهم درباره‌ی منطق ربات

- **شبکه‌های اجتماعی**: لینک‌های اینستاگرام/تلگرام/یوتیوب داخل تابع
  `socialsKeyboard()` در `src/index.js` قرار دارند — همان‌جا لینک‌های واقعی
  را جای‌گزین کن و برای افزودن لینک بیشتر در آینده کافیست یک `.row().url(...)`
  دیگر اضافه کنی.
- **درباره من / خرید فیلترشکن**: متن‌های `ABOUT_TEXT` و `BUY_TEXT` در بالای
  فایل `src/index.js` قابل ویرایش هستند؛ آیدی پشتیبانی هم همان‌جاست.
- **ارسال پیام ناشناس**: وضعیت کاربر (`awaiting_message` سپس
  `awaiting_confirmation`) در جدول `user_states` نگه‌داری می‌شود. با زدن
  «✅ ارسال»، پیام برای ADMIN_ID ارسال می‌شود و آیدی همان پیام در جدول
  `admin_messages` ذخیره می‌شود تا وقتی عباس رویش Reply بزند، ربات بفهمد
  پاسخ برای کدام کاربر است.
- **پاسخ عباس**: کافیست عباس (ادمین) روی پیام relay‌شده در چت با ربات
  Reply بزند؛ ربات به‌صورت خودکار پاسخ را برای همان کاربر می‌فرستد.

## توسعه‌های آینده (پیشنهادی)

- افزودن لینک‌های بیشتر به بخش شبکه‌های اجتماعی
- ذخیره‌ی تاریخچه‌ی پیام‌های ناشناس برای گزارش‌گیری
- محدود کردن نرخ ارسال پیام ناشناس (rate limit) برای جلوگیری از اسپم
