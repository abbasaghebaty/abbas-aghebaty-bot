import { ACCOUNTING_BUTTON, ACCOUNTING_BACK_BUTTON } from "../../config/accounting.js";
import { WELCOME_TEXT } from "../../texts/general.js";
import { mainKeyboard } from "../../keyboards/main.js";
import {
  accountingAdminKeyboard,
  accountingBackKeyboard,
  accountingMenuKeyboard,
} from "../../keyboards/accounting.js";
import { readAccountingSheet } from "./googleSheets.js";

function isAdmin(ctx, env) {
  return Boolean(ctx.from) && String(ctx.from.id) === String(env.ADMIN_ID);
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatSheet(title, values) {
  if (!values.length) return "<b>" + escapeHtml(title) + "</b>\n\nهنوز داده‌ای برای نمایش وجود ندارد.";

  const lines = values
    .map((row, index) => {
      const cells = (row ?? [])
        .map((cell) => cell === "" || cell == null ? null : escapeHtml(cell))
        .filter((cell) => cell !== null);
      return cells.length ? (index + 1) + ". " + cells.join(" | ") : null;
    })
    .filter(Boolean);

  const content = lines.slice(0, 35).join("\n") || "اطلاعاتی برای نمایش وجود ندارد.";
  const suffix = lines.length > 35 ? "\n… ادامه اطلاعات در نسخه بعدی نمایش داده می‌شود." : "";
  const message = "<b>" + escapeHtml(title) + "</b>\n\n" + content + suffix;
  return message.length > 3800 ? message.slice(0, 3790) + "…" : message;
}

export function registerAccountingHandlers(bot, env) {
  bot.hears(ACCOUNTING_BUTTON, async (ctx) => {
    if (!isAdmin(ctx, env)) return;
    await ctx.reply("پنل حسابداری\n\nبخش موردنظر را انتخاب کن:", {
      reply_markup: accountingMenuKeyboard(),
    });
    await ctx.reply("برای خروج از پنل از دکمه زیر استفاده کن.", {
      reply_markup: accountingBackKeyboard(),
    });
  });

  bot.hears(ACCOUNTING_BACK_BUTTON, async (ctx) => {
    if (!isAdmin(ctx, env)) return;
    await ctx.reply(WELCOME_TEXT, {
      parse_mode: "HTML",
      link_preview_options: { is_disabled: true },
      reply_markup: mainKeyboard(),
    });
  });

  bot.callbackQuery(/^acc:(dashboard|debts|assets|monitoring)$/, async (ctx) => {
    if (!isAdmin(ctx, env)) {
      await ctx.answerCallbackQuery({ text: "دسترسی مجاز نیست.", show_alert: true });
      return;
    }

    const key = ctx.callbackQuery.data.slice(4);
    await ctx.answerCallbackQuery();

    if (key === "monitoring") {
      await ctx.reply("بخش مانیتورینگ در مرحله بعدی توسعه اضافه می‌شود.", {
        reply_markup: accountingMenuKeyboard(),
      });
      return;
    }

    try {
      const sheet = await readAccountingSheet(env, key);
      await ctx.reply(formatSheet(sheet.title, sheet.values), {
        parse_mode: "HTML",
        reply_markup: accountingMenuKeyboard(),
      });
    } catch (error) {
      console.error("Accounting read failed:", error);
      await ctx.reply("خطا در دریافت اطلاعات حسابداری:\n" + error.message, {
        reply_markup: accountingMenuKeyboard(),
      });
    }
  });
}
