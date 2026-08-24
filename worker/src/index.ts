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

async function checkDatabase(env: Env) {
  await env.DB.prepare("SELECT 1 FROM users LIMIT 1").run();
  await env.DB.prepare("SELECT 1 FROM referrals LIMIT 1").run();
  await env.DB.prepare("SELECT 1 FROM pending_referrals LIMIT 1").run();
}

function referralText(link: string) {
  return `🌿 طبیعت را جور دیگری ببین…\n\nقاب‌هایی از زیبایی‌های طبیعت، تصویرهای چشم‌نواز و منظره‌هایی که آدم را برای چند لحظه از شلوغی دنیا دور می‌کنند. 🍃📷\n\nاگر عاشق طبیعت، تصویر و مناظر زیبا هستی، به Nature Plus سر بزن:\n\n🌱 @nature_plus\n\n✨ شاید اینجا همان چند لحظه آرامشی باشد که امروز به آن نیاز داری.\n\n🔗 ${link}`;
}

async function handleUpdate(update: any, env: Env) {
  const message = update?.message;
  if (!message?.chat?.id || !message?.text) return;

  const chatId = Number(message.chat.id);
  const text = String(message.text).trim();
  const user = message.from ?? {};
  const name = String(user.first_name ?? user.username ?? "کاربر").slice(0, 255);

  await checkDatabase(env);
  await env.DB.prepare(`INSERT INTO users (telegram_id, name) VALUES (?, ?) ON CONFLICT(telegram_id) DO UPDATE SET name=excluded.name`).bind(chatId, name).run();

  if (text === "/start" || text.startsWith("/start ")) {
    const payload = text.slice(6).trim();
    if (payload && /^\d+$/.test(payload) && Number(payload) !== chatId) {
      const inviterId = Number(payload);
      const inviter = await env.DB.prepare("SELECT telegram_id FROM users WHERE telegram_id = ?").bind(inviterId).first();
      if (inviter) {
        await env.DB.prepare(`INSERT OR REPLACE INTO pending_referrals (invited_user_id, inviter_id) VALUES (?, ?)`).bind(chatId, inviterId).run();
      }
    }

    await telegram(env, "sendMessage", {
      chat_id: chatId,
      text: `🌿 به Nature Plus خوش آمدی!\n\nاینجا جایی برای تماشای طبیعت، تصویر و منظره‌های چشم‌نواز است. 🍃📷\n\nبرای دریافت لینک دعوت اختصاصی خودت، /ref_link را بزن.`,
    });
    return;
  }

  if (text === "/ref_link") {
    const username = env.BOT_USERNAME || "NPlussenderbot";
    const link = `https://t.me/${username}?start=${chatId}`;
    const shareText = referralText(link);
    await telegram(env, "sendMessage", {
      chat_id: chatId,
      text: shareText,
      reply_markup: {
        inline_keyboard: [[{
          text: "🌿 اشتراک‌گذاری با دوستان",
          url: `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(shareText)}`,
        }]],
      },
    });
    return;
  }

  if (text === "/health") {
    await telegram(env, "sendMessage", { chat_id: chatId, text: "✅ ربات فعال است." });
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
      try { await checkDatabase(env); result.database = "ok"; } catch (error) { result.database = "error"; result.databaseError = String(error); }
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
