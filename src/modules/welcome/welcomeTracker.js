import { createCanvas, GlobalFonts, loadImage } from "@napi-rs/canvas";
import { AttachmentBuilder, EmbedBuilder } from "discord.js";
import { join } from "path";

import { CHANNELS, GUILD_ID } from "../../config/constants.js";

const fontPath = join(process.cwd(), "assets", "font-towa.ttf");
GlobalFonts.registerFromPath(fontPath, "TowaFont");

export async function handleWelcomeMember(member, client) {
  // WAJIB ADA: Supaya tidak bentrok dengan BotGhost yang masih aktif di Server Asli.
  // Jadi, ketika masih testing di TOWA, WAJIB menggunakan if (IS_PRODUCTION) return;*
  // if (IS_PRODUCTION) return;

  if (member.guild.id !== GUILD_ID || member.user.bot) return;

  const user = member.user;
  const guild = member.guild;

  // KIRIM PESAN KE OBROLAN RANDOM
  if (CHANNELS.WELCOME) {
    try {
      const channel = await client.channels
        .fetch(CHANNELS.WELCOME)
        .catch(() => null);

      if (channel) {
        const canvas = createCanvas(800, 400);
        const ctx = canvas.getContext("2d");

        const backgroundPath = join(process.cwd(), "assets", "bg-welcome.png");
        const background = await loadImage(backgroundPath);
        ctx.drawImage(background, 0, 0, canvas.width, canvas.height);

        ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const avatarURL = user.displayAvatarURL({
          extension: "png",
          size: 256,
        });
        const avatar = await loadImage(avatarURL);

        ctx.save();
        ctx.beginPath();
        ctx.arc(400, 150, 85, 0, Math.PI * 2, true);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(avatar, 400 - 85, 150 - 85, 170, 170);
        ctx.restore();

        ctx.beginPath();
        ctx.arc(400, 150, 85, 0, Math.PI * 2, true);
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 6;
        ctx.stroke();

        // 3. UBAH SEMUA 'sans-serif' MENJADI 'TowaFont'
        ctx.font = "45px TowaFont";
        ctx.fillStyle = "#ffffff";
        ctx.textAlign = "center";
        ctx.fillText("WELCOME", 400, 290);

        ctx.font = "bold 30px TowaFont";
        ctx.fillStyle = "#e09523";
        let displayName = user.username.toUpperCase();
        if (displayName.length > 20)
          displayName = displayName.substring(0, 20) + "...";
        ctx.fillText(displayName, 400, 335);

        ctx.font = "20px TowaFont";
        ctx.fillStyle = "#ffffff";
        ctx.fillText("Semoga Betah di TOWA, ya!", 400, 370);

        const attachment = new AttachmentBuilder(await canvas.encode("png"), {
          name: "welcome-image.png",
        });

        const welcomeEmbed = new EmbedBuilder()
          .setTitle("🤩 Selamat Datang di TOWA!")
          .setColor("#e09523")
          .setDescription(
            `Ada muka baru nih! Welcome to tongkrongan TOWA, <@${user.id}>. Coba dong spill dikit, lu mampir ke sini lagi nyari temen mabar, tempat asbun, atau nyari jodoh nih? wkwk 😽`,
          )

          .setImage("attachment://welcome-image.png")
          .setFooter({
            text: `Warga ke-${guild.memberCount} • Jangan lupa baca rules & ambil role ya!`,
          })
          .setTimestamp();

        await channel.send({
          content: `👋 Halo <@${user.id}>!`,
          embeds: [welcomeEmbed],
          files: [attachment],
        });
      }
    } catch (err) {
      console.error("❌ Gagal kirim welcome message ke channel:", err.message);
    }
  }

  // KIRIM PESAN KE DM MEMBER
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
      .setImage(
        "https://cdn.discordapp.com/attachments/1515794110554832896/1540135811192983562/towa-gif.gif?ex=6a8f723f&is=6a8e20bf&hm=5d3ca0e5f0f3ebb1640c34e8439e9e8622553af05091291fe19d8929efa75dd1&",
      )
      .setFooter({ text: "Have fun ya!" });

    await member.send({ embeds: [dmEmbed] });
    console.log(`📩 Berhasil mengirim Welcome DM ke: ${user.username}`);
  } catch (err) {
    console.warn(
      `⚠️ Tidak dapat mengirim DM ke ${user.username} (DM tertutup/diblokir).`,
    );
  }
}
