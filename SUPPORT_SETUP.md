# راه‌اندازی ارتباط دوطرفه

## ۱) تنظیمات مدیر و توکن

شناسه عددی مدیر در `wrangler.toml` و متغیر `ADMIN_ID` نگهداری می‌شود تا تنظیم قبلی پروژه حفظ شود. توکن ربات همچنان باید به‌صورت Secret در Cloudflare تنظیم شده باشد:

```bash
npx wrangler secret put BOT_TOKEN
```

اگر توکن از قبل تنظیم شده، نیازی به ثبت دوباره آن نیست.

## ۲) اجرای Migration دیتابیس

این Migration فقط جدول‌های جدید ارتباط دوطرفه، بلاک و محدودیت ارسال را اضافه می‌کند و جدول‌ها و اطلاعات قبلی را حذف یا بازنویسی نمی‌کند:

```bash
npx wrangler d1 execute abbas-aghebaty-bot --remote --file=migrations/0002_two_way_support.sql
```

## ۳) اجرای Migration پیام‌های موقت

این Migration پیام‌های کاربر را تا زمان انتخاب «اتمام گفتگو» در جدول موقت نگه می‌دارد. قبل از Deploy نسخه جدید، این SQL را روی D1 اجرا کن:

```sql
ALTER TABLE support_user_states
ADD COLUMN admin_header_message_id INTEGER;

CREATE TABLE IF NOT EXISTS support_pending_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  source_chat_id INTEGER NOT NULL,
  source_message_id INTEGER NOT NULL,
  admin_message_id INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, source_chat_id, source_message_id)
);

CREATE INDEX IF NOT EXISTS idx_support_pending_messages_user
  ON support_pending_messages(user_id, id);
```

## ۴) Migration اعلان پیام‌های خوانده‌نشده

این Migration وضعیت اعلان‌های مدیر را نگه می‌دارد تا با زدن «مشاهده پیام‌ها»، اعلان به‌عنوان خوانده‌شده ثبت شود. این تغییر داده‌های قبلی را حذف نمی‌کند:

```sql
CREATE TABLE IF NOT EXISTS support_notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  admin_chat_id INTEGER NOT NULL,
  header_message_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  message_count INTEGER NOT NULL DEFAULT 0,
  read_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(admin_chat_id, header_message_id)
);

CREATE INDEX IF NOT EXISTS idx_support_notifications_unread
  ON support_notifications(admin_chat_id, read_at, created_at);
```

اعلان برای مدیر شامل لینک پروفایل کاربر، تعداد پیام‌های خوانده‌نشده و دکمه «مشاهده پیام‌ها» است. پیام‌های اصلی پس از اتمام گفتگو مثل قبل زیر اعلان کپی می‌شوند؛ زدن دکمه فقط وضعیت اعلان را خوانده‌شده می‌کند و دکمه را برمی‌دارد.

## ۵) انتشار و ثبت دوباره Webhook

بعد از Merge شدن تغییرات و Deploy شدن Worker، یک‌بار آدرس زیر را باز کن:

```
https://<WORKER-DOMAIN>/register-webhook
```

این کار Webhook را با updateهای لازم برای پیام‌ها و دکمه‌های Inline ثبت می‌کند.

## تنظیم ضداسپم

در `wrangler.toml`:

- `SUPPORT_RATE_LIMIT`: تعداد پیام مجاز در هر بازه (پیش‌فرض ۵)
- `SUPPORT_RATE_WINDOW`: طول بازه بر حسب ثانیه (پیش‌فرض ۶۰)

## واکنش دوطرفه

زیر پیام اصلی و نسخه کپی‌شده، ربات دکمه‌های 👍 ❤️ 😂 😮 😢 🔥 می‌فرستد. کاربر یا مدیر با انتخاب یکی از آن‌ها، همان واکنش را روی پیام متناظر در چت طرف مقابل ثبت می‌کند. این روش از رویدادهای غیرقابل‌دریافت Reaction در چت خصوصی استفاده نمی‌کند.

## دستورات مدیر

- `/support`: راهنمای مدیریت پیام‌ها
- Reply روی پیام کاربر: پاسخ به همان کاربر
- Reply روی پیام کاربر + `/block`: بلاک کاربر
- `/block 123456789`: بلاک با آیدی عددی
- `/block @username`: فقط اگر کاربر قبلاً به ربات پیام داده و یوزرنیمش در دیتابیس ثبت شده باشد
- `/unblock 123456789`: رفع بلاک
- `/blocked`: فهرست بلاک‌شده‌ها و دکمه رفع بلاک

## محدودیت‌های Telegram Bot API

- ربات نمی‌تواند یوزرنیم دلخواهی را که قبلاً در دیتابیس ثبت نشده به آیدی عددی تبدیل کند.
- Bot API برای گفت‌وگوهای خصوصی عادی، آپدیت حذف پیام را ارائه نمی‌کند؛ بنابراین حذف دوطرفهٔ خودکار قابل پیاده‌سازی نیست.
- تلگرام در چت خصوصی عادی، واکنش‌هایی را که خود کاربر یا مدیر مستقیماً روی پیام می‌گذارد به ربات گزارش نمی‌کند. برای همین زیر پیام‌های دو طرف، دکمه‌های واکنش قرار می‌گیرد؛ انتخاب هر دکمه با `setMessageReaction` روی پیام متناظر در سمت مقابل ثبت می‌شود. ربات در هر پیام حداکثر یک واکنش فعال می‌کند.
- ضداسپم فعلی مبتنی بر محدودیت تعداد پیام در بازه زمانی است؛ CAPTCHA در این نسخه اضافه نشده است.
