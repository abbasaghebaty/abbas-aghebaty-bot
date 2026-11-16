-- Ensure the legacy state table exists for the keyboard-driven admin messaging flows.
-- Existing user states are preserved; only the admin flow uses dedicated state values.
CREATE TABLE IF NOT EXISTS user_states (
  telegram_id INTEGER PRIMARY KEY,
  state TEXT,
  message TEXT
);
