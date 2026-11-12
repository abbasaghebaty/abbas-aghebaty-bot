# راه‌اندازی حسابداری Google Sheets

## Secret در Cloudflare

در تنظیمات Worker با نام `abbas-aghebaty-bot` یک Secret با نام دقیق زیر بساز:

`GOOGLE_SERVICE_ACCOUNT_JSON`

مقدار آن باید کل JSON دانلودشده از Google Cloud برای Service Account باشد؛ از `{` ابتدایی تا `}` انتهایی. خود JSON را در GitHub، فایل wrangler.toml یا کد قرار نده.

## دسترسی Google Sheet

ایمیل موجود در فیلد `client_email` فایل JSON را پیدا کن و فایل Google Sheet را با همان ایمیل Share کن. دسترسی Viewer برای قابلیت فعلیِ فقط‌خواندنی کافی است.

شناسه شیت در ماژول اتصال تنظیم شده و به این فایل اشاره می‌کند:
`1_jUt1pw5bY0UuzZIVzNVY2PQ-CJP_liyK1eUQceyYkQ`

## API

در همان Google Cloud Project که Service Account در آن ساخته شده، Google Sheets API باید فعال باشد.

## پنل ربات

- فقط شناسه `ADMIN_ID` منوی حسابداری را می‌بیند.
- کاربران عادی همان منوی قبلی را می‌بینند.
- بخش‌ها: داشبورد، سرمایه و دارایی، بدهی و طلب، ساعت کاری مغازه.
- نسخه فعلی فقط اطلاعات را می‌خواند و هیچ سلولی را تغییر نمی‌دهد.

## استقرار

پس از افزودن Secret، Worker را Deploy کن. سپس در ربات `/start` بزن و از دکمه «حسابداری» وارد شو.

اگر خطای دسترسی 403 دیدی، اشتراک‌گذاری Sheet با `client_email` و فعال بودن Sheets API را بررسی کن.
