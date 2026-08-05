import { InlineKeyboard } from "grammy";
import content from "../data/content.js";

export function mainKeyboard() {
  const { buttons } = content;
  return new InlineKeyboard()
    .text(buttons.about, "about")
    .row()
    .text(buttons.social, "social")
    .row()
    .text(buttons.anonymous, "anonymous")
    .row()
    .text(buttons.buy, "buy");
}
