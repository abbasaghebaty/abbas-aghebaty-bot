-- جدول کاربران
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  telegram_id INTEGER UNIQUE NOT NULL,
  username TEXT,
  first_name TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- جدول وضعیت‌ها (برای مدیریت جریان "ارسال پیام ناشناس")
-- state ممکن است یکی از این مقادیر را داشته باشد:
--   'awaiting_message'      -> منتظر متن پیام از کاربر
--   'awaiting_confirmation' -> پیام گرفته شده، منتظر تایید یا لغو کاربر
CREATE TABLE IF NOT EXISTS user_states (
  telegram_id INTEGER PRIMARY KEY,
  state TEXT,
  message TEXT
);

-- جدول کمکی برای اینکه وقتی عباس روی یک پیام Reply می‌زند،
-- بفهمیم آن پیام مربوط به کدام کاربر بوده است
CREATE TABLE IF NOT EXISTS admin_messages (
  message_id INTEGER PRIMARY KEY,
  telegram_id INTEGER NOT NULL
);
