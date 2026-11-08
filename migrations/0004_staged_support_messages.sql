-- Stage support messages until the user explicitly ends the conversation.
-- Existing bot data and support message mappings are preserved.
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
