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

-- جداول ماژول پیام‌رسانی (هم‌راستا با migrations/0007_messaging_module.sql)
CREATE TABLE IF NOT EXISTS messaging_audience (
  bot_id TEXT NOT NULL,
  telegram_id INTEGER NOT NULL,
  username TEXT,
  first_name TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (bot_id, telegram_id)
);

CREATE TABLE IF NOT EXISTS messaging_sessions (
  admin_id INTEGER PRIMARY KEY,
  session_json TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS messaging_campaigns (
  id TEXT PRIMARY KEY,
  mode TEXT NOT NULL CHECK (mode IN ('broadcast', 'individual')),
  target_ids TEXT NOT NULL,
  message_text TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  finished_at TEXT
);

CREATE TABLE IF NOT EXISTS messaging_deliveries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  campaign_id TEXT NOT NULL,
  target_id TEXT NOT NULL,
  chat_id INTEGER NOT NULL,
  message_text TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  attempts INTEGER NOT NULL DEFAULT 0,
  next_attempt_at TEXT NOT NULL DEFAULT (datetime('now')),
  locked_until TEXT,
  last_error TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  sent_at TEXT,
  UNIQUE (campaign_id, target_id, chat_id),
  FOREIGN KEY (campaign_id) REFERENCES messaging_campaigns(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_messaging_deliveries_queue
ON messaging_deliveries(status, next_attempt_at, locked_until, created_at);
CREATE INDEX IF NOT EXISTS idx_messaging_deliveries_campaign
ON messaging_deliveries(campaign_id, status);
