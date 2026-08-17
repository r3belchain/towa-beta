import express from "express";
import {
  DISBOARD_BOT_ID,
  DISCADIA_BOT_ID,
  TOPGG_WEBHOOK_AUTH,
  VOTE_CHANNEL_ID,
} from "../config/constants.js";
import { supabase } from "../config/supabase.js";

async function addVoterPoint(client, userId, source) {
  try {
    // 1. Eksekusi Atomic Increment langsung di Supabase via RPC
    const { error } = await supabase.rpc("increment_voter_point", {
      target_user_id: userId,
      vote_source: source,
    });

    if (error) {
      console.error(
        `❌ Error Supabase Atomic Increment (${source}):`,
        error.message,
      );
      return;
    }

    console.log(`🌟 [+1 Poin ${source}] disinkronkan untuk User ID: ${userId}`);

    const user = await client.users.fetch(userId).catch(() => null);
    const username = user ? user.username : userId;

    if (VOTE_CHANNEL_ID) {
      const channel = await client.channels
        .fetch(VOTE_CHANNEL_ID)
        .catch(() => null);
      if (channel) {
        await channel.send(
          `🔥 Keren! Poin leaderboard bertambah untuk <@${userId}> via **${source}**!`,
        );
      }
    }
  } catch (err) {
    console.error(`❌ Error menangani poin (${source}):`, err.message);
  }
}

export async function handleVoteMessage(client, message) {
  // LAPISAN FILTER EARLY EXIT
  if (message.channelId !== VOTE_CHANNEL_ID) return;

  const isDisboard = message.author.id === DISBOARD_BOT_ID;
  const isDiscadia = message.author.id === DISCADIA_BOT_ID;

  if (!isDisboard && !isDiscadia) return;

  try {
    let platform = isDisboard ? "Disboard" : "Discadia";
    ` `;

    // Validasi kalimat dari bot marketplace
    const isSuccess =
      message.embeds.some((e) =>
        e.description?.toLowerCase().includes("bump done"),
      ) ||
      message.content.toLowerCase().includes("bump done") ||
      message.embeds.some((e) =>
        e.description?.toLowerCase().includes("bumped"),
      );

    if (isSuccess) {
      // Ambil ID warga dari object interaction
      const userId =
        message.interaction?.user?.id || message.mentions.users.first()?.id;

      if (userId) {
        await addVoterPoint(client, userId, platform);
        message.channel.send(
          `🔥 Keren! Poin leaderboard bertambah untuk <@${userId}> via ${platform}!`,
        );
      }
    }
  } catch (err) {
    console.error("❌ Error membaca pesan bump:", err.message);
  }
}

export function startTopGGWebhook(client) {
  const app = express();

  app.use(express.json());

  app.post("/webhook/topgg", async (req, res) => {
    try {
      // Verifikasi Password Authorization
      const authHeader = req.headers.authorization;
      if (authHeader !== TOPGG_WEBHOOK_AUTH) {
        console.warn(
          "⚠️ Webhook Top.gg ditolak: Authorization header tidak valid.",
        );
        return res.status(401).json({ error: "Unauthorized" });
      }

      res.status(200).json({ status: "ok" });

      const { user, type } = req.body || {};
      if (user) {
        console.log(
          `📥 Menerima webhook Top.gg (${type || "vote"}) dari User ID: ${user}`,
        );
        await addVoterPoint(client, user, "topgg");
      }
    } catch (err) {
      console.error("❌ Error pada Webhook Express Top.gg:", err.message);
    }
  });

  app.listen(3000, () => {
    console.log("🌐 Server Webhook Top.gg berjalan di Port 3000");
  });
}
