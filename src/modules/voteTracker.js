import crypto from "crypto";
import express from "express";
import {
  DISBOARD_BOT_ID,
  DISCADIA_BOT_ID,
  TOPGG_WEBHOOK_AUTH,
  VOTE_CHANNEL_ID,
} from "../config/constants.js";
import { supabase } from "../config/supabase.js";

// Fungsi helper verifikasi signature Top.gg
function verifyWebhook(rawBody, signature, secret) {
  if (!signature || !secret || !rawBody) return false;
  try {
    const [tPart, v1Part] = signature.split(",");
    if (!tPart || !v1Part) return false;

    const timestamp = tPart.split("=")[1];
    const receivedSig = v1Part.split("=")[1];

    const expected = crypto
      .createHmac("sha256", secret)
      .update(`${timestamp}.${rawBody}`)
      .digest("hex");

    const bufExpected = Buffer.from(expected, "utf8");
    const bufReceived = Buffer.from(receivedSig, "utf8");

    if (bufExpected.length !== bufReceived.length) return false;
    return crypto.timingSafeEqual(bufExpected, bufReceived);
  } catch (err) {
    return false;
  }
}

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

    // Kirim notifikasi JIKA data berhasil masuk ke DB
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

  app.use(
    express.json({
      verify: (req, res, buf) => {
        req.rawBody = buf.toString("utf8");
      },
    }),
  );

  app.post("/webhook/topgg", async (req, res) => {
    try {
      const signature = req.headers["x-topgg-signature"];
      const secret = TOPGG_WEBHOOK_AUTH;
      const rawBody = req.rawBody;

      // HMAC SHA-256
      if (!verifyWebhook(rawBody, signature, secret)) {
        console.warn("⚠️ [Top.gg] Ditolak: Invalid HMAC SHA-256 Signature.");
        return res.status(401).json({ error: "Unauthorized" });
      }

      const payload = req.body || {};
      const eventType = payload.type;
      const data = payload.data || {};

      // Test vs Real Vote
      if (eventType === "webhook.test") {
        console.log(
          `🛠️ [Top.gg] Test Webhook sukses diterima dari tester: ${data.user?.name || "System"}`,
        );
        return res.status(200).json({ status: "test_ok" });
      }

      if (eventType === "vote.create") {
        const userId = data.user?.platform_id;

        if (!userId) {
          console.warn(
            "⚠️ [Top.gg] Payload vote.create tidak memiliki platform_id (Discord ID) yang valid.",
          );
          return res.status(400).json({ error: "Missing User ID" });
        }

        // 1 untuk hari biasa, 2 saat Weekend Double Vote
        const weight = data.weight || 1;
        console.log(
          `📥 [Top.gg] Memproses upvote (Multiplier: x${weight}) untuk Discord User ID: ${userId}`,
        );

        // DATABASE EXECUTION
        let isSuccess = true;
        // double vote weekend
        for (let i = 0; i < weight; i++) {
          const result = await addVoterPoint(client, userId, "Top.gg");
          if (!result) isSuccess = false;
        }

        // pola Ack-Wait 
        if (isSuccess) {
          return res.status(200).json({ status: "ok" });
        } else {
          return res.status(500).json({ error: "Database Sync Failed" });
        }
      }

    
      return res.status(200).json({ status: "ignored" });
    } catch (err) {
      console.error("❌ [Top.gg] Error Internal Server Webhook:", err.stack);
      if (!res.headersSent)
        res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.listen(3000, () => {
    console.log("🌐 Server Webhook Top.gg berjalan di Port 3000");
  });
}