export async function initDB(db) {

  await db.prepare(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      telegram_id INTEGER UNIQUE NOT NULL,
      username TEXT,
      first_name TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `).run();


  await db.prepare(`
    CREATE TABLE IF NOT EXISTS user_states (
      telegram_id INTEGER PRIMARY KEY,
      state TEXT,
      message TEXT
    )
  `).run();


  console.log("Database initialized");

}




export async function saveUser(db, user) {


  if(!user?.id) return;


  await db.prepare(`
    INSERT INTO users
    (
      telegram_id,
      username,
      first_name
    )
    VALUES (?,?,?)

    ON CONFLICT(telegram_id)

    DO UPDATE SET

    username=excluded.username,

    first_name=excluded.first_name
  `)
  .bind(
    user.id,
    user.username || null,
    user.first_name || null
  )
  .run();


}




export async function getUser(db, telegramId){

  return await db.prepare(`
    SELECT *
    FROM users
    WHERE telegram_id=?
  `)
  .bind(telegramId)
  .first();

}




export async function setUserState(
  db,
  telegramId,
  state,
  message=null
){

 await db.prepare(`
  INSERT INTO user_states
  (
   telegram_id,
   state,
   message
  )

  VALUES (?,?,?)

  ON CONFLICT(telegram_id)

  DO UPDATE SET

  state=excluded.state,

  message=excluded.message
 `)
 .bind(
   telegramId,
   state,
   message
 )
 .run();


}




export async function getUserState(
 db,
 telegramId
){

 return await db.prepare(`
  SELECT *
  FROM user_states
  WHERE telegram_id=?
 `)
 .bind(telegramId)
 .first();

}




export async function clearUserState(
 db,
 telegramId
){

 await db.prepare(`
  DELETE FROM user_states
  WHERE telegram_id=?
 `)
 .bind(telegramId)
 .run();

}