export default {
  async fetch(request, env) {
    // پاسخ به مرورگر
    if (request.method !== "POST") {
      return new Response("OK - Bot is alive", { status: 200 });
    }

    // پاسخ ساده به تلگرام (موقت)
    const body = await request.json();
    console.log("Update received:", JSON.stringify(body));

    return new Response(JSON.stringify({
      method: "sendMessage",
      chat_id: body.message?.chat?.id || body.callback_query?.message?.chat?.id,
      text: "سلام! ربات کار می‌کنه 🎉"
    }), {
      headers: { "Content-Type": "application/json" }
    });
  }
};
