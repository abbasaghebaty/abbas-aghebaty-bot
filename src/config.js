export function loadConfig(env) {

  if (!env.BOT_TOKEN) {
    throw new Error("❌ BOT_TOKEN تنظیم نشده");
  }

  if (!env.ADMIN_ID) {
    throw new Error("❌ ADMIN_ID تنظیم نشده");
  }


  return {
    BOT_TOKEN: env.BOT_TOKEN,
    DB: env.DB,
    ADMIN_ID: Number(env.ADMIN_ID)
  };

}