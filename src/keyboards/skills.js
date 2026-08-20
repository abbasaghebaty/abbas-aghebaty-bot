import { InlineKeyboard } from "grammy";
import { BUTTONS } from "../config/buttons.js";

export function skillsKeyboard() {
  return new InlineKeyboard()
    .text(BUTTONS.skills.list, "skills_list")
    .text(BUTTONS.skills.projects, "projects");
}

export function backToSkillsKeyboard() {
  return new InlineKeyboard()
    .text(BUTTONS.skills.back, "back_skills");
}
