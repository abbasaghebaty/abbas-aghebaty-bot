import { InlineKeyboard } from "grammy";
import { LINKS } from "../config/links.js";

export function buyKeyboard() {
  return new InlineKeyboard()
    .url("🤖 تیم اکسپرس", LINKS.vpn.teamExpress)
    .url("🤖 ربات سوپرنت", LINKS.vpn.superNet)
    .url("🤖 ربات کاوه", LINKS.vpn.kaveh);
}

export function anonymousKeyboard() {
  return new InlineKeyboard()
    .url("💬 چت‌بات", LINKS.anonymous.chatbot)
    .url("💬 بگو بات", LINKS.anonymous.bego);
}
