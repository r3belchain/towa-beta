import cron from "node-cron";
import { EmbedBuilder } from "discord.js";
import { supabase } from "../../config/supabase.js";
import { GUILD_ID } from "../../config/constants.js";

export function initSubscriptionCron(client) {
  // cek otomatis setiap hari jam 00:00 malam 
  cron.schedule("0 0 * * *", async () => {
    console.log("⏰ [CRON] Memeriksa role donatur yang kedaluwarsa...");

    try {
      const nowIso = new Date().toISOString();

      const { data: expiredSubs, error } = await supabase
        .from("active_subscriptions")
        .select("*")
        .eq("status", "ACTIVE")
        .eq("source", "DONATION")
        .lte("expired_at", nowIso);

      if (error) throw error;
      if (!expiredSubs || expiredSubs.length === 0) {
        console.log(
          "✅ [CRON] Tidak ada role donatur yang kedaluwarsa hari ini.",
        );
        return;
      }

      const guild =
        client.guilds.cache.get(GUILD_ID) ||
        (await client.guilds.fetch(GUILD_ID).catch(() => null));
      if (!guild) return;

      for (const sub of expiredSubs) {
        const member = await guild.members.fetch(sub.user_id).catch(() => null);
        const role = guild.roles.cache.get(sub.role_id);

        if (member && role) {
          if (sub.role_type === "CUSTOM_ROLE") {
            await role
              .delete("Masa berlaku Custom Role Donasi 30 hari habis")
              .catch((err) => {
                console.error(
                  `❌ Gagal menghapus custom role ${role.id}:`,
                  err,
                );
              });
          } else {
            await member.roles.remove(role.id).catch(() => {});
          }

          const dmEmbed = new EmbedBuilder()
            .setTitle("⏳ Masa Aktif Donatur Berakhir")
            .setColor("#E67E22")
            .setDescription(
              `Halo <@${sub.user_id}>,\n\n` +
                `Masa berlaku (30 hari) untuk **Role Donatur / Custom Role** kamu di server **${guild.name}** telah habis.\n` +
                `Terima kasih banyak atas dukungan luar biasamu untuk TOWA! ☕💖\n\n` +
                `*Jika ingin memperpanjang benefit, kamu bisa membuka tiket donasi kembali.*`,
            )
            .setTimestamp();

          await member.send({ embeds: [dmEmbed] }).catch(() => {});
        }

        await supabase
          .from("active_subscriptions")
          .update({ status: "EXPIRED" })
          .eq("id", sub.id);
      }

      console.log(
        `🧹 [CRON] Selesai membersihkan ${expiredSubs.length} subscription kedaluwarsa.`,
      );
    } catch (err) {
      console.error("❌ Error pada Subscription Cron Job:", err);
    }
  });
}
