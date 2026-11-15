import {readSheetRanges} from "./googleSheets.js";
import {
  accountingKeyboard,
  accountingBackKeyboard,
  accountingAssetsKeyboard,
  accountingDebtsKeyboard
} from "../keyboards/accounting.js";

const OPTIONS = {
  parse_mode: "HTML",
  link_preview_options: { is_disabled: true }
};
const PAGE_SIZE = 5;

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

function boldNumbers(value) {
  return escapeHtml(value).replace(
    /(^|[^\w>])([+-]?(?:\d{1,3}(?:[,٬،]\d{3})+|\d+)(?:[./]\d+)?)(?=$|[^\w<])/g,
    "$1<b>$2</b>"
  );
}

function parseAmount(value) {
  const normalized = toAsciiDigits(value)
    .replace(/[٬،,]/g, "")
    .replace(/[^0-9.+-]/g, "");
  const amount = Number(normalized);
  return Number.isFinite(amount) ? amount : null;
}

function formatDebtAmount(value) {
  const safe = escapeHtml(value || "—");
  const amount = parseAmount(value);
  return amount !== null && amount > 400
    ? `<b><u>${safe}</u></b>`
    : `<b>${safe}</b>`;
}

function formatDashboard(rows, monthlyIncome = null) {
  const data = cleanRows(rows)
    .map(row => row.filter(cell => !String(cell ?? "").trim().startsWith("#REF!")))
    .filter(row => !row.some(cell => String(cell ?? "").includes("حقوق مغازه")))
    .filter(row => row.some(cell => String(cell ?? "").trim() !== ""));
  if (!data.length) {
    return "<b>📊 داشبورد حسابداری</b>\n\nاطلاعاتی برای نمایش ثبت نشده است.";
  }

  const lines = [];

  for (const row of data) {
    const cells = row
      .map((value, index) => ({ value: String(value ?? "").trim(), index }))
      .filter(cell => cell.value !== "");

    if (!cells.length) continue;

    if (cells.length === 1) {
      lines.push(`\n<b>🔹 ${boldNumbers(cells[0].value)}</b>`);
      continue;
    }

    if (cells.length === 2) {
      const label = cells[0].value;
      const value = cells[1].value;
      const normalized = label.toLowerCase();

      let icon = "▪️";
      if (normalized.includes("سرمایه")) icon = "🏦";
      else if (normalized.includes("دریافت")) icon = "💳";
      else if (normalized.includes("طلب")) icon = "🟢";
      else if (normalized.includes("بده")) icon = "🔴";
      else if (["بابا", "مامان", "صادق", "رضا"].includes(label)) icon = "👤";

      lines.push(`${icon} <b>${escapeHtml(label)}</b>  ${boldNumbers(value)}`);
      continue;
    }

    const label = cells[0].value;
    const details = cells.slice(1).map(cell => boldNumbers(cell.value));
    lines.push(`<b>🔸 ${escapeHtml(label)}</b>\n${details.join("  |  ")}`);
  }

  return [
    "<b>📊 داشبورد حسابداری</b>",
    "<i>نمای کلی سرمایه، دریافتی‌ها و حساب اشخاص</i>",
    "",
    monthlyIncome
      ? `💰 <b>حقوق عباس در ${escapeHtml(monthlyIncome.month)}:</b> <b>${escapeHtml(monthlyIncome.incomeFormatted)}</b>`
      : "",
    lines.join("\n")
  ].join("\n");
}

function toAsciiDigits(value) {
  return String(value ?? "")
    .replace(/[۰-۹]/g, digit => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)))
    .replace(/[٠-٩]/g, digit => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)));
}

function isZeroQuantity(value) {
  const normalized = toAsciiDigits(value)
    .replace(/[٬،,]/g, "")
    .trim();

  if (!normalized) return false;
  const numeric = Number(normalized);
  return Number.isFinite(numeric) && numeric === 0;
}

