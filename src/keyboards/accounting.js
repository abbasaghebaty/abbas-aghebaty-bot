import { InlineKeyboard } from "grammy";

export function accountingKeyboard() {
  return new InlineKeyboard()
    .text("📊 داشبورد", "acct_dashboard").row()
    .text("📦 سرمایه و دارایی", "acct_assets").row()
    .text("🧾 بدهی و طلب", "acct_debts");
}

export function accountingBackKeyboard() {
  return new InlineKeyboard().text("🔙 بازگشت به حسابداری", "acct_home");
}

function accountingPageKeyboard(prefix, page, totalPages) {
  const keyboard = new InlineKeyboard();
  if (page > 0) keyboard.text("⬅️ قبلی", `${prefix}_page_${page - 1}`);
  if (page < totalPages - 1) keyboard.text("بعدی ➡️", `${prefix}_page_${page + 1}`);
  if (page > 0 || page < totalPages - 1) keyboard.row();
  return keyboard.text("🔙 بازگشت به حسابداری", "acct_home");
}

export function accountingAssetsKeyboard(page, totalPages) {
  return accountingPageKeyboard("acct_assets", page, totalPages);
}

export function accountingDebtsKeyboard(page, totalPages) {
  return accountingPageKeyboard("acct_debts", page, totalPages);
}

export function adminAccountingReplyKeyboard() {
  return { keyboard: [[{ text: "حسابداری" }]], resize_keyboard: true };
}
