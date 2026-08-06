import { Keyboard } from "grammy";
import content from "../data/content.js";

export function mainKeyboard() {

  const { buttons } = content;

  return new Keyboard()
    .text(buttons.about)
    .row()
    .text(buttons.social)
    .row()
    .text(buttons.anonymous)
    .row()
    .text(buttons.buy)
    .resized();

}