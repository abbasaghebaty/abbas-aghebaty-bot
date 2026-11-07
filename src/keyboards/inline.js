import { InlineKeyboard } from "grammy";

export function anonymousKeyboard() {
  return new InlineKeyboard().text("ارسال پیام به مدیر", "support:start");
}
