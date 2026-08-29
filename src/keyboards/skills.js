import { InlineKeyboard } from "grammy";

import { BUTTONS } from "../config/buttons.js";
import { BUTTON_STYLES } from "../config/buttonStyles.js";

export function skillsKeyboard() {
  return InlineKeyboard.from([
    [
      {
        text: BUTTONS.skills.list,
        callback_data: "skills_list",
        style: BUTTON_STYLES.primary,
      },
      {
        text: BUTTONS.skills.projects,
        callback_data: "projects",
        style: BUTTON_STYLES.primary,
      },
    ],
  ]);
}

export function backToSkillsKeyboard() {
  return InlineKeyboard.from([
    [
      {
        text: "بازگشت",
        callback_data: "back_skills",
        style: BUTTON_STYLES.primary,
      },
    ],
  ]);
}
