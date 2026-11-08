-- Additive migration: tracks admin support notifications and unread state.
-- Existing users, messages, and mappings are preserved.
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
