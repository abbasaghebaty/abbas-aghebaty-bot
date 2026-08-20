export async function upsertUser(db, from) {
  await db
    .prepare(
      `INSERT INTO users (
        telegram_id,
        username,
        first_name,
        created_at
      )
      VALUES (?, ?, ?, datetime('now'))

      ON CONFLICT(telegram_id)
      DO UPDATE SET
        username = excluded.username,
        first_name = excluded.first_name`
    )
    .bind(
      from.id,
      from.username ?? null,
      from.first_name ?? null
    )
    .run();
}
