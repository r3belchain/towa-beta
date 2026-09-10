import { AttachmentBuilder, SlashCommandBuilder } from "discord.js";
import { generateWargaCard } from "../../services/canvasService.js";
import {
  getOrCreateUserStats,
  getOrCreateWargaCard,
  updateWargaBackground,
} from "../../services/databaseService.js";
// ⚠️ Sesuaikan path ini dengan lokasi final towaCardEditHandler.js / themeSelectHandler.js
import { buildEditMessage } from "../../services/towaCardEditHandler.js";
import { buildThemeMessage } from "../../services/themeSelectHandler.js";

export const data = new SlashCommandBuilder()
  .setName("towacard")
  .setDescription("TOWA Card warga asbun")

  .addSubcommand((subcmd) =>
    subcmd
      .setName("profil")
      .setDescription("Lihat TOWA Card milikmu atau warga lain.")
      .addUserOption((opt) =>
        opt
          .setName("target")
          .setDescription("Warga yang ingin dilihat TOWA Card-nya")
          .setRequired(false),
      ),
  )

  .addSubcommand((subcmd) =>
    subcmd
      .setName("edit")
      .setDescription("Edit Bio, Quote, Hobi, dan Status TOWA Card kamu."),
  )

  .addSubcommand((subcmd) =>
    subcmd.setName("theme").setDescription("Pilih tema warna TOWA Card kamu."),
  )

  .addSubcommand((subcmd) =>
    subcmd
      .setName("background")
      .setDescription("Ganti gambar background TOWA Card kamu.")
      .addAttachmentOption((opt) =>
        opt
          .setName("gambar")
          .setDescription(
            "Upload gambar untuk background (Kosongkan untuk reset)",
          )
          .setRequired(false),
      ),
  );

export async function execute(interaction) {
  const subcommand = interaction.options.getSubcommand();
  const userId = interaction.user.id;

  try {
    // ---------- PROFIL (publik) ----------
    if (subcommand === "profil") {
      await interaction.deferReply();

      const targetUser =
        interaction.options.getUser("target") || interaction.user;
      const member = await interaction.guild.members.fetch(targetUser.id);

      const userKtpData = await getOrCreateWargaCard(member.id);
      const userStats = await getOrCreateUserStats(member.id);

      const imageBuffer = await generateWargaCard(
        member,
        userStats,
        userKtpData,
      );
      const attachment = new AttachmentBuilder(imageBuffer, {
        name: "towacard.png",
      });

      await interaction.editReply({ files: [attachment] });
    }

    // ---------- EDIT: Bio, Quote, Hobi, Status (ephemeral) ----------
    else if (subcommand === "edit") {
      await interaction.deferReply({ ephemeral: true });

      const userKtpData = await getOrCreateWargaCard(userId);
      await interaction.editReply(buildEditMessage(userKtpData));
    }

    // ---------- THEME (ephemeral) ----------
    else if (subcommand === "theme") {
      await interaction.deferReply({ ephemeral: true });
      await interaction.editReply(buildThemeMessage());
    }

    // ---------- BACKGROUND (publik, seperti sebelumnya) ----------
    else if (subcommand === "background") {
      await interaction.deferReply();

      const attachment = interaction.options.getAttachment("gambar");
      if (!attachment) {
        await updateWargaBackground(userId, null);
        return interaction.editReply(
          "✅ Background TOWA Card dikembalikan ke warna default!",
        );
      }

      if (!attachment.contentType.startsWith("image/")) {
        return interaction.editReply(
          "❌ File yang dikirim harus berupa gambar (PNG/JPG)!",
        );
      }

      await updateWargaBackground(userId, attachment.url);
      await interaction.editReply(
        "✅ Background TOWA Card berhasil diperbarui! Coba cek dengan `/towacard profil`.",
      );
    }
  } catch (error) {
    console.error("[ERROR TOWA CARD]:", error);
    const errorMessage =
      "❌ Terjadi kesalahan fatal pada sistem TOWA Card. Hubungi Mekanik TOWA!";

    // interaction bisa sudah deferred/replied di titik manapun tergantung di
    // mana error terjadi — cek dulu sebelum pilih reply() vs editReply().
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply(errorMessage);
    } else {
      await interaction.reply({ content: errorMessage, ephemeral: true });
    }
  }
}
