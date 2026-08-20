import { Keyboard } from "grammy";
import { BUTTONS } from "../config/buttons.js";

export function socialsKeyboard() {
  return new Keyboard()
    .text(BUTTONS.socials.instagram)
    .text(BUTTONS.socials.telegram)
    .row()
    .text(BUTTONS.socials.youtube)
    .row()
    .text(BUTTONS.socials.back)
    .resized();
}
