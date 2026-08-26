import {
  EmbedBuilder,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";
import { MEKANIK_ROLE_ID } from "../../config/constants.js";
import { supabase } from "../../config/supabase.js";

// DATA COMMAND
export const ticketCategoryCommandData = new SlashCommandBuilder()
  .setName("ticket-category")
  .setDescription("Manajemen Kategori Sistem Tiket TOWA")
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
  .addSubcommand((sub) =>
    sub
      .setName("add")
      .setDescription("Tambah kategori tiket baru")
      .addStringOption((opt) =>
        opt
          .setName("name")
          .setDescription("Nama Kategori (Contoh: Support, Report, Klaim)")
          .setRequired(true),
      )
      .addStringOption((opt) =>
        opt
          .setName("staff_roles")
          .setDescription(
            "ID Role Staff yang bertugas (Pisahkan dengan koma jika lebih dari 1)",
          )
          .setRequired(false),
      ),
  )
  .addSubcommand((sub) =>
    sub
      .setName("remove")
      .setDescription("Hapus kategori tiket")
      .addStringOption((opt) =>
        opt
          .setName("name")
          .setDescription("Nama kategori yang ingin dihapus")
          .setRequired(true),
      ),
  )
  .addSubcommand((sub) =>
    sub
      .setName("set-welcome")
      .setDescription("Atur pesan sambutan/form otomatis di dalam tiket")
      .addStringOption((opt) =>
        opt
          .setName("name")
          .setDescription("Nama kategori (Contoh: RT, Donasi, Laporan)")
          .setRequired(true),
      ),
  )
  .addSubcommand((sub) =>
    sub.setName("list").setDescription("Lihat semua kategori tiket"),
  );

// LOGIC HANDLER
export async function handleTicketCategoryCommand(interaction) {
  // Gembok Khusus role administrator, mekanik, owner
  const isOwner = interaction.user.id === interaction.guild.ownerId;
  const isAdmin = interaction.member.permissions.has(
    PermissionFlagsBits.Administrator,
  );
  const hasMekanikRole = interaction.member.roles.cache.has(MEKANIK_ROLE_ID);

  if (!isOwner && !isAdmin && !hasMekanikRole) {
    return await interaction.reply({
      content:
        "❌ Akses ditolak! Command ini hanya bisa digunakan oleh **Owner**, **Admin**, atau **@Mekanik TOWA**.",
      flags: MessageFlags.Ephemeral,
    });
  }

  const subcommand = interaction.options.getSubcommand();


  if (subcommand !== "set-welcome") {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  }

  try {

    //  SET WELCOME (MODAL FORM)

    if (subcommand === "set-welcome") {
      const categoryName = interaction.options.getString("name");

      // Cek apakah kategori ada di Supabase
      const { data: existing } = await supabase
        .from("ticket_categories")
        .select("name, welcome_message")
        .ilike("name", categoryName)
        .maybeSingle();

      if (!existing) {
        return await interaction.reply({
          content: `⚠️ Kategori **${categoryName}** tidak ditemukan! Bikin dulu pakai /ticket-category add`,
          flags: MessageFlags.Ephemeral,
        });
      }

      // Buka Modal Formulir
      const modal = new ModalBuilder()
        .setCustomId(`set_welcome_${categoryName}`)
        .setTitle(`Pesan Tiket: ${existing.name}`);

      const descInput = new TextInputBuilder()
        .setCustomId("welcome_text")
        .setLabel("Pesan Sambutan & Form (Gunakan {user})")
        .setPlaceholder(
          "Halo {user}, silakan isi form pendaftaran di bawah ini...",
        )
        .setStyle(TextInputStyle.Paragraph)
        .setMaxLength(4000)
        .setValue(existing.welcome_message || "") 
        .setRequired(true);

      modal.addComponents(new ActionRowBuilder().addComponents(descInput));
      await interaction.showModal(modal);

      try {
        const modalSubmit = await interaction.awaitModalSubmit({
          filter: (i) =>
            i.customId === `set_welcome_${categoryName}` &&
            i.user.id === interaction.user.id,
          time: 300000, 
        });

        const newWelcomeText =
          modalSubmit.fields.getTextInputValue("welcome_text");

        const { error } = await supabase
          .from("ticket_categories")
          .update({ welcome_message: newWelcomeText })
          .ilike("name", categoryName);

        if (error) throw error;

        return await modalSubmit.reply({
          content: `✅ Pesan sambutan untuk kategori **${existing.name}** berhasil disimpan di database!`,
          flags: MessageFlags.Ephemeral,
        });
      } catch (err) {
        console.log("⏱️ Set welcome dibatalkan (Timeout/Error).", err.message);
      }
      return; 
    }


    // LIST KATEGORI

    if (subcommand === "list") {
      const { data: categories, error } = await supabase
        .from("ticket_categories")
        .select("*");

      if (error) throw error;
      if (!categories || categories.length === 0) {
        return await interaction.editReply(
          "Belum ada kategori tiket yang dibuat.",
        );
      }

      const fields = categories.map((cat) => {
        const roleNames = cat.staff_roles
          ? cat.staff_roles
              .split(",")
              .map((r) => `<@&${r.trim()}>`)
              .join(", ")
          : "Tidak ada (Semua admin)";

        const hasWelcome = cat.welcome_message ? "✅ Tersimpan" : "❌ Default";

        return {
          name: `🏷️ ${cat.name}`,
          value: `**Staff:** ${roleNames}\n**Pesan Sambutan:** ${hasWelcome}`,
        };
      });

      const embed = new EmbedBuilder()
        .setTitle("Daftar Kategori Tiket TOWA")
        .setColor("#2b2d31")
        .addFields(fields);

      return await interaction.editReply({ embeds: [embed] });
    }

    
    // ADD KATEGORI

    else if (subcommand === "add") {
      const categoryName = interaction.options.getString("name");
      const staffRoles = interaction.options.getString("staff_roles") || "";

      // Cek  kategori 
      const { data: existing } = await supabase
        .from("ticket_categories")
        .select("name")
        .ilike("name", categoryName)
        .maybeSingle();

      if (existing) {
        return await interaction.editReply(
          `⚠️ Kategori **${categoryName}** sudah ada!`,
        );
      }

      const { error } = await supabase
        .from("ticket_categories")
        .insert([{ name: categoryName, staff_roles: staffRoles }]);

      if (error) throw error;

      return await interaction.editReply(
        `✅ Kategori **${categoryName}** berhasil ditambahkan!\n💡 *Tips: Gunakan \`/ticket-category set-welcome name:${categoryName}\` untuk mengatur pesan form otomatis.*`,
      );
    }


    // REMOVE KATEGORI
    else if (subcommand === "remove") {
      const categoryName = interaction.options.getString("name");

      const { data: deleted, error } = await supabase
        .from("ticket_categories")
        .delete()
        .ilike("name", categoryName)
        .select();

      if (error) throw error;

      if (deleted.length === 0) {
        return await interaction.editReply(
          `⚠️ Kategori **${categoryName}** tidak ditemukan di database.`,
        );
      }

      return await interaction.editReply(
        `🗑️ Kategori **${categoryName}** berhasil dihapus!`,
      );
    }
  } catch (err) {
    console.error("❌ Error Ticket Category:", err.message);
    if (interaction.deferred) {
      return await interaction.editReply(
        "❌ Terjadi kesalahan pada database Supabase.",
      );
    }
  }
}
