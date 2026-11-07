import { InlineKeyboard } from "grammy";

const REACTIONS = {
  like: "👍",
  love: "❤️",
  laugh: "😂",
  wow: "😮",
  sad: "😢",
  fire: "🔥",
};

const REACTION_ROWS = [
  ["like", "love", "laugh"],
  ["wow", "sad", "fire"],
];

export function createReactionKeyboard(selected = null) {
  return {
    inline_keyboard: REACTION_ROWS.map((row) => row.map((key) => ({
      text: (selected === key ? "🔵 " : "") + REACTIONS[key],
      callback_data: "support:react:" + key,
      ...(selected === key ? { style: "primary" } : {}),
    }))),
  };
}

export function registerReactionHandlers(bot, env) {
  bot.callbackQuery(/^support:react:(like|love|laugh|wow|sad|fire)$/, async (ctx) => {
    const message = ctx.callbackQuery.message;
    const managerId = Number(env.ADMIN_ID);
    if (!message || !Number.isSafeInteger(managerId) || managerId <= 0
      || Number(ctx.from.id) !== managerId || Number(message.chat.id) !== managerId) {
      await ctx.answerCallbackQuery({ text: "این واکنش فقط برای مدیر فعال است." });
      return;
    }

    const mapped = await env.DB.prepare(
      "SELECT user_id, peer_chat_id, peer_message_id FROM support_message_map WHERE chat_id = ? AND message_id = ?"
    ).bind(message.chat.id, message.message_id).first();

    if (!mapped || Number(mapped.peer_chat_id) !== Number(mapped.user_id)) {
      await ctx.answerCallbackQuery({ text: "پیام متناظر پیدا نشد." });
      return;
    }

    const selected = ctx.match[1];
    const emoji = REACTIONS[selected];
    try {
      await ctx.api.setMessageReaction(
        mapped.peer_chat_id,
        mapped.peer_message_id,
        [{ type: "emoji", emoji }]
      );
      await ctx.editMessageReplyMarkup({ reply_markup: createReactionKeyboard(selected) });
      await ctx.answerCallbackQuery({ text: "واکنش ثبت شد." });
    } catch (error) {
      console.error("Support reaction failed:", error);
      await ctx.answerCallbackQuery({
        text: "ثبت واکنش ناموفق بود؛ ممکن است پیام دیگر در دسترس نباشد.",
      });
    }
  });
}
