# Abbas Aghebaty Bot

ربات دستیار عباس؛ شامل بخش‌های عمومی، پشتیبانی، حسابداری و ماژول‌های مستقل مدیریتی.

## ساختار پروژه

| مسیر | مسئولیت |
|---|---|
| `src/index.js` | ورودی Cloudflare Worker، وب‌هوک تلگرام، endpointهای داخلی و اجرای Cron |
| `src/bot/createBot.js` | ساخت Bot و ثبت ماژول‌ها؛ ترتیب ثبت هندلرها مهم است |
| `src/config/` | نام دکمه‌ها، استایل‌ها و تنظیمات ثابت |
| `src/keyboards/` | ساخت کیبوردهای Reply و Inline |
| `src/handlers/` | هندلرهای عمومی منو، شروع، مهارت‌ها و شبکه‌های اجتماعی |
| `src/modules/accounting.js` | منطق بخش حسابداری؛ مستقل از پیام‌رسانی |
| `src/modules/googleSheets.js` | اتصال امن به Google Sheets |
| `src/modules/support.js` | جریان گفت‌وگوی پشتیبانی |
| `src/modules/supportDeliveryQueue.js` | صف تحویل و تلاش مجدد پیام‌های پشتیبانی |
| `src/modules/messaging/` | ماژول مستقل پیام‌رسانی مرکزی |
| `migrations/` | تغییرات افزایشی دیتابیس D1 |
| `schema.sql` | ساختار پایه و جداول اصلی دیتابیس |

## ماژول پیام‌رسانی

این ماژول از پنل مدیر با دکمه **پیام‌رسانی** باز می‌شود و دو جریان دارد:

1. **ارسال همگانی:** انتخاب یک یا چند ربات مقصد، نوشتن متن در همان لحظه، مشاهده پیش‌نمایش و تأیید نهایی.
2. **ارسال فردی:** انتخاب یک یا چند ربات، وارد کردن شناسه عددی تلگرام کاربر، نوشتن پیام و تأیید نهایی.

پیام بدون تأیید مدیر وارد صف نمی‌شود. متن فعلاً به‌صورت متن ساده ارسال می‌شود و سقف طول آن ۴۰۹۶ نویسه است.

### فایل‌های ماژول

| فایل | مسئولیت |
|---|---|
| `src/modules/messaging/index.js` | منوی پیام‌رسانی، انتخاب ربات‌ها، دریافت شناسه/متن و تأیید ارسال |
| `src/modules/messaging/queue.js` | ساخت کمپین، ایجاد گیرنده‌ها در D1، ارسال تدریجی، ثبت نتیجه و تلاش مجدد پس از خطای 429 |
| `src/modules/messaging/audience.js` | خواندن تنظیمات ربات‌های متصل و endpoint امن همگام‌سازی مخاطبان |
| `src/keyboards/accounting.js` | کیبورد اصلی مدیر؛ دکمه پیام‌رسانی در کنار حسابداری |
| `migrations/0007_messaging_module.sql` | جداول مخاطبان همگام‌شده، نشست مدیر، کمپین‌ها و صف تحویل |

### معماری چندرباتی

هر ربات مقصد می‌تواند Worker و دیتابیس مستقل داشته باشد. ارسال پیام با **توکن همان ربات مقصد** انجام می‌شود؛ ربات دستیار فقط پنل فرماندهی و صف مرکزی را نگه می‌دارد.

- مخاطبان خود ربات دستیار از جدول فعلی `users` خوانده می‌شوند.
- مخاطبان ربات‌های دیگر در جدول مرکزی `messaging_audience` نگهداری می‌شوند.
- چون D1 ربات‌های مستقل مستقیماً در دسترس Worker دستیار نیستند، هر ربات متصل باید کاربران خودش را به endpoint مرکزی همگام کند.
- همگام‌سازی با Secret مشترک انجام می‌شود؛ توکن ربات‌ها در کد یا دیتابیس ذخیره نمی‌شوند.

### تنظیم Secrets

در Cloudflare Worker ربات دستیار این Secrets را تنظیم کن:

- `MESSAGING_SYNC_SECRET`: یک مقدار تصادفی و محرمانه که در Workerهای متصل نیز به‌عنوان Secret مشترک قرار می‌گیرد.
- `MESSAGING_BOTS_JSON`: آرایه JSON شامل ربات‌های مقصد، به‌جز ربات دستیار که خودکار اضافه می‌شود.

نمونه ساختار `MESSAGING_BOTS_JSON` (توکن‌ها را با مقادیر واقعی جایگزین کن و این نمونه را در Git قرار نده):

```json
[
  {
    "id": "shop",
    "name": "ربات کسب‌وکار",
    "token": "BOT_TOKEN"
  },
  {
    "id": "community",
    "name": "ربات کامیونیتی",
    "token": "BOT_TOKEN"
  }
]
```

