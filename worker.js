import { Bot, webhookCallback } from 'grammy';

let bot;
let ADMIN_ID;
let DB;

// ... توابع کمکی addUser, getUserState, setUserState, clearUserState (همون قبلی)
async function addUser(telegram_id, username, first_name) {
  await DB.prepare(
    `INSERT OR IGNORE INTO users (telegram_id, username, first_name) VALUES (?, ?, ?)`
  ).bind(telegram_id, username || null, first_name || null).run();
}

async function getUserState(telegram_id) {
  const row = await DB.prepare(
    `SELECT state, message FROM user_states WHERE telegram_id = ?`
  ).bind(telegram_id).first();
  return row || null;
}

async function setUserState(telegram_id, state, message = null) {
  await DB.prepare(
    `INSERT OR REPLACE INTO user_states (telegram_id, state, message) VALUES (?, ?, ?)`
  ).bind(telegram_id, state, message).run();
}

async function clearUserState(telegram_id) {
  await DB.prepare(
    `DELETE FROM user_states WHERE telegram_id = ?`
  ).bind(telegram_id).run();
}

// ... بقیه منطق ربات (همون کد قبلی)

function initBot(env) {
  DB = env.DB;
  ADMIN_ID = parseInt(env.ADMIN_ID);
  bot = new Bot(env.BOT_TOKEN);

  // ... تمام handlerها (start, hears, callback, ...)
  // (عیناً از پاسخ قبلی کپی کن)
}

// خروجی مناسب Pages: یک fetch handler
export default {
  async fetch(request, env) {
    if (!bot) initBot(env);
    const handler = webhookCallback(bot, 'cloudflare-mod');
    return handler(request);
  }
};