================================================
FILE: README.md
================================================
# abbas-aghebaty-bot


================================================
FILE: package.json
================================================
{
  "name": "abbas-assistant-bot",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "wrangler dev src/index.js",
    "deploy": "wrangler deploy src/index.js"
  },
  "dependencies": {
    "grammy": "^1.21.1"
  },
  "devDependencies": {
    "wrangler": "^3.0.0"
  }
}



================================================
FILE: wrangler.toml
================================================
name = "abbas-aghebaty-bot"
main = "src/index.js"
compatibility_date = "2024-04-05"

[[d1_databases]]
binding = "DB"
database_name = "abbas-aghebaty-bot"
database_id = "df9f5c73-eedb-4352-bde6-5b8aea6167e0"



================================================
FILE: src/config.js
================================================
export const BOT_TOKEN = env.BOT_TOKEN; // از wrangler secrets
export const DB = env.DB;               // binding دیتابیس



================================================
FILE: src/database.js
================================================
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



================================================
FILE: src/index.js
================================================
import { Bot } from "grammy";
import { initDB } from "./database.js";
import { setupStart } from "./handlers/start.js";
import { setupMenu } from "./handlers/menu.js";
import { setupMessages } from "./handlers/messages.js";

let dbInitialized = false;

export default {
  async fetch(request, env) {
    // پاسخ به مرورگر (درخواست GET)
    if (request.method !== "POST") {
      return new Response("🤖 Abbas Assistant Bot is running.", {
        status: 200,
      });
    }

    try {
      // یک‌بار ساختن جدول دیتابیس
      if (!dbInitialized && env.DB) {
        await initDB(env.DB);
        dbInitialized = true;
      }

      const bot = new Bot(env.BOT_TOKEN);

      // در دسترس قرار دادن env برای همه هندلرها
      bot.use((ctx, next) => {
        ctx.env = env;
        return next();
      });

      // ثبت هندلرها
      setupStart(bot);
      setupMenu(bot);
      setupMessages(bot);

      return await bot.fetch(request);
    } catch (error) {
      console.error("Bot error:", error);
      return new Response("Internal Server Error", { status: 500 });
    }
  },
};


================================================
FILE: src/data/content.js
================================================
export default {
  welcome: "سلام.\nمن منشی عباس هستم.\nچه کاری میتونم برات انجام بدم؟",
  about: "عباس یک توسعه‌دهنده وب با تجربه در ...",
  social_links: [
    { name: "تلگرام", url: "https://t.me/abbas" },
    { name: "اینستاگرام", url: "https://instagram.com/abbas" }
  ],
  buy_text: "برای خرید فیلترشکن ویتوری به آیدی زیر پیام بده:\n@abbas_support",
  anonymous_prompt: "پیام ناشناس خود را بنویسید و ارسال کنید.",
  anonymous_thanks: "پیام شما به عباس ارسال شد.",
  buttons: {
    about: "درباره من",
    social: "شبکه‌های اجتماعی",
    anonymous: "ارسال پیام ناشناس",
    buy: "خرید فیلترشکن ویتوری"
  }
};



================================================
FILE: src/handlers/menu.js
================================================
import content from "../data/content.js";

export function setupMenu(bot) {
  bot.callbackQuery("about", async (ctx) => {
    await ctx.answerCallbackQuery();
    await ctx.reply(content.about);
  });

  bot.callbackQuery("social", async (ctx) => {
    await ctx.answerCallbackQuery();
    const links = content.social_links
      .map((l) => `• <a href="${l.url}">${l.name}</a>`)
      .join("\n");
    await ctx.reply(links, { parse_mode: "HTML" });
  });

  bot.callbackQuery("anonymous", async (ctx) => {
    await ctx.answerCallbackQuery();
    // در نسخه‌های بعدی اینجا جلسه را ذخیره می‌کنیم
    await ctx.reply(content.anonymous_prompt);
  });

  bot.callbackQuery("buy", async (ctx) => {
    await ctx.answerCallbackQuery();
    await ctx.reply(content.buy_text);
  });
}



================================================
FILE: src/handlers/messages.js
================================================
import content from "../data/content.js";

export function setupMessages(bot) {
  bot.on("message:text", async (ctx) => {
    // در این نسخه فقط پیام‌های ناشناس احتمالی را می‌گیریم
    // (برای سادگی فعلاً هیچ کاری انجام نمی‌دهد)
    // می‌توانیم بعداً از session برای تشخیص استفاده کنیم
    await ctx.reply(content.anonymous_thanks);
  });
}



================================================
FILE: src/handlers/start.js
================================================
import { saveUser } from "../database.js";
import content from "../data/content.js";
import { mainKeyboard } from "../keyboards/mainKeyboard.js";

export function setupStart(bot) {
  bot.command("start", async (ctx) => {
    const user = ctx.from;
    await saveUser(ctx.env.DB, user);
    await ctx.reply(content.welcome, {
      reply_markup: mainKeyboard(),
    });
  });
}



================================================
FILE: src/keyboards/mainKeyboard.js
================================================
import { InlineKeyboard } from "grammy";
import content from "../data/content.js";

export function mainKeyboard() {
  const { buttons } = content;
  return new InlineKeyboard()
    .text(buttons.about, "about")
    .row()
    .text(buttons.social, "social")
    .row()
    .text(buttons.anonymous, "anonymous")
    .row()
    .text(buttons.buy, "buy");
}


