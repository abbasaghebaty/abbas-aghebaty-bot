import {readSheetRanges} from "./googleSheets.js";
import {
  accountingKeyboard,
  accountingBackKeyboard,
  accountingDebtsKeyboard
} from "../keyboards/accounting.js";

const OPTIONS = {
  parse_mode: "HTML",
  link_preview_options: { is_disabled: true }
};
const TELEGRAM_LIMIT = 3900;
const DEBT_PAGE_SIZE = 8;

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function cleanRows(rows) {
  return (rows || []).filter(row =>
    Array.isArray(row) &&
    row.some(cell => String(cell ?? "").trim() !== "")
  );
}

function formatAssets(rows) {
  const data = cleanRows(rows).slice(1);
  if (!data.length) {
    return "<b>📦 سرمایه و دارایی</b>\n\nهنوز کالایی ثبت نشده است.";
  }

  const cards = data.map((row, index) => {
    const name = escapeHtml(row[0] || "کالای بدون نام");
    const fields = [
      row[1] !== undefined && row[1] !== "" ? `📦 موجودی: <b>${escapeHtml(row[1])}</b>` : "",
      row[2] !== undefined && row[2] !== "" ? `🛒 خرید: ${escapeHtml(row[2])}` : "",
      row[3] !== undefined && row[3] !== "" ? `🏷 فروش: ${escapeHtml(row[3])}` : "",
      row[4] !== undefined && row[4] !== "" ? `💰 سود خالص: <b>${escapeHtml(row[4])}</b>` : "",
      row[5] !== undefined && row[5] !== "" ? `💳 دریافتی: ${escapeHtml(row[5])}` : "",
      row[6] !== undefined && row[6] !== "" ? `📈 درصد سود: ${escapeHtml(row[6])}` : ""
    ].filter(Boolean);

    return `<b>${index + 1}. ${name}</b>\n${fields.join("\n")}`;
  });

  let output = `<b>📦 سرمایه و دارایی</b>\n<i>موجودی و اطلاعات قیمت کالاها</i>\n\n${cards.join("\n\n──────────────\n\n")}`;
  if (output.length > TELEGRAM_LIMIT) {
    output = output.slice(0, TELEGRAM_LIMIT - 100) +
      "\n\n<i>ادامه فهرست در این پیام جا نشد؛ برای دیدن همه کالاها تعداد موارد باید صفحه‌بندی شود.</i>";
  }
  return output;
}

function formatDebtStatus(value) {
  const normalized = String(value ?? "").trim().toUpperCase();
  if (normalized === "TRUE" || normalized === "1" || normalized === "YES") {
    return "✅ تسویه‌شده";
  }
  if (normalized === "FALSE" || normalized === "0" || normalized === "NO") {
    return "🕓 در انتظار تسویه";
  }
  return value ? escapeHtml(value) : "—";
}

function formatDebtCard(row, index) {
  const title = escapeHtml(row[0] || "تراکنش بدون عنوان");
  const person = escapeHtml(row[1] || "نامشخص");
  const type = String(row[2] || "").trim();
  const amount = escapeHtml(row[3] || "—");
  const status = formatDebtStatus(row[4]);
  const note = row[5] ? `\n📝 توضیح: ${escapeHtml(row[5])}` : "";
  const deadline = row[6] ? `\n📅 مهلت: ${escapeHtml(row[6])}` : "";

  let typeLabel = type;
  if (type === "طلب") typeLabel = "🟢 طلب";
  else if (type === "بدهی") typeLabel = "🔴 بدهی";

  return `<b>${index}. ${title}</b>\n👤 شخص: ${person}\n🔖 نوع: ${escapeHtml(typeLabel || "نامشخص")}\n💵 مبلغ: <b>${amount}</b>\n📌 وضعیت: ${status}${note}${deadline}`;
}

async function readRange(env, range) {
  const [result] = await readSheetRanges(env, [range]);
  return result?.values || [];
}

