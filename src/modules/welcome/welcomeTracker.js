import { EmbedBuilder } from "discord.js";

import {
  GUILD_ID,
  CHANNELS,
  IS_PRODUCTION,
} from "../../config/constants.js";

export async function handleWelcomeMember(member, client) {
  // WAJIB ADA: Supaya tidak bentrok dengan BotGhost yang masih aktif di Server Asli.
  // Jadi, ketika masih testing di TOWA, WAJIB menggunakan if (IS_PRODUCTION) return;*
  // if (IS_PRODUCTION) return;


  if (member.guild.id !== GUILD_ID || member.user.bot) return;

  const user = member.user;
  const guild = member.guild;

  // --- A. KIRIM PESAN KE CHANNEL SERVER ---
  if (CHANNELS.WELCOME) {
    try {
      const channel = await client.channels
        .fetch(CHANNELS.WELCOME)
        .catch(() => null);

      if (channel) {
        const welcomeEmbed = new EmbedBuilder()
          .setTitle("🎉 Selamat Datang di TOWA!")
          .setColor("#e09523")
          .setDescription(
            `Wih ada muka baru nih! Welcome to tongkrongan TOWA, <@${user.id}>. Coba dong spill dikit, lu mampir ke sini lagi nyari temen mabar, tempat asbun, atau nyari jodoh nih? wkwk 😽`,
          )
          .setThumbnail(user.displayAvatarURL({ dynamic: true }))
          .setFooter({
            text: `Warga ke-${guild.memberCount} • Jangan lupa baca rules & ambil role ya!`,
          })
          .setTimestamp();

        await channel.send({
          content: `👋 Halo <@${user.id}>!`,
          embeds: [welcomeEmbed],
        });
      }
    } catch (err) {
      console.error("❌ Gagal kirim welcome message ke channel:", err.message);
    }
  }

  // --- B. KIRIM PESAN KE DM MEMBER ---
  try {
    const dmEmbed = new EmbedBuilder()
      .setTitle(`Selamat datang di ${guild.name}`)
      .setColor("#FFA500")
      .setThumbnail(guild.iconURL({ dynamic: true }))
      .setDescription(
        `Halo <@${user.id}>, selamat bergabung di **${guild.name}**! Senang banget kamu mampir ke tongkrongan kita.\n\n` +
          `• 📖 **Buku Panduan**\n` +
          `<a:Animated_Arrow_Yellow:1520176423166279792> Masih bingung cara main di sini? Langsung aja baca panduan lengkapnya di <#1529119441554772001> biar gak nyasar dan langsung luwes nongkrongnya!\n\n` +
          `• 📜 **Peraturan**\n` +
          `<a:Animated_Arrow_Yellow:1520176423166279792> Cek channel <#1529119442175393958> dulu biar tongkrongan tetap damai dan asik.\n\n` +
          `• 🏷️ **Take Role**\n` +
          `<a:Animated_Arrow_Yellow:1520176423166279792> Pilih role kamu di channel <#1529119442712269030> biar identitasmu jelas dan makin seru nongkrongnya!`,
      )
      .setImage("https://imgur.com/a/t61FJEJ")
      .setFooter({ text: "Have fun ya!" });

    await member.send({ embeds: [dmEmbed] });
    console.log(`📩 Berhasil mengirim Welcome DM ke: ${user.username}`);
  } catch (err) {
    console.warn(
      `⚠️ Tidak dapat mengirim DM ke ${user.username} (DM tertutup/diblokir).`,
    );
  }
}
