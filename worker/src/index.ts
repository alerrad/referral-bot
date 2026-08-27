const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: { "content-type": "application/json; charset=UTF-8" },
});

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

  const data = await response.json() as { ok?: boolean; description?: string; result?: any };
  if (!response.ok || !data.ok) {
    throw new Error(`Telegram API ${method}: ${data.description ?? "unknown error"}`);
  }
  return data;
}

async function ensureSchema(env: Env) {
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS users (
    telegram_id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`).run();

  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS referrals (
    invited_user_id INTEGER PRIMARY KEY,
    inviter_id INTEGER NOT NULL,
    invited_name TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (inviter_id) REFERENCES users(telegram_id)
  )`).run();

  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS pending_referrals (
    invited_user_id INTEGER PRIMARY KEY,
    inviter_id INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (inviter_id) REFERENCES users(telegram_id)
  )`).run();

  await env.DB.prepare(`CREATE INDEX IF NOT EXISTS idx_referrals_inviter ON referrals(inviter_id)`).run();
}

async function ensureUser(env: Env, user: any) {
  const name = [user.first_name, user.last_name].filter(Boolean).join(" ") || "کاربر";
  await env.DB.prepare(
    "INSERT OR IGNORE INTO users (telegram_id, name) VALUES (?, ?)",
  ).bind(user.id, name).run();
  await env.DB.prepare(
    "UPDATE users SET name = ? WHERE telegram_id = ?",
  ).bind(name, user.id).run();
}

async function sendMessage(env: Env, chatId: number, text: string, replyMarkup?: unknown) {
  return telegram(env, "sendMessage", {
    chat_id: chatId,
    text,
    ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
  });
}

async function getReferralCount(env: Env, userId: number) {
  const row = await env.DB.prepare(
    "SELECT COUNT(*) AS count FROM referrals WHERE inviter_id = ?",
  ).bind(userId).first<{ count: number }>();
  return Number(row?.count ?? 0);
}

async function getLeaderboard(env: Env) {
  return env.DB.prepare(`
    SELECT u.telegram_id, u.name, COUNT(r.invited_user_id) AS count
    FROM users u
    JOIN referrals r ON r.inviter_id = u.telegram_id
    GROUP BY u.telegram_id, u.name
    ORDER BY count DESC, u.created_at ASC
    LIMIT 10
  `).all<{ telegram_id: number; name: string; count: number }>();
}

async function getPosition(env: Env, userId: number) {
  const rows = await env.DB.prepare(`
    SELECT u.telegram_id, COUNT(r.invited_user_id) AS count
    FROM users u
    LEFT JOIN referrals r ON r.inviter_id = u.telegram_id
    GROUP BY u.telegram_id
    ORDER BY count DESC, u.created_at ASC
  `).all<{ telegram_id: number; count: number }>();

  const index = (rows.results ?? []).findIndex((row) => Number(row.telegram_id) === userId);
  return index >= 0 ? index + 1 : null;
}

async function isChannelMember(env: Env, userId: number) {
  const result = await telegram(env, "getChatMember", {
    chat_id: `@${env.CHANNEL_USERNAME}`,
    user_id: userId,
  });
  const status = result.result?.status;
  return ["creator", "administrator", "member"].includes(status);
}

async function verifyReferral(env: Env, user: any) {
  const pending = await env.DB.prepare(
    "SELECT inviter_id FROM pending_referrals WHERE invited_user_id = ?",
  ).bind(user.id).first<{ inviter_id: number }>();

  if (!pending?.inviter_id || pending.inviter_id === user.id) return false;

  const already = await env.DB.prepare(
    "SELECT invited_user_id FROM referrals WHERE invited_user_id = ?",
  ).bind(user.id).first();
  if (already) return true;

  if (!(await isChannelMember(env, user.id))) return false;

  const name = [user.first_name, user.last_name].filter(Boolean).join(" ") || "کاربر";
  await env.DB.prepare(
    "INSERT OR IGNORE INTO referrals (invited_user_id, inviter_id, invited_name) VALUES (?, ?, ?)",
  ).bind(user.id, pending.inviter_id, name).run();

  await env.DB.prepare(
    "DELETE FROM pending_referrals WHERE invited_user_id = ?",
  ).bind(user.id).run();

  return true;
}

function referralText(link: string) {
  return `🌿 طبیعت را جور دیگری ببین…\n\nقاب‌هایی از زیبایی‌های طبیعت، تصویرهای چشم‌نواز و منظره‌هایی که آدم را برای چند لحظه از شلوغی دنیا دور می‌کنند. 🍃📷\n\nاگر عاشق طبیعت، تصویر و مناظر زیبا هستی، به Nature Plus سر بزن:\n\n🌱 @nature_plus\n\n✨ شاید اینجا همان چند لحظه آرامشی باشد که امروز به آن نیاز داری.\n\n🔗 ${link}`;
}

async function handleCommand(env: Env, message: any) {
  const user = message.from;
  const chatId = Number(message.chat.id);
  const text = String(message.text).trim();

  await ensureUser(env, user);

  if (text === "/start" || text.startsWith("/start ")) {
    const payload = text.slice(6).trim();

    if (payload && /^\d+$/.test(payload)) {
      const inviterId = Number(payload);
      if (inviterId === user.id) {
        await sendMessage(env, chatId, "❌ نمی‌توانی خودت را دعوت کنی.");
        return;
      }

      const inviterExists = await env.DB.prepare(
        "SELECT telegram_id FROM users WHERE telegram_id = ?",
      ).bind(inviterId).first();

      const already = await env.DB.prepare(
        "SELECT invited_user_id FROM referrals WHERE invited_user_id = ?",
      ).bind(user.id).first();

      if (inviterExists && !already) {
        await env.DB.prepare(
          "INSERT OR REPLACE INTO pending_referrals (invited_user_id, inviter_id) VALUES (?, ?)",
        ).bind(user.id, inviterId).run();
      }
    }

    const count = await getReferralCount(env, user.id);
    await sendMessage(env, chatId,
      `🌿 به Nature Plus خوش آمدی!\n\nاینجا جایی برای تماشای طبیعت، تصویر و منظره‌های چشم‌نواز است. 🍃📷\n\n👥 دعوت‌های موفق شما: ${count}\n\n🔗 /ref_link — لینک دعوت\n🏆 /leaderboard — برترین دعوت‌کنندگان\n📊 /position — رتبه من\n✅ /verify — تأیید عضویت و ثبت دعوت`);
    return;
  }

  if (text === "/ref_link") {
    const username = (env.BOT_USERNAME || "NPlussenderbot").replace(/^@/, "");
    const link = `https://t.me/${username}?start=${user.id}`;
    const shareText = referralText(link);
    const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(shareText)}`;

    await sendMessage(env, chatId, shareText, {
      inline_keyboard: [[
        { text: "🌿 اشتراک‌گذاری با دوستان", url: shareUrl },
      ]],
    });
    return;
  }

  if (text === "/verify") {
    const verified = await verifyReferral(env, user);
    await sendMessage(env, chatId,
      verified
        ? "✅ عضویت تأیید شد و دعوت با موفقیت ثبت شد! 🌿"
        : `❌ هنوز عضویت تأیید نشده است. ابتدا عضو @${env.CHANNEL_USERNAME} شو و دوباره /verify را بزن.`);
    return;
  }

  if (text === "/leaderboard") {
    const result = await getLeaderboard(env);
    const rows = result.results ?? [];
    const lines = rows.map((row, index) =>
      `${index + 1}. ${row.name} — ${row.count} دعوت`
    );

    await sendMessage(env, chatId,
      `🏆 برترین دعوت‌کنندگان Nature Plus\n\n${lines.join("\n") || "هنوز دعوتی ثبت نشده است."}`);
    return;
  }

  if (text === "/position") {
    const count = await getReferralCount(env, user.id);
    const position = await getPosition(env, user.id);
    await sendMessage(env, chatId,
      `📊 آمار شما در Nature Plus\n\n👥 دعوت‌های موفق: ${count}\n🏆 رتبه فعلی: ${position ?? "—"}`);
    return;
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "GET" && url.pathname === "/health") {
      const result: Record<string, unknown> = {
        worker: "ok",
        botTokenConfigured: Boolean(env.BOT_TOKEN),
        botUsernameConfigured: Boolean(env.BOT_USERNAME),
        channel: env.CHANNEL_USERNAME,
      };

      try {
        await ensureSchema(env);
        await env.DB.prepare("SELECT 1 AS ok").first();
        result.database = "ok";
      } catch (error) {
        result.database = "error";
        result.databaseError = String(error);
      }

      try {
        const me = await telegram(env, "getMe", {});
        result.telegram = "ok";
        result.bot = me.result?.username ?? null;
      } catch (error) {
        result.telegram = "error";
        result.telegramError = String(error);
      }

      return json(result);
    }

    if (request.method === "POST" && url.pathname === "/webhook") {
      try {
        const update = await request.json() as any;
        if (update?.message?.chat?.id && update?.message?.text) {
          await ensureSchema(env);
          await handleCommand(env, update.message);
        }
        return json({ ok: true });
      } catch (error) {
        console.error("Webhook error:", error);
        return json({ ok: false, error: String(error) }, 500);
      }
    }

    return new Response("Nature Plus Referral Bot is running 🌿", { status: 200 });
  },
};
