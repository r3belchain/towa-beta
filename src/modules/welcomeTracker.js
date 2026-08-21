import { EmbedBuilder } from "discord.js";
import { GUILD_ID, WELCOME_CHANNEL_ID } from "../config/constants.js";

export async function handleWelcomeMember(member, client) {
    // 1. Filter: Pastikan event dari server kita dan bukan bot
    if (member.guild.id !== GUILD_ID || member.user.bot) return;

    const user = member.user;
    const guild = member.guild;

    // --- A. KIRIM PESAN KE CHANNEL SERVER ---
    if (WELCOME_CHANNEL_ID) {
        try {
            const channel = await client.channels.fetch(WELCOME_CHANNEL_ID).catch(() => null);

            if (channel) {
                const welcomeEmbed = new EmbedBuilder()
                    .setTitle("🎉 Selamat Datang di TOWA!")
                    .setColor("#5865F2")
                    .setDescription(
                        `Wih ada muka baru nih! Welcome to tongkrongan TOWA, <@${user.id}>. Coba dong spill dikit, lu mampir ke sini lagi nyari temen mabar, tempat asbun, atau nyari jodoh nih? wkwk 😽`
                    )
                    .setThumbnail(user.displayAvatarURL({ dynamic: true }))
                    .setFooter({ text: `Warga ke-${guild.memberCount} • Jangan lupa baca rules & ambil role ya!` })
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
                `<a:Animated_Arrow_Yellow:1520176423166279792> Pilih role kamu di channel <#1529119442712269030> biar identitasmu jelas dan makin seru nongkrongnya!`
            )
            .setImage("https://cdn.discordapp.com/attachments/1515794110554832896/1540135811192983562/towa-gif.gif?ex=6a89837f&is=6a8831ff&hm=1063e95523e3be445b071d9b1d3c422b49cd494fff9b958113fe21b530181acf&")
            .setFooter({ text: "Have fun ya!" });

        // Kirim DM (Gunakan .catch karena user bisa menonaktifkan DM dari server)
        await member.send({ embeds: [dmEmbed] });
        console.log(`📩 Berhasil mengirim Welcome DM ke: ${user.username}`);
    } catch (err) {
        // Error lumrah: User memblokir DM dari member server (Discord Privacy Setting)
        console.warn(`⚠️ Tidak dapat mengirim DM ke ${user.username} (DM tertutup/diblokir).`);
    }
}