function formatAssetCard(row, index) {
  const name = escapeHtml(row[0] || "کالای بدون نام");
  const fields = [
    row[1] !== undefined && row[1] !== "" ? `📦 موجودی: <b>${escapeHtml(row[1])}</b>` : "",
    row[2] !== undefined && row[2] !== "" ? `🛒 قیمت خرید: ${boldNumbers(row[2])}` : "",
    row[3] !== undefined && row[3] !== "" ? `🏷 قیمت فروش: ${boldNumbers(row[3])}` : "",
    row[4] !== undefined && row[4] !== "" ? `💰 سود خالص: ${boldNumbers(row[4])}` : "",
    row[5] !== undefined && row[5] !== "" ? `💳 دریافتی: ${boldNumbers(row[5])}` : "",
    row[6] !== undefined && row[6] !== "" ? `📈 درصد سود: ${boldNumbers(row[6])}` : ""
  ].filter(Boolean);

  return `<b>${index}. ${name}</b>\n${fields.join("\n")}`;
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

function hasDebtContent(row) {
  return row.some((value, index) =>
    index !== 4 && String(value ?? "").trim() !== ""
  );
}

function formatDebtCard(row, index) {
  const title = escapeHtml(row[0] || "تراکنش بدون عنوان");
  const person = escapeHtml(row[1] || "نامشخص");
  const type = String(row[2] || "").trim();
  const amount = formatDebtAmount(row[3]);
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

async function getMonthlyIncome(env) {
  if (!env.MONITORING_API_URL || !env.MONITORING_API_TOKEN) return null;
  const response = await fetch(env.MONITORING_API_URL, {
    method: "GET",
    headers: { Authorization: `Bearer ${env.MONITORING_API_TOKEN}` },
    signal: AbortSignal.timeout(8000)
  });
  if (!response.ok) throw new Error(`Monitoring API returned ${response.status}`);
  const data = await response.json();
  if (!data || typeof data.incomeFormatted !== "string" || typeof data.month !== "string") {
    throw new Error("Monitoring API response is invalid");
  }
  return data;
}

async function renderDashboard(ctx, env) {
  try {
    const rows = await readRange(env, "'داشبورد'!A1:Z60");
    let monthlyIncome = null;
    let incomeError = false;
    try {
      monthlyIncome = await getMonthlyIncome(env);
      incomeError = Boolean(env.MONITORING_API_URL && env.MONITORING_API_TOKEN && !monthlyIncome);
    } catch (error) {
      console.error("Monitoring monthly income request failed:", error);
      incomeError = true;
    }
    const dashboard = formatDashboard(rows, monthlyIncome);
    const message = incomeError
      ? dashboard + "\n\n⚠️ <i>دریافت حقوق این ماه موقتاً ناموفق بود.</i>"
      : dashboard;
    await ctx.editMessageText(message, {
      ...OPTIONS,
      reply_markup: accountingBackKeyboard()
    });
  } catch (error) {
    console.error("Accounting dashboard read failed:", error);
    await ctx.editMessageText(
      `❌ <b>دریافت داشبورد حسابداری ناموفق بود</b>\n\n${escapeHtml(error.message || "خطای نامشخص")}`,
      { ...OPTIONS, reply_markup: accountingBackKeyboard() }
    );
  }
}

async function renderAssets(ctx, env, requestedPage = 0) {
  try {
    const rows = cleanRows(await readRange(env, "'سرمایه و دارایی'!A1:G100"));
    const data = rows.slice(1).filter(row => !isZeroQuantity(row[1]));
    if (!data.length) {
      await ctx.editMessageText(
        "<b>📦 سرمایه و دارایی</b>\n\nدر حال حاضر کالایی با موجودی بیشتر از صفر ثبت نشده است.",
        { ...OPTIONS, reply_markup: accountingBackKeyboard() }
      );
      return;
    }

    const totalPages = Math.ceil(data.length / PAGE_SIZE);
    const page = Math.max(0, Math.min(Number(requestedPage) || 0, totalPages - 1));
    const start = page * PAGE_SIZE;
    const cards = data.slice(start, start + PAGE_SIZE)
      .map((row, index) => formatAssetCard(row, start + index + 1));

    const message = [
      "<b>📦 سرمایه و دارایی</b>",
      "<i>فقط کالاهای دارای موجودی نمایش داده می‌شوند</i>",
      "",
      cards.join("\n\n──────────────\n\n"),
      "",
      `<i>صفحه ${page + 1} از ${totalPages} · مجموع ${data.length} کالا</i>`
    ].join("\n");

    await ctx.editMessageText(message, {
      ...OPTIONS,
      reply_markup: accountingAssetsKeyboard(page, totalPages)
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
    const data = rows.slice(1).filter(hasDebtContent);
    if (!data.length) {
      await ctx.editMessageText(
        "<b>🧾 بدهی و طلب</b>\n\nموردی ثبت نشده است.",
        { ...OPTIONS, reply_markup: accountingBackKeyboard() }
      );
      return;
    }

    const totalPages = Math.ceil(data.length / PAGE_SIZE);
    const page = Math.max(0, Math.min(Number(requestedPage) || 0, totalPages - 1));
    const start = page * PAGE_SIZE;
    const cards = data.slice(start, start + PAGE_SIZE)
      .map((row, index) => formatDebtCard(row, start + index + 1));

    const message = [
      "<b>🧾 بدهی و طلب</b>",
      "<i>ردیف‌های خالی و ردیف‌های دارای فقط تیک، نمایش داده نمی‌شوند</i>",
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

  bot.callbackQuery("acct_dashboard", async ctx => {
    if (!isAdmin(ctx)) {
      await ctx.answerCallbackQuery({ text: "دسترسی مجاز نیست.", show_alert: true });
      return;
    }
    await ctx.answerCallbackQuery();
    await renderDashboard(ctx, env);
  });

  bot.callbackQuery("acct_assets", async ctx => {
    if (!isAdmin(ctx)) {
      await ctx.answerCallbackQuery({ text: "دسترسی مجاز نیست.", show_alert: true });
      return;
    }
    await ctx.answerCallbackQuery();
    await renderAssets(ctx, env, 0);
  });

  bot.callbackQuery(/^acct_assets_page_(\d+)$/, async ctx => {
    if (!isAdmin(ctx)) {
      await ctx.answerCallbackQuery({ text: "دسترسی مجاز نیست.", show_alert: true });
      return;
    }
    await ctx.answerCallbackQuery();
    await renderAssets(ctx, env, Number(ctx.match[1]));
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
