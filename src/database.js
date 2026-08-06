export async function initDB(db) {
  try {
    await db
      .prepare(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          telegram_id INTEGER UNIQUE NOT NULL,
          username TEXT,
          first_name TEXT,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `)
      .run();

    console.log("Database initialized");
  } catch (error) {
    console.error("Database init failed:", error);
    throw error;
  }
}


export async function saveUser(db, user) {
  try {
    if (!user?.id) {
      console.log("No user id");
      return;
    }

    const {
      id: telegram_id,
      username = null,
      first_name = null,
    } = user;


    await db
      .prepare(`
        INSERT OR IGNORE INTO users
        (telegram_id, username, first_name)
        VALUES (?, ?, ?)
      `)
      .bind(
        telegram_id,
        username,
        first_name
      )
      .run();


    console.log("User saved:", telegram_id);

  } catch (error) {
    console.error("Save user failed:", error);
  }
}


export async function userExists(db, telegramId) {
  try {
    const result = await db
      .prepare(
        "SELECT telegram_id FROM users WHERE telegram_id = ?"
      )
      .bind(telegramId)
      .first();

    return !!result;

  } catch (error) {
    console.error("Check user failed:", error);
    return false;
  }
}