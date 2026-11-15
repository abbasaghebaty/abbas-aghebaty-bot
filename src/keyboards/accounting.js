import { InlineKeyboard } from "grammy";

export function accountingKeyboard() {
  return new InlineKeyboard()
    .text("📦 سرمایه و دارایی", "acct_assets").row()
    .text("🧾 بدهی و طلب", "acct_debts");
}

export function accountingBackKeyboard() {
  return new InlineKeyboard().text("🔙 بازگشت به حسابداری", "acct_home");
}

export function accountingDebtsKeyboard(page, totalPages) {
  const keyboard = new InlineKeyboard();
  if (page > 0) keyboard.text("⬅️ قبلی", `acct_debts_page_${page - 1}`);
  if (page < totalPages - 1) keyboard.text("بعدی ➡️", `acct_debts_page_${page + 1}`);
  if (page > 0 || page < totalPages - 1) keyboard.row();
  return keyboard.text("🔙 بازگشت به حسابداری", "acct_home");
}

export function adminAccountingReplyKeyboard() {
  return { keyboard: [[{ text: "حسابداری" }]], resize_keyboard: true };
}
