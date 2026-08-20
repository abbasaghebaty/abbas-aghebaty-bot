import { Keyboard } from "grammy";
import { BUTTONS } from "../config/buttons.js";

export function mainKeyboard() {
  return new Keyboard()
    .text(BUTTONS.main.socials)
    .text(BUTTONS.main.skills)
    .row()
    .text(BUTTONS.main.about)
    .text(BUTTONS.main.buy)
    .row()
    .text(BUTTONS.main.anonymous)
    .resized()
    .persistent();
}
