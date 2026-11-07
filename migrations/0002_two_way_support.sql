-- Additive migration: preserves existing users and bot data.

CREATE TABLE IF NOT EXISTS support_user_states (
  user_id INTEGER PRIMARY KEY,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS support_blocked_users (
  user_id INTEGER PRIMARY KEY,
  blocked_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS support_message_map (
  chat_id INTEGER NOT NULL,
  message_id INTEGER NOT NULL,
  peer_chat_id INTEGER NOT NULL,
  peer_message_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (chat_id, message_id)
);

CREATE INDEX IF NOT EXISTS idx_support_message_map_user
  ON support_message_map(user_id);

CREATE TABLE IF NOT EXISTS support_rate_limits (
  user_id INTEGER PRIMARY KEY,
  window_started_at INTEGER NOT NULL,
  message_count INTEGER NOT NULL DEFAULT 0
);
