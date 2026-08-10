require("dotenv").config();
const { Client, GatewayIntentBits, Partials } = require("discord.js");
const { createClient } = require("@supabase/supabase-js");

import express from "express";

const app = express();
const PORT = process.env.PORT || 3000;

// Endpoint sederhana agar Render tahu bot hidup
app.get("/", (req, res) => {
  res.send("Bot TOWA Discord status: ONLINE 🚀");
});

app.listen(PORT, () => {
  console.log(`Server HTTP Keep-Alive berjalan di port ${PORT}`);
});

// ... KODE DISCORD BOT & SUPABASE KAMU DI BAWAH SINI ...

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY,
);

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildPresences,
  ],
  partials: [Partials.GuildMember],
});

const GUILD_ID = process.env.GUILD_ID;

const DISCORD_ROLE_GROUPS = [
  {
    table: "staff_members",
    roleIds: [
      "1515475556127211560", // ID Owner
      "1515334583686660146", // ID Three of Founder
      "1533030542432403507", // ID Menteri Towa
      "1515475636242612297", // ID Mekanik Towa
      "1515475617641005156", // ID Moderator Towa
      "1515478413484494949", // ID Guide Towa
      "1520544354043826197", // ID Creative Lab
      "1523980859441414296", // ID Bandar Event
      "1515476142591840456", // ID Tukang ramein
    ],
  },
  {
    table: "donors",
    roleIds: [
      "1526878458763018410", // ID Juragan Towa
      "1526878454979760128", // ID Warga Sultan
    ],
  },
];

// ==========================================
// 🛡️ SISTEM JARING PENGAMAN (ANTI-CRASH)
// ==========================================
process.on("unhandledRejection", (reason) => {
  console.error("⚠️ [ANTI-CRASH] Unhandled Rejection:", reason);
});
process.on("uncaughtException", (err) => {
  console.error("⚠️ [ANTI-CRASH] Uncaught Exception:", err);
});
client.on("error", (err) => {
  console.error("⚠️ [DISCORD ERROR]:", err.message);
});
client.rest.on("rateLimited", (info) => {
  console.warn(`⏳ [RATE LIMIT WARNING] Harus menunggu ${info.timeToReset}ms`);
});

// ==========================================
// 🚀 EVENT: CLIENT READY & INITIAL SYNC
// ==========================================
client.once("clientReady", async () => {
  console.log(`✅ Bot online sebagai ${client.user.tag}`);
  await initialSync();
});

async function initialSync() {
  console.log("🔄 Memulai Initial Sync data Supabase...");
  try {
    const guild = await client.guilds.fetch(GUILD_ID);
    if (!guild) return;

    // Fetch member hanya dilakukan SATU KALI saat bot pertama kali menyala!
    console.log("📥 Mengunduh data seluruh anggota dari Discord (Cache)...");
    const members = await guild.members.fetch();

    await updateServerStats(guild);
    await syncVoiceActivity(guild);
    await syncBoosters(members);
    await syncRecentMembers(guild);

    for (const group of DISCORD_ROLE_GROUPS) {
      await syncRoleGroup(members, group.table, group.roleIds);
    }

    console.log("✅ Initial Sync Selesai!");
  } catch (err) {
    console.error("❌ Error saat Initial Sync:", err.message);
  }
}

// === HELPER: SMART SYNC ROLE GROUP (TANPA WIPE TABLE) ===
async function syncRoleGroup(members, tableName, roleIds) {
  try {
    if (!roleIds || roleIds.length === 0) return;

    const records = [];
    members.forEach((member) => {
      if (member.user.bot) return;

      let matchedRole = null;
      roleIds.forEach((roleId, index) => {
        if (member.roles.cache.has(roleId) && !matchedRole) {
          const discordRole = member.roles.cache.get(roleId);
          matchedRole = {
            roleId: discordRole.id,
            name: discordRole.name,
            color:
              discordRole.hexColor !== "#000000"
                ? discordRole.hexColor
                : "#ffffff",
            order: index + 1,
          };
        }
      });

      if (matchedRole) {
        records.push({
          discord_user_id: member.id,
          username: member.user.username,
          display_name: member.displayName || member.user.username,
          avatar_url: member.user.displayAvatarURL(),
          role_id: matchedRole.roleId,
          role_name: matchedRole.name,
          role_color: matchedRole.color,
          position_order: matchedRole.order,
          updated_at: new Date().toISOString(),
        });
      }
    });

    // 1. Ambil ID yang ada di DB sekarang
    const { data: currentData } = await supabase
      .from(tableName)
      .select("discord_user_id");
    const currentIds = currentData
      ? currentData.map((d) => d.discord_user_id)
      : [];

    // 2. Cari ID yang sudah tidak punya role dan harus dihapus
    const newIds = records.map((r) => r.discord_user_id);
    const idsToDelete = currentIds.filter((id) => !newIds.includes(id));

    // 3. Upsert data baru/update
    if (records.length > 0) {
      await supabase
        .from(tableName)
        .upsert(records, { onConflict: "discord_user_id" });
    }

    // 4. Hapus secara spesifik (TIDAK MENGHAPUS SEMUA DATA!)
    if (idsToDelete.length > 0) {
      await supabase
        .from(tableName)
        .delete()
        .in("discord_user_id", idsToDelete);
    }

    console.log(
      `✅ Table [${tableName}] tersinkron (Upsert: ${records.length}, Hapus: ${idsToDelete.length})`,
    );
  } catch (err) {
    console.error(`❌ Error syncRoleGroup [${tableName}]:`, err.message);
  }
}

