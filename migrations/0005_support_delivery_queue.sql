-- Durable outbox for administrator replies to support users.
-- Existing support messages and message mappings are preserved.
CREATE TABLE IF NOT EXISTS support_delivery_queue (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  admin_chat_id INTEGER NOT NULL,
  admin_message_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  target_chat_id INTEGER NOT NULL,
  reply_to_message_id INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'sent', 'failed')),
  attempts INTEGER NOT NULL DEFAULT 0,
  next_attempt_at INTEGER NOT NULL DEFAULT 0,
  locked_until INTEGER,
  last_error TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  sent_at INTEGER,
  notified_at INTEGER,
  UNIQUE(admin_chat_id, admin_message_id)
);

CREATE INDEX IF NOT EXISTS idx_support_delivery_queue_due
  ON support_delivery_queue(status, next_attempt_at, locked_until);
