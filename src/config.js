export function loadConfig(env) {
  if (!env.BOT_TOKEN) {
    throw new Error('❌ BOT_TOKEN در متغیرهای محیطی تنظیم نشده است.');
  }

  return {
    BOT_TOKEN: env.BOT_TOKEN,
    DB: env.DB,
  };
}