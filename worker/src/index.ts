const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=UTF-8" } });

interface Env {
  DB: D1Database;
  BOT_TOKEN?: string;
  BOT_USERNAME?: string;
  CHANNEL_USERNAME: string;
}

async function telegram(env: Env, method: string, body: Record<string, unknown>) {
  if (!env.BOT_TOKEN) throw new Error("BOT_TOKEN secret is missing");
  const response = await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await response.json() as { ok?: boolean; description?: string };
  if (!data.ok) throw new Error(`Telegram API: ${data.description ?? "unknown error"}`);
  return data;
}

async function ensureSchema(env: Env) {
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS users (telegram_id INTEGER PRIMARY KEY, username TEXT, first_name TEXT, referrals_count INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`).run();
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS referrals (id INTEGER PRIMARY KEY AUTOINCREMENT, inviter_id INTEGER NOT NULL, invited_id INTEGER NOT NULL UNIQUE, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`).run();
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS pending_referrals (invited_id INTEGER PRIMARY KEY, inviter_id INTEGER NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`).run();
}

function referralText(link: string) {
  return `🌿 طبیعت را جور دیگری ببین…\n\nقاب‌هایی از زیبایی‌های طبیعت، تصویرهای چشم‌نواز و منظره‌هایی که آدم را برای چند لحظه از شلوغی دنیا دور می‌کنند. 🍃📷\n\nاگر عاشق طبیعت، تصویر و مناظر زیبا هستی، به Nature Plus سر بزن:\n\n🌱 @nature_plus\n\n✨ شاید اینجا همان چند لحظه آرامشی باشد که امروز به آن نیاز داری.\n\n🔗 ${link}`;
}

async function sendStart(env: Env, chatId: number, text: string) {
  await telegram(env, "sendMessage", { chat_id: chatId, text });
}

async function handleUpdate(update: any, env: Env) {
  const message = update?.message;
  if (!message?.chat?.id || !message?.text) return;

  const chatId = Number(message.chat.id);
  const text = String(message.text).trim();
  const user = message.from ?? {};

  await ensureSchema(env);
  await env.DB.prepare(`INSERT INTO users (telegram_id, username, first_name) VALUES (?, ?, ?) ON CONFLICT(telegram_id) DO UPDATE SET username=excluded.username, first_name=excluded.first_name`).bind(chatId, user.username ?? null, user.first_name ?? null).run();

  if (text === "/start" || text.startsWith("/start ")) {
    const payload = text.slice(6).trim();
    if (payload && /^\d+$/.test(payload) && Number(payload) !== chatId) {
      await env.DB.prepare(`INSERT OR REPLACE INTO pending_referrals (invited_id, inviter_id) VALUES (?, ?)`).bind(chatId, Number(payload)).run();
    }

    await sendStart(env, chatId, `🌿 به Nature Plus خوش آمدی!\n\nاینجا جایی برای تماشای طبیعت، تصویر و منظره‌های چشم‌نواز است. 🍃📷\n\nبرای دریافت لینک دعوت اختصاصی خودت، /ref_link را بزن.`);
    return;
  }

  if (text === "/ref_link") {
    const username = env.BOT_USERNAME || "NPlussenderbot";
    const link = `https://t.me/${username}?start=${chatId}`;
    await telegram(env, "sendMessage", {
      chat_id: chatId,
      text: referralText(link),
      reply_markup: { inline_keyboard: [[{ text: "🌿 اشتراک‌گذاری با دوستان", url: `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(referralText(link))}` }]] },
    });
    return;
  }

  if (text === "/health") {
    await sendStart(env, chatId, "✅ ربات فعال است.");
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "GET" && url.pathname === "/health") {
      const result: Record<string, unknown> = {
        worker: "ok",
        botTokenConfigured: !!env.BOT_TOKEN,
        botUsernameConfigured: !!env.BOT_USERNAME,
        channel: env.CHANNEL_USERNAME,
      };
      try { await ensureSchema(env); result.database = "ok"; } catch (error) { result.database = "error"; result.databaseError = String(error); }
      try {
        if (!env.BOT_TOKEN) throw new Error("BOT_TOKEN secret is missing");
        const me = await telegram(env, "getMe", {});
        result.telegram = "ok";
        result.bot = (me as any).result?.username ?? null;
      } catch (error) { result.telegram = "error"; result.telegramError = String(error); }
      return json(result);
    }

    if (url.pathname === "/webhook" && request.method === "POST") {
      try {
        const update = await request.json();
        await handleUpdate(update, env);
        return json({ ok: true });
      } catch (error) {
        console.error("Webhook error:", error);
        return json({ ok: false, error: String(error) }, 500);
      }
    }

    return new Response("Nature Plus Referral Bot is running 🌿", { status: 200 });
  },
};
