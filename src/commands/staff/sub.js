import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
} from "discord.js";
import { supabase } from "../../config/supabase.js";

export const data = new SlashCommandBuilder()
  .setName("sub")
  .setDescription("Manajemen jadwal durasi Role Donatur & Custom Role")
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
  .addSubcommand((subcommand) =>
    subcommand
      .setName("add")
      .setDescription("Daftarkan jadwal role donasi atau booster untuk user")
      .addUserOption((option) =>
        option
          .setName("user")
          .setDescription("Warga penerima role")
          .setRequired(true),
      )
      .addRoleOption((option) =>
        option
          .setName("role")
          .setDescription("Role yang dipasang/diberikan")
          .setRequired(true),
      )
      .addStringOption((option) =>
        option
          .setName("source")
          .setDescription("Sumber perolehan role")
          .setRequired(true)
          .addChoices(
            { name: "Donasi (30 Hari / Berdurasi)", value: "DONATION" },
            { name: "Server Booster (Ikut status boost)", value: "BOOSTER" },
          ),
      )
      .addStringOption((option) =>
        option
          .setName("role_type")
          .setDescription("Tipe role (Penentu aksi saat expired)")
          .setRequired(true)
          .addChoices(
            {
              name: "Role Donatur Biasa (Hanya dicabut dari user saat expired)",
              value: "DONATOR_ROLE",
            },
            {
              name: "Custom Role (Hapus permanen role dari server saat expired)",
              value: "CUSTOM_ROLE",
            },
          ),
      )
      .addIntegerOption((option) =>
        option
          .setName("days")
          .setDescription("Jumlah hari durasi donasi (Default: 30 hari)")
          .setRequired(false),
      )
      .addStringOption((option) =>
        option
          .setName("start_date")
          .setDescription(
            "Tanggal mulai donasi (Format: DD-MM-YYYY, cth: 22-08-2026). Default: Hari ini",
          )
          .setRequired(false),
      ),
  );

export async function execute(interaction) {
  await interaction.deferReply({ ephemeral: true });

  const targetUser = interaction.options.getUser("user");
  const targetRole = interaction.options.getRole("role");
  const source = interaction.options.getString("source");
  const roleType = interaction.options.getString("role_type");
  const additionalDays = interaction.options.getInteger("days") || 30;
  const startDateInput = interaction.options.getString("start_date");

  try {
    let finalExpiredAt = null;
    let isAccumulated = false;
    let baseDate = new Date();

    // parsing start date logic
    if (startDateInput && source === "DONATION") {
      let parsedDate = null;

      if (startDateInput.includes("-")) {
        const parts = startDateInput.split("-");
        if (parts[0].length === 4) {
          //fFormat YYYY-MM-DD
          parsedDate = new Date(startDateInput);
        } else if (parts[2].length === 4) {
          // format DD-MM-YYYY
          parsedDate = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
        }
      } else if (startDateInput.includes("/")) {
        const parts = startDateInput.split("/");
        if (parts[2].length === 4) {
          // format DD/MM/YYYY
          parsedDate = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
        }
      }

      if (parsedDate && !isNaN(parsedDate.getTime())) {
        baseDate = parsedDate;
      } else {
        return await interaction.editReply(
          "❌ Format `start_date` salah! Gunakan format **DD-MM-YYYY** (Contoh: `22-08-2026`).",
        );
      }
    }

    //  Penentuan Expired At logic
    if (source === "DONATION") {
      const { data: existingSub } = await supabase
        .from("active_subscriptions")
        .select("*")
        .eq("user_id", targetUser.id)
        .eq("role_id", targetRole.id)
        .eq("status", "ACTIVE")
        .maybeSingle();

      const now = new Date();

   
      if (!startDateInput && existingSub && existingSub.expired_at) {
        const currentExpiry = new Date(existingSub.expired_at);
        if (currentExpiry > now) {
          currentExpiry.setDate(currentExpiry.getDate() + additionalDays);
          finalExpiredAt = currentExpiry.toISOString();
          isAccumulated = true;
        } else {
          baseDate.setDate(baseDate.getDate() + additionalDays);
          finalExpiredAt = baseDate.toISOString();
        }
      } else {
        baseDate.setDate(baseDate.getDate() + additionalDays);
        finalExpiredAt = baseDate.toISOString();
      }
    }

    // simpan atau update data di supabase
    const { data: existingRecord } = await supabase
      .from("active_subscriptions")
      .select("id")
      .eq("user_id", targetUser.id)
      .eq("role_id", targetRole.id)
      .maybeSingle();

    if (existingRecord) {
      const { error: updateErr } = await supabase
        .from("active_subscriptions")
        .update({
          role_type: roleType,
          source: source,
          expired_at: finalExpiredAt,
          status: "ACTIVE",
        })
        .eq("id", existingRecord.id);

      if (updateErr) throw updateErr;
    } else {
      const { error: insertErr } = await supabase
        .from("active_subscriptions")
        .insert({
          user_id: targetUser.id,
          role_id: targetRole.id,
          role_type: roleType,
          source: source,
          expired_at: finalExpiredAt,
          status: "ACTIVE",
        });

      if (insertErr) throw insertErr;
    }

    // apakah role terpasaang di discord member
    const member = await interaction.guild.members
      .fetch(targetUser.id)
      .catch(() => null);
    if (member && !member.roles.cache.has(targetRole.id)) {
      await member.roles.add(targetRole.id).catch(() => {});
    }

    // kirim sukses embed ke staf
    const expiryText = finalExpiredAt
      ? `<t:${Math.floor(new Date(finalExpiredAt).getTime() / 1000)}:R> (<t:${Math.floor(new Date(finalExpiredAt).getTime() / 1000)}:F>)`
      : "Mengikuti Status Server Booster";

    const embed = new EmbedBuilder()
      .setTitle("✅ Jadwal Subscription Berhasil Didaftarkan")
      .setColor("#2ECC71")
      .addFields(
        { name: "👤 User", value: `<@${targetUser.id}>`, inline: true },
        { name: "🎭 Role", value: `<@&${targetRole.id}>`, inline: true },
        { name: "🏷️ Source", value: `\`${source}\``, inline: true },
        { name: "📦 Role Type", value: `\`${roleType}\``, inline: true },
        {
          name: "⏳ Status Penghitungan",
          value: startDateInput
            ? `🗓️ *Mulai Tanggal: ${startDateInput}*`
            : isAccumulated
              ? "⚡ *Durasi Ditambahkan dari Expired Sebelumnya*"
              : "🆕 *Dihitung Mulai Hari Ini*",
          inline: true,
        },
        { name: "📅 Expired Pada", value: expiryText, inline: false },
      )
      .setTimestamp();

    return await interaction.editReply({ embeds: [embed] });
  } catch (err) {
    console.error("❌ Error /sub add:", err);
    return await interaction.editReply(
      "❌ Gagal mendaftarkan jadwal ke Supabase.",
    );
  }
}