async function syncBoosters(members) {
  try {
    const activeBoosters = members.filter((m) => m.premiumSince !== null);
    const boosterRecords = activeBoosters.map((m) => ({
      discord_user_id: m.id,
      username: m.user.username,
      avatar_url: m.user.displayAvatarURL(),
      boosting_since: m.premiumSince,
    }));

    const { data: currentData } = await supabase
      .from("boosters")
      .select("discord_user_id");
    const currentIds = currentData
      ? currentData.map((d) => d.discord_user_id)
      : [];
    const newIds = boosterRecords.map((r) => r.discord_user_id);
    const idsToDelete = currentIds.filter((id) => !newIds.includes(id));

    if (boosterRecords.length > 0) {
      await supabase
        .from("boosters")
        .upsert(boosterRecords, { onConflict: "discord_user_id" });
    }
    if (idsToDelete.length > 0) {
      await supabase
        .from("boosters")
        .delete()
        .in("discord_user_id", idsToDelete);
    }
    console.log(
      `💎 Boosters tersinkronisasi (${activeBoosters.size} boosters)`,
    );
  } catch (err) {
    console.error("❌ Error sync boosters:", err.message);
  }
}

async function syncVoiceActivity(guild) {
  try {
    const voiceMembers = [];
    guild.channels.cache.forEach((channel) => {
      if (channel.isVoiceBased()) {
        channel.members.forEach((member) => {
          if (!member.user.bot) {
            voiceMembers.push({
              discord_user_id: member.id,
              username: member.user.username,
              avatar_url: member.user.displayAvatarURL(),
              channel_id: channel.id,
              channel_name: channel.name,
              joined_at: new Date().toISOString(),
            });
          }
        });
      }
    });

    const { data: currentData } = await supabase
      .from("voice_activity")
      .select("discord_user_id");
    const currentIds = currentData
      ? currentData.map((d) => d.discord_user_id)
      : [];
    const newIds = voiceMembers.map((r) => r.discord_user_id);
    const idsToDelete = currentIds.filter((id) => !newIds.includes(id));

    if (voiceMembers.length > 0) {
      await supabase
        .from("voice_activity")
        .upsert(voiceMembers, { onConflict: "discord_user_id" });
    }
    if (idsToDelete.length > 0) {
      await supabase
        .from("voice_activity")
        .delete()
        .in("discord_user_id", idsToDelete);
    }
    console.log(
      `🔊 Voice activity tersinkronisasi (${voiceMembers.length} warga di VC)`,
    );
  } catch (err) {
    console.error("❌ Error sync voice activity:", err.message);
  }
}

// === HELPER: UPDATE SERVER STATS (100% CACHE BASED) ===
async function updateServerStats(guild) {
  try {
    // Menghitung online count HANYA dari cache presences (Super Ringan!)
    const onlineCount = guild.presences.cache.filter(
      (presence) => presence.status !== "offline",
    ).size;

    await supabase
      .from("server_stats")
      .update({
        total_members: guild.memberCount,
        online_count: onlineCount,
        updated_at: new Date().toISOString(),
      })
      .eq("id", 1);
  } catch (err) {
    console.error("❌ Error update stats:", err.message);
  }
}

