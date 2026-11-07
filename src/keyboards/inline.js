import { InlineKeyboard } from "grammy";

import { LINKS } from "../config/links.js";
import { BUTTON_STYLES } from "../config/buttonStyles.js";

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