async function renderAssets(ctx, env) {
  try {
    const rows = await readRange(env, "'سرمایه و دارایی'!A1:G60");
    await ctx.editMessageText(formatAssets(rows), {
      ...OPTIONS,
      reply_markup: accountingBackKeyboard()
    });
  } catch (error) {
    console.error("Accounting assets read failed:", error);
    await ctx.editMessageText(
      `❌ <b>دریافت اطلاعات سرمایه و دارایی ناموفق بود</b>\n\n${escapeHtml(error.message || "خطای نامشخص")}`,
      { ...OPTIONS, reply_markup: accountingBackKeyboard() }
    );
  }
}

async function renderDebts(ctx, env, requestedPage = 0) {
  try {
    const rows = cleanRows(await readRange(env, "'بدهی و طلب'!A1:G100"));
    const data = rows.slice(1);
    if (!data.length) {
      await ctx.editMessageText(
        "<b>🧾 بدهی و طلب</b>\n\nموردی ثبت نشده است.",
        { ...OPTIONS, reply_markup: accountingBackKeyboard() }
      );
      return;
    }

    const totalPages = Math.ceil(data.length / DEBT_PAGE_SIZE);
    const page = Math.max(0, Math.min(Number(requestedPage) || 0, totalPages - 1));
    const start = page * DEBT_PAGE_SIZE;
    const visible = data.slice(start, start + DEBT_PAGE_SIZE);
    const cards = visible.map((row, index) => formatDebtCard(row, start + index + 1));

    const message = [
      "<b>🧾 بدهی و طلب</b>",
      "<i>وضعیت هر مورد و شخص مربوطه</i>",
      "",
      cards.join("\n\n──────────────\n\n"),
      "",
      `<i>صفحه ${page + 1} از ${totalPages} · مجموع ${data.length} مورد</i>`
    ].join("\n");

    await ctx.editMessageText(message, {
      ...OPTIONS,
      reply_markup: accountingDebtsKeyboard(page, totalPages)
    });
  } catch (error) {
    console.error("Accounting debts read failed:", error);
    await ctx.editMessageText(
      `❌ <b>دریافت اطلاعات بدهی و طلب ناموفق بود</b>\n\n${escapeHtml(error.message || "خطای نامشخص")}`,
      { ...OPTIONS, reply_markup: accountingBackKeyboard() }
    );
  }
}

export function registerAccountingHandlers(bot, env) {
  const isAdmin = ctx => String(ctx.from?.id) === String(env.ADMIN_ID);

  bot.hears("حسابداری", async ctx => {
    if (!isAdmin(ctx)) return;
    await ctx.reply(
      "🧾 <b>بخش حسابداری</b>\n\nبخش موردنظر را انتخاب کن:",
      { ...OPTIONS, reply_markup: accountingKeyboard() }
    );
  });

  bot.callbackQuery(["acct_assets"], async ctx => {
    if (!isAdmin(ctx)) {
      await ctx.answerCallbackQuery({ text: "دسترسی مجاز نیست.", show_alert: true });
      return;
    }
    await ctx.answerCallbackQuery();
    await renderAssets(ctx, env);
  });

  bot.callbackQuery("acct_debts", async ctx => {
    if (!isAdmin(ctx)) {
      await ctx.answerCallbackQuery({ text: "دسترسی مجاز نیست.", show_alert: true });
      return;
    }
    await ctx.answerCallbackQuery();
    await renderDebts(ctx, env, 0);
  });

  bot.callbackQuery(/^acct_debts_page_(\d+)$/, async ctx => {
    if (!isAdmin(ctx)) {
      await ctx.answerCallbackQuery({ text: "دسترسی مجاز نیست.", show_alert: true });
      return;
    }
    await ctx.answerCallbackQuery();
    await renderDebts(ctx, env, Number(ctx.match[1]));
  });

  bot.callbackQuery("acct_home", async ctx => {
    if (!isAdmin(ctx)) {
      await ctx.answerCallbackQuery({ text: "دسترسی مجاز نیست.", show_alert: true });
      return;
    }
    await ctx.answerCallbackQuery();
    await ctx.editMessageText(
      "🧾 <b>بخش حسابداری</b>\n\nبخش موردنظر را انتخاب کن:",
      { ...OPTIONS, reply_markup: accountingKeyboard() }
    );
  });
}
