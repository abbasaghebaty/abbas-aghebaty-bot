import { InlineKeyboard } from "grammy";
import { LINKS } from "../config/links.js";
import { BUTTON_STYLES } from "../config/buttonStyles.js";

export function buyKeyboard() {
  return InlineKeyboard.from([
    [
      {
        text: "🤖 تیم اکسپرس",
        url: LINKS.vpn.teamExpress,
        ...BUTTON_STYLES.success,
      },
      {
        text: "🤖 ربات سوپرنت",
        url: LINKS.vpn.superNet,
        ...BUTTON_STYLES.success,
      },
      {
        text: "🤖 ربات کاوه",
        url: LINKS.vpn.kaveh,
        ...BUTTON_STYLES.success,
      },
    ],
  ]);
}

export function anonymousKeyboard() {
  return InlineKeyboard.from([
    [
      {
        text: "💬 چت‌بات",
        url: LINKS.anonymous.chatbot,
        ...BUTTON_STYLES.primary,
      },
      {
        text: "💬 بگو بات",
        url: LINKS.anonymous.bego,
        ...BUTTON_STYLES.primary,
      },
    ],
  ]);
}
