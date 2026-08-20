import { InlineKeyboard } from "grammy";
import { BUTTONS } from "../config/buttons.js";
import { BUTTON_STYLES } from "../config/buttonStyles.js";

export function skillsKeyboard() {
  return InlineKeyboard.from([
    [
      {
        text: BUTTONS.skills.list,
        callback_data: "skills_list",
        ...BUTTON_STYLES.primary,
      },
      {
        text: BUTTONS.skills.projects,
        callback_data: "projects",
        ...BUTTON_STYLES.primary,
      },
    ],
  ]);
}

export function backToSkillsKeyboard() {
  return InlineKeyboard.from([
    [
      {
        text: BUTTONS.skills.back,
        callback_data: "back_skills",
        ...BUTTON_STYLES.danger,
      },
    ],
  ]);
}
