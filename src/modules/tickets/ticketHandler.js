import {
  ActionRowBuilder,
  AttachmentBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  ComponentType,
  EmbedBuilder,
  MessageFlags,
  PermissionFlagsBits,
  StringSelectMenuBuilder,
} from "discord.js";

import { CHANNELS } from "../../config/constants.js";
import { supabase } from "../../config/supabase.js";

// HANDLER TICKET_CREATE
export async function handleTicketOpen(interaction) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const { guild, user, customId } = interaction;

  const boundCategory = customId.includes("|") ? customId.split("|")[1] : null;

  try {
    const existingChannel = guild.channels.cache.find(
      (c) => c.name.startsWith("ticket-") && c.topic?.includes(user.id),
    );
    if (existingChannel) {
      return await interaction.editReply(
        `❌ Kamu sudah memiliki tiket yang terbuka di <#${existingChannel.id}>`,
      );
    }

    const { data: categories, error } = await supabase
      .from("ticket_categories")
      .select("*");
    if (error) throw error;

    let selectedCategoryName = boundCategory || "Default";
    let staffRoleIds = [];
    let customWelcomeMessage = null;

    if (!boundCategory && categories && categories.length > 0) {
      const options = categories.map((cat) => ({
        label: cat.name,
        value: cat.name,
        description: `Buka tiket untuk kategori ${cat.name}`,
      }));

      const menuRow = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId("ticket_category_select")
          .setPlaceholder("Pilih kategori tiket yang sesuai...")
          .addOptions(options),
      );

      await interaction.editReply({
        content: "Silakan pilih kategori tiketmu di bawah ini:",
        components: [menuRow],
      });

      const menuInteraction = await interaction.channel
        .awaitMessageComponent({
          componentType: ComponentType.StringSelect,
          filter: (i) =>
            i.customId === "ticket_category_select" && i.user.id === user.id,
          time: 60000,
        })
        .catch(() => null);

      if (!menuInteraction) {
        return await interaction.editReply({
          content: "⏱️ Waktu habis. Silakan klik tombol 'Buka Tiket' lagi.",
          components: [],
        });
      }

      await menuInteraction.deferUpdate();
      selectedCategoryName = menuInteraction.values[0];
    }

    if (categories && categories.length > 0) {
      const selectedCategoryData = categories.find(
        (cat) => cat.name.toLowerCase() === selectedCategoryName.toLowerCase(),
      );

      if (selectedCategoryData) {
        if (selectedCategoryData.staff_roles) {
          staffRoleIds = selectedCategoryData.staff_roles
            .split(",")
            .map((r) => r.trim());
        }
        // ADATA PESAN SAMBUTAN SUPABASE
        if (selectedCategoryData.welcome_message) {
          customWelcomeMessage = selectedCategoryData.welcome_message;
        }
      }
    }

    await interaction.editReply({
      content: "⏳ Sedang menyiapkan ruangan tiketmu...",
      components: [],
    });

    const ticketNumber = Math.floor(1000 + Math.random() * 9000);
    const channelName = `ticket-${ticketNumber}`;

    const permissionOverwrites = [
      {
        id: guild.roles.everyone.id,
        deny: [PermissionFlagsBits.ViewChannel],
      },
      {
        id: user.id,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ReadMessageHistory,
        ],
      },
      {
        id: guild.members.me.id,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ReadMessageHistory,
          PermissionFlagsBits.ManageChannels,
        ],
      },
    ];

    if (staffRoleIds.length > 0) {
      staffRoleIds.forEach((roleId) => {
        const role = guild.roles.cache.get(roleId);
        if (role) {
          permissionOverwrites.push({
            id: role.id,
            allow: [
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.SendMessages,
              PermissionFlagsBits.ReadMessageHistory,
            ],
          });
        }
      });
    }

    // Private Channel
    const ticketChannel = await guild.channels.create({
      name: channelName,
      type: ChannelType.GuildText,
      topic: `ticket|${user.id}|${selectedCategoryName}`,
      permissionOverwrites,
    });

    // CUSTOM EMBED INJECTION

    let embed;

    if (selectedCategoryName.toLowerCase() === "bikin-rt") {
      embed = new EmbedBuilder()
        .setTitle(`📝 Loket Pendaftaran RT TOWA - ${user.username}`)
        .setColor("#FFD700")
        .setDescription(
          `Halo <@${user.id}>, selamat datang di loket Pendaftaran RT TOWA!\n\n` +
            `Silakan **copy-paste** dan isi formulir di bawah ini, lalu kirim kembali ke channel tiket ini:`,
        )
        .addFields(
          {
            name: "📋 Format Pendaftaran",
            value:
              "```text\n" +
              "Nama RT:\n" +
              "Filosofi/Alasan Nama RT:\n" +
              "Ketua RT:\n" +
              "List member (username) (minimal 4):\n" +
              "Warna role:\n" +
              "Gambar role:\n" +
              "```",
          },
          {
            name: "💰 Informasi Pembayaran",
            value:
              "Total biaya pembuatan RT adalah **250.000 OwO Cash** (200k pendaftaran + 50k pajak).\n\n" +
              "👉 Silakan lakukan transfer (`wgive`) ke Admin/Staf yang merespons tiket ini.",
          },
          {
            name: "✅ Langkah Selanjutnya",
            value:
              "Kalau form sudah diisi dan pembayaran lunas, channel *Voice & Text* khusus RT kalian akan langsung kami proses!\n\n" +
              "*Catatan: Gunakan tombol 🔒 di bawah pesan ini jika ingin menutup tiket.*",
          },
        )
        .setThumbnail(guild.iconURL({ dynamic: true, size: 256 }))
        .setFooter({ text: "Sistem Tiket Resmi TOWA" });
    } else if (catName === "donasi") {
      embed = new EmbedBuilder()
        .setTitle(`💖 Klaim VIP & Donatur - ${user.username}`)
        .setColor("#f39b0e")
        .setDescription(
          `Halo <@${user.id}>! Makasih banyak udah jajanin dan *support* TOWA. ☕💖\n\n` +
            `Silakan lengkapi data di bawah ini agar tim admin bisa langsung memproses **Role** dan **Benefit VIP** milikmu.`,
        )
        .addFields(
          {
            name: "📸 1. Bukti Pembayaran",
            value:
              "Kirimkan **Screenshot Trakteer** (https://teer.id/towa_server) kamu di sini. Pastiin nominal/jumlah es krimnya kelihatan ya!\n\n" +
              "👉 *Kalau mau donasi pakai **OwO Cash**, silakan sebutkan nominalnya dan tunggu instruksi transfer (wgive) dari admin.*",
          },
          {
            name: "📦 2. Kirim File Benefit",
            value:
              "Punya jatah **Custom Emoji/Sticker** (Tier 2 ke atas) dan ekstra **Soundboard** (khusus Tier 4)?\n\n" +
              "**langsung aja kirim file gambar/MP3-nya ke chat ini**!",
          },
          {
            name: "🎨 3. Info Custom Role (Khusus Tier 3 & 4)",
            value:
              "Pembuatan **Custom Role (Solid/Gradient)** TIDAK dilakukan di tiket ini.\n\n" +
              "Setelah admin memverifikasi dan ngasih role *Warga Sultan* atau *Juragan TOWA* ke akunmu, silakan langsung meluncur ke channel **🎨・custom-roles** untuk bikin dan ngatur warna role-mu sendiri!",
          },
          {
            name: "⏳ Tahap Verifikasi",
            value:
              "Mohon bersabar menunggu tim <@&1515475636242612297> merespons tiket ini dan nyettingin *request* kalian. Tiket akan ditutup otomatis jika semua klaim sudah beres.",
          },
        )
        .setThumbnail(guild.iconURL({ dynamic: true, size: 256 }))
        .setFooter({ text: "Sistem Tiket TOWA • VIP Lounge" });
    } else {
      let ticketDescription =
        `Halo <@${user.id}>!\n\n` +
        `Terima kasih telah menghubungi kami. Tim Staff akan segera merespons tiketmu.\n` +
        `Silakan jelaskan keperluanmu secara detail di bawah ini.`;

      if (customWelcomeMessage) {
        ticketDescription = customWelcomeMessage.replace(
          /{user}/g,
          `<@${user.id}>`,
        );
      }

      embed = new EmbedBuilder()
        .setTitle(`🎫 Tiket #${ticketNumber} - ${selectedCategoryName}`)
        .setColor("#2ECC71")
        .setDescription(ticketDescription)
        .setFooter({
          text: "Sistem Tiket TOWA • Klik tombol 🔒 untuk menutup tiket",
        });
    }

    const closeBtnRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("TICKET_CLOSE")
        .setLabel("Tutup Tiket")
        .setEmoji("🔒")
        .setStyle(ButtonStyle.Danger),
    );

    // Ping user  ping staff
    const staffPing = staffRoleIds.map((id) => `<@&${id}>`).join(" ");
    await ticketChannel.send({
      content: `<@${user.id}> ${staffPing}`,
      embeds: [embed],
      components: [closeBtnRow],
    });

    return await interaction.editReply(
      `✅ Tiket berhasil dibuat! Silakan menuju ke <#${ticketChannel.id}>`,
    );
  } catch (err) {
    console.error("❌ Error Create Ticket:", err);
    return await interaction.editReply(
      "❌ Terjadi kesalahan saat mencoba membuat tiket.",
    );
  }
}

