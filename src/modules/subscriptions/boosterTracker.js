import { EmbedBuilder } from "discord.js";
import { supabase } from "../../config/supabase.js";

export async function handleBoosterExpiration(oldMember, newMember) {
  const wasBoosting = Boolean(oldMember.premiumSince);
  const isBoosting = Boolean(newMember.premiumSince);

  if (!wasBoosting || isBoosting) return;

  const userId = newMember.id;
  const guild = newMember.guild;

  try {
    const { data: boosterSubs, error } = await supabase
      .from("active_subscriptions")
      .select("*")
      .eq("user_id", userId)
      .eq("source", "BOOSTER")
      .eq("status", "ACTIVE");

    if (error) throw error;
    if (!boosterSubs || boosterSubs.length === 0) return;

    console.log(
      `🚀 [BOOSTER EXPIRED] ${newMember.user.tag} unboost server. Memproses pencabutan role...`,
    );

    for (const sub of boosterSubs) {
      const role = guild.roles.cache.get(sub.role_id);

      if (role) {
        if (sub.role_type === "CUSTOM_ROLE") {
          await role
            .delete("Server Boost kedaluwarsa / User unboost server")
            .catch((err) => {
              console.error(`❌ Gagal menghapus custom role ${role.id}:`, err);
            });
        } else {
          await newMember.roles.remove(role.id).catch(() => {});
        }
      }

      await supabase
        .from("active_subscriptions")
        .update({ status: "EXPIRED" })
        .eq("id", sub.id);
    }

    const dmEmbed = new EmbedBuilder()
      .setTitle("🚀 Status Server Boost Berakhir")
      .setColor("#E74C3C")
      .setDescription(
        `Halo <@${userId}>,\n\n` +
          `Masa aktif **Server Boost** kamu di server **${guild.name}** telah berakhir.\n` +
          `Sesuai ketentuan server, **Custom Role** kamu telah otomatis dihapus oleh sistem.\n\n` +
          `Terima kasih banyak atas bantuan dan dukungan *boost*-mu untuk TOWA! 💖`,
      )
      .setTimestamp();

    await newMember.send({ embeds: [dmEmbed] }).catch(() => {});
  } catch (err) {
    console.error("❌ Error pada handleBoosterExpiration:", err);
  }
}
