import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  EmbedBuilder,
  MessageFlags,
  ModalBuilder,
  PermissionFlagsBits,
  SlashCommandBuilder,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";

// DATA COMMAND
export const ticketCommandData = new SlashCommandBuilder()
  .setName("ticket")
  .setDescription("Manajemen Sistem Tiket TOWA")
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
  .addSubcommand((sub) =>
    sub
      .setName("setup")
      .setDescription("Kirim panel pembuatan tiket ke channel tertentu")
      .addChannelOption((opt) =>
        opt
          .setName("channel")
          .setDescription("Channel tempat panel tiket ditaruh")
          .addChannelTypes(ChannelType.GuildText)
          .setRequired(true),
      ),
  )
  .addSubcommand((sub) =>
    sub
      .setName("close")
      .setDescription(
        "Tutup tiket ini (Hanya bisa digunakan di dalam channel tiket)",
      ),
  );

// LOGIC HANDLER
export async function handleTicketCommand(interaction) {
  const subcommand = interaction.options.getSubcommand();

  // SUBCOMMAND: /ticket setup
  if (subcommand === "setup") {
    const targetChannel = interaction.options.getChannel("channel");

    // formulir modal admin
    const modal = new ModalBuilder()
      .setCustomId(`ticket_setup_${targetChannel.id}`)
      .setTitle("Setup Panel Tiket TOWA");

    const titleInput = new TextInputBuilder()
      .setCustomId("ticket_title")
      .setLabel("Judul Embed (Opsional)")
      .setPlaceholder("Contoh: Pusat Bantuan TOWA")
      .setStyle(TextInputStyle.Short)
      .setRequired(false);

    const descInput = new TextInputBuilder()
      .setCustomId("ticket_desc")
      .setLabel("Deskripsi Embed (Opsional)")
      .setPlaceholder("Klik tombol di bawah untuk menghubungi Staff TOWA.")
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(false);

    modal.addComponents(
      new ActionRowBuilder().addComponents(titleInput),
      new ActionRowBuilder().addComponents(descInput),
    );

    await interaction.showModal(modal);

    try {
      const modalSubmit = await interaction.awaitModalSubmit({
        filter: (i) =>
          i.customId === `ticket_setup_${targetChannel.id}` &&
          i.user.id === interaction.user.id,
        time: 180000,
      });

      const inputTitle =
        modalSubmit.fields.getTextInputValue("ticket_title") ||
        "🎫 TOWA Support Ticket";
      const inputDesc =
        modalSubmit.fields.getTextInputValue("ticket_desc") ||
        "Silakan klik tombol di bawah untuk membuka tiket baru dan menghubungi Pejabat TOWA.";

      // Embed Panel
      const panelEmbed = new EmbedBuilder()
        .setColor("#2b2d31")
        .setTitle(inputTitle)
        .setDescription(inputDesc)
        .setFooter({ text: "Sistem Tiket Resmi TOWA" });

      // Buat Tombol Buka Tiket
      const ticketBtn = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("TICKET_CREATE")
          .setLabel("Buka Tiket")
          .setEmoji("📩")
          .setStyle(ButtonStyle.Primary),
      );

      await targetChannel.send({
        embeds: [panelEmbed],
        components: [ticketBtn],
      });

      await modalSubmit.reply({
        content: `✅ Panel tiket berhasil dikirim ke <#${targetChannel.id}>!`,
        flags: MessageFlags.Ephemeral,
      });
    } catch (err) {
      console.log("⏱️ Setup tiket dibatalkan (Timeout/Error).", err.message);
    }
  }

  // SUBCOMMAND: /ticket close
  else if (subcommand === "close") {
    await interaction.reply({
      content: "Fitur close sedang dibangun...",
      flags: MessageFlags.Ephemeral,
    });
  }
}
