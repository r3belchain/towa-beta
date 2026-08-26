import express from "express";
import {
  CHANNELS,
  EXTERNAL_BOTS,
  GUILD_ID,
  WEBHOOK_SECRETS,
} from "../../config/constants.js";
import { supabase } from "../../config/supabase.js";
import { verifyTopGGWebhook } from "../../utils/webhookVerifier.js";

async function addVoterPoint(client, userId, source) {
  try {
    // Cek apakah user sudah terdaftar di Supabase
    const { data: userExist, error: fetchError } = await supabase
      .from("voter_leaderboard")
      .select(
        "total_points, disboard_bumps, discadia_bumps, topgg_votes, discadia_votes",
      )
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

    const cleanSource = source.toLowerCase().replace(/\./g, "");

    if (cleanSource === "disboard") {
      updateData.disboard_bumps = (userExist?.disboard_bumps || 0) + 1;
    } else if (cleanSource === "discadia") {
      updateData.discadia_bumps = (userExist?.discadia_bumps || 0) + 1;
    } else if (cleanSource === "topgg") {
      updateData.topgg_votes = (userExist?.topgg_votes || 0) + 1;
    } else if (cleanSource === "discadia_vote") {
      updateData.discadia_votes = (userExist?.discadia_votes || 0) + 1;
    }

    // Ambil username terbaru dari Discord
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

    if (CHANNELS.VOTE) {
      const channel = await client.channels
        .fetch(CHANNELS.VOTE)
        .catch(() => null);
      if (channel) {
        const displaySource = source.replace("_", " ");
        await channel.send(
          `🔥 Keren! Poin leaderboard bertambah untuk <@${userId}> via **${displaySource}**!`,
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
  if (message.channelId !== CHANNELS.VOTE) return;
  // TES CONSOLE
  console.log(
    `[DEBUG VOTE] Pesan terdeteksi di channel VOTE dari: ${message.author.username} (ID: ${message.author.id})`,
  );

  const isDisboard = message.author.id === EXTERNAL_BOTS.DISBOARD;
  const isDiscadia = message.author.id === EXTERNAL_BOTS.DISCADIA;

  if (!isDisboard && !isDiscadia) {
    // TES CONSOLE
    console.log(
      `[DEBUG VOTE] Diabaikan. ID ${message.author.id} tidak cocok dengan Disboard (${EXTERNAL_BOTS.DISBOARD}) atau Discadia (${EXTERNAL_BOTS.DISCADIA})`,
    );

    return;
  }

  try {
    let platform = isDisboard ? "Disboard" : "Discadia";
    // Tes console
    console.log(`[DEBUG VOTE] Memproses pesan dari platform: ${platform}`);
    const contentStr = message.content.toLowerCase();
    const embedsStr = message.embeds
      .map(
        (e) =>
          `${e.title || ""} ${e.description || ""} ${e.fields?.map((f) => f.value).join(" ") || ""}`,
      )
      .join(" ")
      .toLowerCase();

    const fullText = `${contentStr} ${embedsStr}`;
    // Tes console
    console.log(`[DEBUG VOTE] Teks yang berhasil dibaca bot:`, fullText);

    let isSuccess = false;

    if (platform === "Disboard") {
      isSuccess = fullText.includes("bump done");
    } else if (platform === "Discadia") {
      isSuccess =
        fullText.includes("successfully bumped") &&
        !fullText.includes("already bumped recently");
    }
    // TEs Console
    console.log(`[DEBUG VOTE] Status isSuccess: ${isSuccess}`);
    if (isSuccess) {
      const userId =
        message.interactionMetadata?.user?.id ||
        message.interaction?.user?.id ||
        message.mentions.users.filter((u) => !u.bot).first()?.id ||
        message.mentions.repliedUser?.id ||
        message.referencedMessage?.author?.id;

      if (userId) {
        console.log(`[DEBUG VOTE] Menambahkan poin ke User ID: ${userId}`);
        await addVoterPoint(client, userId, platform);

        if (typeof message.react === "function") {
          await message.react("✅").catch(() => {});
        }
      } else {
        console.warn(
          `⚠️ [${platform}] Bump sukses, tapi User ID gagal diekstrak!`,
        );
        if (typeof message.reply === "function") {
          await message
            .reply(
              `🎉 **Bump ${platform} Berhasil!**\n\n*Tapi sepertinya API Discord menyembunyikan datamu.* 😔\nTim Mekanik TOWA akan cek secara berkala untuk tambah poin secara manual.`,
            )
            .catch(() => {});
        }
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

      const secret = WEBHOOK_SECRETS.TOPGG;
      const rawBody = req.rawBody;

      // HMAC SHA-256 Verifier (Menggunakan Helper)
      if (!verifyTopGGWebhook(rawBody, signature, secret)) {
        console.warn("⚠️ [Top.gg] Ditolak: Invalid HMAC SHA-256 Signature.");
        return res.status(401).json({ error: "Unauthorized" });
      }

      const payload = req.body || {};
      const eventType = payload.type;
      const data = payload.data || {};

      // Test vs Real Vote
      if (eventType === "webhook.test") {
        console.log(
          `🛠️ [Top.gg] Test Webhook sukses diterima dari tester: ${
            data.user?.name || "System"
          }`,
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
        for (let i = 0; i < weight; i++) {
          const result = await addVoterPoint(client, userId, "Top.gg");
          if (!result) isSuccess = false;
        }

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

  app.post("/webhook/discadia", async (req, res) => {
    try {
      const { user_id, guild_id } = req.body;

      if (guild_id !== GUILD_ID) {
        console.warn("⚠️ [Discadia] Ditolak: Guild ID tidak cocok.");
        return res.status(400).json({ error: "Invalid Guild ID" });
      }

      if (!user_id) {
        return res.status(400).json({ error: "Missing user_id parameter" });
      }

      console.log(
        `📥 [Discadia] Memproses upvote web untuk Discord User ID: ${user_id}`,
      );

      const result = await addVoterPoint(client, user_id, "Discadia_Vote");

      if (result) {
        return res.status(200).json({ status: "success" });
      } else {
        return res.status(500).json({ error: "Database Sync Failed" });
      }
    } catch (err) {
      console.error("❌ [Discadia] Error Internal Server Webhook:", err.stack);
      if (!res.headersSent)
        res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.listen(3000, () => {
    console.log("🌐 Server Webhook Top.gg berjalan di Port 3000");
  });
}