// ==========================================
// 🎯 EVENT: ROLE / BOOSTER UPDATE (SURGICAL UPDATE)
// ==========================================
client.on("guildMemberUpdate", async (oldMember, newMember) => {
  if (newMember.guild.id !== GUILD_ID || newMember.user.bot) return;

  // 1. Cek Perubahan Booster
  const wasBooster = oldMember.premiumSince !== null;
  const isBooster = newMember.premiumSince !== null;

  if (!wasBooster && isBooster) {
    await supabase.from("boosters").upsert({
      discord_user_id: newMember.id,
      username: newMember.user.username,
      avatar_url: newMember.user.displayAvatarURL(),
      boosting_since: newMember.premiumSince,
    });
  } else if (wasBooster && !isBooster) {
    await supabase
      .from("boosters")
      .delete()
      .eq("discord_user_id", newMember.id);
  }

  // 2. Cek Perubahan Role (Operasi Bedah / Surgical Update)
  if (!oldMember.roles.cache.equals(newMember.roles.cache)) {
    for (const group of DISCORD_ROLE_GROUPS) {
      let matchedRole = null;

      // Cari role prioritas tertinggi yang dimiliki member saat ini
      group.roleIds.forEach((roleId, index) => {
        if (newMember.roles.cache.has(roleId) && !matchedRole) {
          const discordRole = newMember.roles.cache.get(roleId);
          matchedRole = {
            roleId: discordRole.id,
            name: discordRole.name,
            color:
              discordRole.hexColor !== "#000000"
                ? discordRole.hexColor
                : "#ffffff",
            order: index + 1,
          };
        }
      });

      if (matchedRole) {
        // Jika dia PUNYA salah satu role, cukup Update DIA SAJA (Upsert)
        await supabase.from(group.table).upsert(
          {
            discord_user_id: newMember.id,
            username: newMember.user.username,
            display_name: newMember.displayName || newMember.user.username,
            avatar_url: newMember.user.displayAvatarURL(),
            role_id: matchedRole.roleId,
            role_name: matchedRole.name,
            role_color: matchedRole.color,
            position_order: matchedRole.order,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "discord_user_id" },
        );
      } else {
        // Jika dia TIDAK PUNYA, cek apakah sebelumnya dia punya?
        const hadRoleBefore = group.roleIds.some((id) =>
          oldMember.roles.cache.has(id),
        );
        if (hadRoleBefore) {
          // Jika role-nya baru saja dicabut, Hapus DIA SAJA dari database
          await supabase
            .from(group.table)
            .delete()
            .eq("discord_user_id", newMember.id);
        }
      }
    }
    console.log(
      `🎭 Update spesifik berhasil pada role: ${newMember.user.username}`,
    );
  }
});

// ==========================================
// 🎙️ EVENT: VOICE UPDATE
// ==========================================
client.on("voiceStateUpdate", async (oldState, newState) => {
  const guildId = newState.guild?.id || oldState.guild?.id;
  if (guildId !== GUILD_ID) return;

  const userId = newState.id || oldState.id;
  const member = newState.member || oldState.member;
  if (member?.user?.bot) return;

  if (newState.channelId) {
    await supabase.from("voice_activity").upsert(
      {
        discord_user_id: userId,
        username: member.user.username,
        avatar_url: member.user.displayAvatarURL(),
        channel_id: newState.channelId,
        channel_name: newState.channel.name,
        joined_at: new Date().toISOString(),
      },
      { onConflict: "discord_user_id" },
    );
  } else if (oldState.channelId && !newState.channelId) {
    await supabase
      .from("voice_activity")
      .delete()
      .eq("discord_user_id", userId);
  }
});

// === HELPER: SYNC 10 WARGA TERBARU ===
async function syncRecentMembers(guild) {
  try {
    // 1. Ambil member dari RAM, buang bot, urutkan dari yang terbaru, ambil 10 teratas
    const recentMembers = guild.members.cache
      .filter((m) => !m.user.bot)
      .sort((a, b) => b.joinedTimestamp - a.joinedTimestamp)
      .first(10);

    const records = recentMembers.map((m) => ({
      discord_user_id: m.id,
      username: m.user.username,
      avatar_url: m.user.displayAvatarURL(),
      joined_at: new Date(m.joinedTimestamp).toISOString(),
    }));

    if (records.length === 0) return;

    // 2. Format ulang tabel dengan 10 data terbaru
    await supabase.from("recent_members").delete().neq("discord_user_id", "0");
    await supabase.from("recent_members").insert(records);

    console.log(`🆕 Sinkronisasi 10 Warga Terbaru berhasil.`);
  } catch (err) {
    console.error("❌ Error sync recent members:", err.message);
  }
}

// ==========================================
// ⏱️ CRON JOB: UPDATE STATS ONLINE
// ==========================================
setInterval(
  async () => {
    try {
      const guild = await client.guilds.fetch(GUILD_ID);
      if (guild) updateServerStats(guild);
    } catch (err) {
      console.error("❌ Error interval stats:", err.message);
    }
  },
  2 * 60 * 1000,
);

// ==========================================
// 👋 EVENT: WARGA BARU JOIN
// ==========================================
client.on("guildMemberAdd", async (member) => {
  if (member.guild.id !== GUILD_ID || member.user.bot) return;
  console.log(`👋 Warga baru terdeteksi: ${member.user.username}`);
  await syncRecentMembers(member.guild);
  await updateServerStats(member.guild); // Opsional: Update angka total member
});

// ==========================================
// 🚪 EVENT: WARGA KELUAR (LEAVE)
// ==========================================
client.on("guildMemberRemove", async (member) => {
  if (member.guild.id !== GUILD_ID || member.user.bot) return;
  console.log(`🚪 Warga keluar terdeteksi: ${member.user.username}`);
  await syncRecentMembers(member.guild);
  await updateServerStats(member.guild);
});

client.login(process.env.DISCORD_BOT_TOKEN);
