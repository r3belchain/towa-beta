import { EmbedBuilder, SlashCommandBuilder } from "discord.js";
import cron from "node-cron";
import { CHANNELS } from "../../config/constants.js";
import { supabase } from "../../config/supabase.js";

// Helper Fetch & Format Top 5 Embed
export async function getLeaderboardEmbed() {
  const { data: topVoters, error } = await supabase
    .from("voter_leaderboard")
    .select(
      "discord_user_id, total_points, disboard_bumps, discadia_bumps, discadia_votes, topgg_votes",
    )
    .order("total_points", { ascending: false })
    .limit(5);

  if (error || !topVoters || topVoters.length === 0) {
    return new EmbedBuilder()
      .setTitle("🏆 Top 5 Leaderboard Vote TOWA")
      .setColor("#FF0000")
      .setDescription("Belum ada data vote yang tercatat bulan ini.");
  }

  const medalEmojis = ["🥇", "🥈", "🥉", "4️⃣", "5️⃣"];

  const leaderboardList = topVoters
    .map((voter, index) => {
      const medal = medalEmojis[index] || "🔹";

      const disboard = voter.disboard_bumps || 0;
      const discadiaBumps = voter.discadia_bumps || 0;
      const discadiaVotes = voter.discadia_votes || 0;
      const discadiaTotal = discadiaBumps + discadiaVotes;
      const topgg = voter.topgg_votes || 0;

      return `${medal} <@${voter.discord_user_id}> — **${voter.total_points} Poin**\n   └ *(Disboard: ${disboard} | Discadia: ${discadiaTotal} | Top.gg: ${topgg})*`;
    })
    .join("\n\n");

  const instructionText =
    `\n\n──────────────────────────────\n` +
    `📌 **Cara Dukung & Vote TOWA Server:**\n` +
    `• **Bump Discord:** Ketik \`/bump\` untuk bot Disboard & Discadia.\n` +
    `• **Vote Discadia:** [Klik di sini untuk Vote via Website Discadia](https://discadia.com/vote/towa-tongkrongan-warga-asbu/)\n` +
    `• **Vote Top.gg:** [Klik di sini untuk Vote via Website Top.gg](https://top.gg/discord/servers/853760867561975808/vote)\n\n` +
    `⚡ **Bonus Weekend:** Setiap vote di Top.gg mendapatkan **2 Poin** (Berlaku Jumat 07:00 WIB – Senin 07:00 WIB)!`;

  return new EmbedBuilder()
    .setTitle("🏆 Top 5 Leaderboard Vote TOWA Server")
    .setColor("#FFD700")
    .setDescription(leaderboardList + instructionText)
    .setImage(
      "https://cdn.discordapp.com/attachments/1515794110554832896/1540135811192983562/towa-gif.gif?ex=6a88dabf&is=6a87893f&hm=f126325c068a2d75bfbdaaf79dc63d1f209183ed44142ffbd7da69d5a8394551&",
    )
    .setFooter({
      text: "Vote terus di Disboard, Discadia, dan Top.gg! Dukungan warga terhadap TOWA sangat berarti!",
    })
    .setTimestamp();
}

// Slash Command /leaderboard
export const leaderboardCommandData = new SlashCommandBuilder()
  .setName("leaderboard")
  .setDescription(
    "Menampilkan Top 5 Leaderboard Vote TOWA Server secara real-time",
  );

// Cronjob bulanan
export function startMonthlyResetCron(client) {
  // Menit 0, Jam 0, Tanggal 1, Setiap Bulan (WIB)
  cron.schedule(
    "0 0 1 * *",
    async () => {
      console.log(
        "⏰ [CRON] Menjalankan Rekap Pemenang & Reset Poin Bulanan...",
      );
      if (!CHANNELS.VOTE) return;

      let embedFinal = null;
      try {
        embedFinal = await getLeaderboardEmbed();
      } catch (e) {
        console.error("❌ Gagal membuat embed leaderboard:", e.message);
      }

      try {
        const channel = await client.channels
          .fetch(CHANNELS.VOTE)
          .catch(() => null);

        if (channel && embedFinal) {
          await channel.send({
            content:
              "🔥 **[REKAP LEADERBOARD VOTE - FASE WARMING UP]** 🔥\n\nTerima kasih untuk warga yang sudah berpartisipasi di periode *Warming Up* bulan ini! Berhubung masih dalam tahap uji coba & pemanasan, **belum ada role reward yang dibagikan** untuk periode kali ini.\n\n*Poin leaderboard resmi telah di-reset ke 0 untuk menyambut bulan baru.*",
            embeds: [embedFinal],
          });
          console.log(
            "📢 [CRON] Rekap leaderboard (Fase Warming Up) berhasil dikirim ke channel.",
          );
        }
      } catch (discordErr) {
        console.error(
          "⚠️ [CRON] Gagal mengirim pengumuman ke Discord:",
          discordErr.message,
        );
      }

      try {
        const { error: resetError } = await supabase
          .from("voter_leaderboard")
          .update({
            total_points: 0,
            disboard_bumps: 0,
            discadia_bumps: 0,
            discadia_votes: 0,
            topgg_votes: 0,
            updated_at: new Date().toISOString(),
          })
          .neq("discord_user_id", "0");

        if (resetError) {
          console.error(
            "❌ Gagal mereset poin di Supabase:",
            resetError.message,
          );
        } else {
          console.log(
            "✅ Berhasil mereset seluruh poin leaderboard di Supabase ke 0.",
          );
        }
      } catch (dbErr) {
        console.error("❌ Error saat query reset database:", dbErr.message);
      }
    },
    {
      timezone: "Asia/Jakarta",
    },
  );
}
