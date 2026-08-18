import { EmbedBuilder, SlashCommandBuilder } from "discord.js";
import cron from "node-cron";
import { supabase } from "../config/supabase.js";
import { VOTE_CHANNEL_ID } from "../config/constants.js";

// Helper Fetch & Format Top 5 Embed
export async function getLeaderboardEmbed() {
  const { data: topVoters, error } = await supabase
    .from("voter_leaderboard")
    .select(
      "discord_user_id, total_points, disboard_bumps, discadia_bumps, topgg_votes",
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
      const discadia = voter.discadia_bumps || 0;
      const totalBumps = disboard + discadia;
      const topgg = voter.topgg_votes || 0;

      return `${medal} <@${voter.discord_user_id}> — **${voter.total_points} Poin**\n   └ *(Disboard/Discadia: ${totalBumps} | Top.gg: ${topgg})*`;
    })
    .join("\n\n");

  return new EmbedBuilder()
    .setTitle("🏆 Top 5 Leaderboard Vote TOWA Server")
    .setColor("#FFD700")
    .setDescription(leaderboardList)
    .setFooter({ text: "Vote terus di Disboard, Discadia, dan Top.gg!" })
    .setTimestamp();
}

// Definisi Slash Command /leaderboard
export const leaderboardCommandData = new SlashCommandBuilder()
  .setName("leaderboard")
  .setDescription(
    "Menampilkan Top 5 Leaderboard Vote TOWA Server secara real-time",
  );

// Cronjob Broadcast Mingguan 
export function startWeeklyLeaderboardCron(client) {
  cron.schedule(
    "0 21 * * 6", 
    async () => {
      console.log("⏰ Menjalankan Cron Broadcast Leaderboard Sabtu Malam...");
      if (!VOTE_CHANNEL_ID) return;

      try {
        const channel = await client.channels
          .fetch(VOTE_CHANNEL_ID)
          .catch(() => null);
        if (channel) {
          const embed = await getLeaderboardEmbed();
          await channel.send({
            content:
              "📢 **[REKAP MINGGUAN]** Berikut adalah Top 5 Pemimpin Vote TOWA Sabtu Malam Ini! 🔥",
            embeds: [embed],
          });
        }
      } catch (err) {
        console.error(
          "❌ Gagal mengirim broadcast leaderboard mingguan:",
          err.message,
        );
      }
    },
    {
      timezone: "Asia/Jakarta", 
    },
  );
}
