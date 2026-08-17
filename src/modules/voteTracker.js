import express from "express";
import { supabase } from "../config/supabase.js";
import {
  VOTE_CHANNEL_ID,
  TOPGG_WEBHOOK_AUTH,
  DISBOARD_BOT_ID,
  DISCADIA_BOT_ID,
} from "../config/constants.js";
import { resolveUserInfo } from "../utils/userCache.js";

async function addVoterPoint(client, userId, platform) {
  try {
    const info = await resolveUserInfo(client, userId, null);
    if (!info) return;

    const { data: currentData, error } = await supabase
      .from("voter_leaderboard")
      .select("*")
      .eq("discord_user_id", userId)
      .maybeSingle();

    let topggCount = currentData ? currentData.topgg_votes : 0;
    let disboardCount = currentData ? currentData.disboard_bumps : 0;
    let discadiaCount = currentData ? currentData.discadia_bumps : 0;

    if (platform === "topgg") topggCount += 1;
    if (platform === "disboard") disboardCount += 1;
    if (platform === "discadia") discadiaCount += 1;

    const totalPoints = topggCount + disboardCount + discadiaCount;

    await supabase.from("voter_leaderboard").upsert({
      discord_user_id: userId,
      username: info.username,
      avatar_url: info.avatarURL,
      topgg_votes: topggCount,
      disboard_bumps: disboardCount,
      discadia_bumps: discadiaCount,
      total_points: totalPoints,
      updated_at: new Date().toISOString(),
    });

    console.log(
      `🌟 [+1 Poin ${platform}] untuk ${info.username}. Total: ${totalPoints}`,
    );
  } catch (err) {
    console.error(`❌ Error tambah poin [${platform}]:`, err.message);
  }
}

export async function handleVoteMessage(client, message) {
  // LAPISAN FILTER EARLY EXIT
  if (message.channelId !== VOTE_CHANNEL_ID) return;

  const isDisboard = message.author.id === DISBOARD_BOT_ID;
  const isDiscadia = message.author.id === DISCADIA_BOT_ID;

  if (!isDisboard && !isDiscadia) return;

  try {
    let platform = isDisboard ? "disboard" : "discadia";
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