شناسه `id` باید یکتا و فقط شامل حروف انگلیسی، عدد، خط تیره یا زیرخط باشد. نام فقط برای نمایش در پنل است.

### اتصال مخاطبان هر ربات مستقل

پس از اینکه کاربر در ربات خودش ثبت شد، Worker آن ربات باید اطلاعات همان کاربر را به endpoint زیر بفرستد:

`POST https://<ASSISTANT-WORKER-DOMAIN>/internal/messaging/sync-users`

هدر:

`Authorization: Bearer <MESSAGING_SYNC_SECRET>`

بدنه:

```json
{
  "bot_id": "shop",
  "users": [
    {
      "telegram_id": 123456789,
      "username": "sample",
      "first_name": "Sample"
    }
  ]
}
```

هر درخواست حداکثر ۵۰۰ کاربر می‌پذیرد. برای اتصال واقعی هر ربات، باید در کد همان Worker یک همگام‌سازی پس‌زمینه یا فراخوانی پس از ثبت/به‌روزرسانی کاربر اضافه شود. دیتابیس مستقل آن ربات تغییر ساختاری لازم ندارد.

### صف و محدودیت‌های تلگرام

- کمپین و تک‌تک تحویل‌ها در D1 ثبت می‌شوند؛ قطع شدن اجرای Worker باعث از دست رفتن صف نمی‌شود.
- Cron هر دقیقه صف را پردازش می‌کند و ارسال با فاصله زمانی محافظه‌کارانه انجام می‌شود.
- خطای 429 و مقدار `retry_after` مدیریت می‌شود و تحویل مربوطه برای زمان مناسب‌تری به صف برمی‌گردد.
- خطاهای دائمی مانند مسدود بودن ربات توسط کاربر به‌عنوان ناموفق ثبت می‌شوند.
- تأخیر، محدودیت تلگرام را حذف نمی‌کند؛ فقط نرخ ارسال را کنترل می‌کند.
- هر ربات فقط می‌تواند به کاربرانی پیام بدهد که قبلاً همان ربات را شروع کرده‌اند و هنوز امکان دریافت پیام از آن را دارند.

### راه‌اندازی نسخه پیام‌رسانی

1. اجرای migration جدید روی دیتابیس D1 ربات دستیار:
   `npx wrangler d1 migrations apply abbas-aghebaty-bot --remote`
2. تنظیم Secrets بالا در Cloudflare Worker.
3. Deploy نسخه جدید ربات دستیار.
4. افزودن اتصال همگام‌سازی به هر Worker مقصد و قرار دادن شناسه همان ربات در `MESSAGING_BOTS_JSON`.
5. آزمایش ابتدا با ارسال فردی به حساب آزمایشی و سپس یک کمپین کوچک.

## نکات توسعه

- قابلیت جدید را در پوشه ماژول خودش اضافه کن؛ از قرار دادن منطق چند ماژول در `src/index.js` یا `createBot.js` خودداری کن.
- `createBot.js` فقط باید ماژول‌ها را ثبت کند.
- برای هر تغییر ساختار D1، migration جدید بساز؛ migration قبلی را ویرایش نکن.
- توکن‌ها و رمزهای مشترک فقط در Cloudflare Secrets باشند.
- هنگام افزودن هندلر عمومی پیام، ترتیب ثبت در `createBot.js` را بررسی کن تا ورودی‌های مرحله‌ای ماژول‌ها تداخل نکنند.

نمونه تابع همگام‌سازی برای Worker ربات مقصد:

```js
export async function syncUsersToAssistant(env, users) {
  const endpoint = env.ASSISTANT_MESSAGING_SYNC_URL;
  const secret = env.MESSAGING_SYNC_SECRET;
  const botId = env.MESSAGING_BOT_ID;

  if (!endpoint || !secret || !botId) {
    throw new Error("Messaging sync environment is incomplete.");
  }

  for (let i = 0; i < users.length; i += 500) {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${secret}`,
      },
      body: JSON.stringify({
        bot_id: botId,
        users: users.slice(i, i + 500).map((user) => ({
          telegram_id: user.telegram_id,
          username: user.username ?? null,
          first_name: user.first_name ?? null,
        })),
      }),
    });

    if (!response.ok) {
      throw new Error(`Audience sync failed: ${response.status}`);
    }
  }
}
```

برای همگام‌سازی اولیه کاربران قدیمی، یک‌بار فهرست کاربران موجود در دیتابیس همان ربات را با همین تابع ارسال کن. بعد از آن، تابع را پس از ثبت یا به‌روزرسانی کاربر فراخوانی کن. در Worker مقصد، `ASSISTANT_MESSAGING_SYNC_URL` و `MESSAGING_BOT_ID` را به‌صورت متغیر و `MESSAGING_SYNC_SECRET` را به‌صورت Secret تعریف کن.
