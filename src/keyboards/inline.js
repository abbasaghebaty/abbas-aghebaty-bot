import { InlineKeyboard } from "grammy";

import { LINKS } from "../config/links.js";
import { BUTTON_STYLES } from "../config/buttonStyles.js";

export function buyKeyboard() {
  return InlineKeyboard.from([
    [
      {
        text: "تیم اکسپرس",
        url: LINKS.vpn.teamExpress,
        style: BUTTON_STYLES.success,
      },
      {
        text: "سوپرنت",
        url: LINKS.vpn.superNet,
        style: BUTTON_STYLES.success,
      },
      {
        text: "کاوه",
        url: LINKS.vpn.kaveh,
        style: BUTTON_STYLES.success,
      },
    ],
  ]);
}

export function anonymousKeyboard() {
  return InlineKeyboard.from([
    [
      {
        text: "چت‌بات",
        url: LINKS.anonymous.chatbot,
        style: BUTTON_STYLES.primary,
      },
      {
        text: "بگو بات",
        url: LINKS.anonymous.bego,
        style: BUTTON_STYLES.primary,
      },
    ],
  ]);
}
