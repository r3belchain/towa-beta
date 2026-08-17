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
    // Cek apakah user sudah terdaftar di Supabase
    const { data: userExist, error: fetchError } = await supabase
      .from("voter_leaderboard")
      .select("total_points, disboard_bumps, discadia_bumps, topgg_votes")
      .eq("discord_user_id", userId)
      .maybeSingle();

    if (fetchError) {
      console.error(
        `❌ Error cek DB untuk User ${userId}:`,
        fetchError.message,
      );
      return false;
    }

    // Hitung penambahan poin secara dinamis
    const currentPoints = userExist?.total_points || 0;
    const newPoints = currentPoints + 1;

    let updateData = {
      discord_user_id: userId,
      total_points: newPoints,
      updated_at: new Date(),
    };

    if (source.toLowerCase() === "disboard") {
      updateData.disboard_bumps = (userExist?.disboard_bumps || 0) + 1;
    } else if (source.toLowerCase() === "discadia") {
      updateData.discadia_bumps = (userExist?.discadia_bumps || 0) + 1;
    } else if (source.toLowerCase() === "topgg") {
      updateData.topgg_votes = (userExist?.topgg_votes || 0) + 1;
    }

    // ambil username terbaru dari Discord
    const userDiscord = await client.users.fetch(userId).catch(() => null);
    if (userDiscord) updateData.username = userDiscord.username;

    const { error: upsertError } = await supabase
      .from("voter_leaderboard")
      .upsert(updateData, { onConflict: "discord_user_id" });

    if (upsertError) {
      console.error(
        `❌ Error Upsert Supabase (${source}):`,
        upsertError.message,
      );
      return false;
    }

    console.log(`🌟 [+1 Poin ${source}] disinkronkan untuk User ID: ${userId}`);

    //Kirim notifikasi JIKA data berhasil masuk ke DB
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

    return true;
  } catch (err) {
    console.error(`❌ Error menangani poin (${source}):`, err.message);
    return false;
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
        await addVoterPoint(client, user, "Top.gg");
      }
    } catch (err) {
      console.error("❌ Error pada Webhook Express Top.gg:", err.message);
    }
  });

  app.listen(3000, () => {
    console.log("🌐 Server Webhook Top.gg berjalan di Port 3000");
  });
}