// HANDLER PENUTUPAN TIKET (TICKET_CLOSE)

export async function handleTicketClose(interaction) {
  const { channel, user, guild } = interaction;

  if (!channel.name.startsWith("ticket-")) {
    return await interaction.reply({
      content: "❌ Tombol ini hanya berfungsi di dalam channel tiket.",
      ephemeral: true,
    });
  }

  await interaction.deferReply();

  try {
    await interaction.editReply(
      "🔒 Sedang menutup tiket dan membuat transkrip percakapan...",
    );

    const messages = await channel.messages.fetch({ limit: 100 });
    const reversedMessages = Array.from(messages.values()).reverse();

    let transcriptContent = `=== TRANSKRIP TIKET: ${channel.name} ===\n`;
    transcriptContent += `=== Ditutup oleh: ${user.tag} pada ${new Date().toLocaleString("id-ID")} ===\n\n`;

    reversedMessages.forEach((m) => {
      if (m.author.bot && m.embeds.length > 0 && !m.content) return;

      const time = new Date(m.createdAt).toLocaleTimeString("id-ID");
      transcriptContent += `[${time}] ${m.author.username}: ${m.cleanContent}\n`;
      if (m.attachments.size > 0) {
        transcriptContent += `[File Lampiran]: ${m.attachments.map((a) => a.proxyURL).join(", ")}\n`;
      }
    });

    const transcriptFile = new AttachmentBuilder(
      Buffer.from(transcriptContent, "utf-8"),
      { name: `${channel.name}-transcript.txt` },
    );

    const topicSplit = channel.topic ? channel.topic.split("|") : [];
    const ticketOwnerId = topicSplit[1];
    const categoryName = topicSplit[2] || "Lainnya";

    // CHANNEL TICKET LOGS
    const logChannelId = CHANNELS.TICKETLOGS;
    if (logChannelId) {
      const logChannel = guild.channels.cache.get(logChannelId);
      if (logChannel) {
        const logEmbed = new EmbedBuilder()
          .setTitle(`📑 Arsip Tiket: ${channel.name}`)
          .setColor("#3498DB")
          .addFields(
            { name: "Ditutup oleh", value: `<@${user.id}>`, inline: true },
            {
              name: "Pemilik Tiket",
              value: ticketOwnerId ? `<@${ticketOwnerId}>` : "Tidak diketahui",
              inline: true,
            },
            { name: "Kategori", value: categoryName, inline: true },
          )
          .setTimestamp();

        await logChannel
          .send({
            embeds: [logEmbed],
            files: [transcriptFile],
          })
          .catch((err) => console.error("Gagal mengirim log:", err));
      } else {
        console.warn(
          "⚠️ Channel Log tidak ditemukan! Cek TICKETLOGS di constants.js",
        );
      }
    }

    // delete Channel
    await channel.delete();

    if (ticketOwnerId) {
      const ticketOwner = await guild.members
        .fetch(ticketOwnerId)
        .catch(() => null);
      if (ticketOwner) {
        const dmEmbed = new EmbedBuilder()
          .setTitle("🎫 Tiket Ditutup")
          .setColor("#E74C3C")
          .setDescription(
            `Tiketmu di server **${guild.name}** telah ditutup oleh <@${user.id}>.\nBerikut adalah lampiran riwayat percakapanmu.`,
          );

        await ticketOwner
          .send({ embeds: [dmEmbed], files: [transcriptFile] })
          .catch(() => {});
      }
    }
  } catch (err) {
    console.error("❌ Error Close Ticket:", err);
    if (channel) {
      await interaction.editReply(
        "❌ Gagal menutup tiket. Pastikan bot memiliki hak akses `Manage Channels`.",
      );
    }
  }
}
