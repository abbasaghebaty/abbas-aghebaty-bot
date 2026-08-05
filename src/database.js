// database.js
export async function initDB(db) {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      telegram_id INTEGER UNIQUE NOT NULL,
      username TEXT,
      first_name TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);
}

export async function saveUser(db, user) {
  const { id: telegram_id, username, first_name } = user;
  await db
    .prepare(
      `INSERT OR IGNORE INTO users (telegram_id, username, first_name)
       VALUES (?, ?, ?)`
    )
    .bind(telegram_id, username, first_name)
    .run();
}

export async function userExists(db, telegramId) {
  const result = await db
    .prepare("SELECT telegram_id FROM users WHERE telegram_id = ?")
    .bind(telegramId)
    .first();
  return !!result;
}
