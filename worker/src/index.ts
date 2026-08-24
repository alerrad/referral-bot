interface Env {
  DB: D1Database;
  BOT_TOKEN: string;
  CHANNEL_USERNAME: string;
  BOT_USERNAME?: string;
}

type TelegramUser = {
  id: number;
  first_name?: string;
  last_name?: string;
};

type TelegramMessage = {
  message_id: number;
  from?: TelegramUser;
  chat: { id: number };
  text?: string;
};

type TelegramUpdate = { message?: TelegramMessage };

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });

async function telegram(env: Env, method: string, body: Record<string, unknown>) {
  const response = await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return response.json() as Promise<any>;
}

async function sendMessage(env: Env, chatId: number, text: string) {
  return telegram(env, "sendMessage", { chat_id: chatId, text });
}

async function ensureUser(env: Env, user: TelegramUser) {
  const name = [user.first_name, user.last_name].filter(Boolean).join(" ") || "کاربر";
  await env.DB.prepare(
    "INSERT OR IGNORE INTO users (telegram_id, name) VALUES (?, ?)",
  ).bind(user.id, name).run();
  return name;
}

async function isChannelMember(env: Env, userId: number) {
  const result = await telegram(env, "getChatMember", {
    chat_id: `@${env.CHANNEL_USERNAME}`,
    user_id: userId,
  });
  const status = result?.result?.status;
  return result?.ok && ["creator", "administrator", "member"].includes(status);
}

async function referralCount(env: Env, userId: number) {
  const row = await env.DB.prepare(
    "SELECT COUNT(*) AS count FROM referrals WHERE inviter_id = ?",
  ).bind(userId).first<{ count: number }>();
  return Number(row?.count ?? 0);
}

async function leaderboard(env: Env) {
  return env.DB.prepare(`
    SELECT u.telegram_id, u.name, COUNT(r.invited_user_id) AS count
    FROM users u
    JOIN referrals r ON r.inviter_id = u.telegram_id
    GROUP BY u.telegram_id, u.name
    ORDER BY count DESC, u.created_at ASC
    LIMIT 10
  `).all<{ telegram_id: number; name: string; count: number }>();
}

async function handleStart(env: Env, message: TelegramMessage, payload?: string) {
  if (!message.from) return;
  const user = message.from;
  const name = await ensureUser(env, user);

  if (payload && /^\d+$/.test(payload)) {
    const inviterId = Number(payload);
    if (inviterId === user.id) {
      await sendMessage(env, message.chat.id, "❌ نمی‌توانی خودت را دعوت کنی.");
      return;
    }

    const inviterExists = await env.DB.prepare(
      "SELECT telegram_id FROM users WHERE telegram_id = ?",
    ).bind(inviterId).first();

    if (inviterExists) {
      const already = await env.DB.prepare(
        "SELECT invited_user_id FROM referrals WHERE invited_user_id = ?",
      ).bind(user.id).first();

      if (!already) {
        const member = await isChannelMember(env, user.id);
        if (member) {
          await env.DB.prepare(
            "INSERT OR IGNORE INTO referrals (invited_user_id, inviter_id, invited_name) VALUES (?, ?, ?)",
          ).bind(user.id, inviterId, name).run();
        }
      }
    }
  }

  const count = await referralCount(env, user.id);
  await sendMessage(
    env,
    message.chat.id,
    `🌿 به Nature Plus خوش آمدی!\n\n👥 دعوت‌های موفق شما: ${count}\n\n🔗 برای دریافت لینک دعوت اختصاصی، /ref_link را بزن.\n🏆 برای دیدن رتبه‌ها، /leaderboard را بزن.\n📊 برای دیدن رتبه خودت، /position را بزن.`,
  );
}

async function handleCommand(env: Env, message: TelegramMessage, command: string) {
  if (!message.from) return;
  const user = message.from;
  await ensureUser(env, user);

  if (command === "/ref_link") {
    const username = env.BOT_USERNAME || "YOUR_BOT_USERNAME";
    const link = `https://t.me/${username}?start=${user.id}`;
    await sendMessage(env, message.chat.id, `🔗 لینک دعوت اختصاصی شما:\n${link}\n\nهر دوست جدیدی که از این لینک وارد شود و عضو کانال @${env.CHANNEL_USERNAME} شود، یک دعوت موفق برای شما ثبت می‌شود.`);
    return;
  }

  if (command === "/leaderboard") {
    const result = await leaderboard(env);
    const lines = (result.results || []).map((u, i) => `${i + 1}. ${u.name} — ${u.count} دعوت`);
    await sendMessage(env, message.chat.id, `🏆 برترین دعوت‌کنندگان Nature Plus\n\n${lines.join("\n") || "هنوز دعوتی ثبت نشده است."}`);
    return;
  }

  if (command === "/position") {
    const count = await referralCount(env, user.id);
    const higher = await env.DB.prepare(`
      SELECT COUNT(*) AS position FROM (
        SELECT inviter_id, COUNT(*) AS count
        FROM referrals GROUP BY inviter_id HAVING count > ?
      )
    `).bind(count).first<{ position: number }>();
    const position = Number(higher?.position ?? 0) + 1;
    await sendMessage(env, message.chat.id, `📊 تعداد دعوت‌های موفق شما: ${count}\n🏆 رتبه فعلی: ${position}`);
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "GET" && url.pathname === "/") {
      return new Response("Nature Plus Referral Bot is running 🌿");
    }

    if (request.method !== "POST" || url.pathname !== "/webhook") {
      return json({ ok: false, error: "Not found" }, 404);
    }

    const update = (await request.json()) as TelegramUpdate;
    const message = update.message;
    if (!message?.from || !message.text) return json({ ok: true });

    const [command, payload] = message.text.trim().split(/\s+/, 2);

    try {
      if (command === "/start") await handleStart(env, message, payload);
      else if (["/ref_link", "/leaderboard", "/position"].includes(command)) {
        await handleCommand(env, message, command);
      }
    } catch (error) {
      console.error(error);
      await sendMessage(env, message.chat.id, "❌ خطایی رخ داد. لطفاً دوباره تلاش کن.");
    }

    return json({ ok: true });
  },
};
