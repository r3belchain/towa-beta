import { createClient } from "@supabase/supabase-js";
import { Client, GatewayIntentBits, Options, Partials } from "discord.js";
import "dotenv/config";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY,
);

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildVoiceStates,
  ],
  partials: [Partials.GuildMember],
  makeCache: Options.cacheWithLimits({
    GuildMemberManager: 200,
    VoiceStateManager: 200,
    PresenceManager: 0,
    MessageManager: 0,
    ReactionManager: 0,
    GuildEmojiManager: 0,
    GuildStickerManager: 0,
    GuildInviteManager: 0,
    GuildScheduledEventManager: 0,
    StageInstanceManager: 0,
    ThreadManager: 0,
    ThreadMemberManager: 0,
    AutoModerationRuleManager: 0,
  }),
  sweepers: {
    guildMembers: {
      interval: 3600,
      filter: () => (member) => !member.user.bot,
    },
  },
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

const userInfoCache = new Map();

function cacheUserInfo(member) {
  if (!member?.user) return;
  userInfoCache.set(member.id, {
    username: member.user.username,
    avatarURL: member.user.displayAvatarURL(),
    bot: member.user.bot,
  });
}

async function resolveUserInfo(userId, fallbackMember) {
  let info = userInfoCache.get(userId);
  if (info) return info;

  if (fallbackMember?.user) {
    cacheUserInfo(fallbackMember);
    return userInfoCache.get(userId);
  }

  const user = await client.users.fetch(userId).catch(() => null);
  if (!user) return null;

  info = {
    username: user.username,
    avatarURL: user.displayAvatarURL(),
    bot: user.bot,
  };
  userInfoCache.set(userId, info);
  return info;
}

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

client.once("clientReady", async () => {
  console.log(`✅ Bot online sebagai ${client.user.tag}`);
  await initialSync();
});

async function initialSync() {
  console.log("🔄 Memulai Initial Sync data Supabase...");
  try {
    const guild = await client.guilds.fetch(GUILD_ID);
    if (!guild) return;

    console.log("📥 Mengunduh data seluruh anggota dari Discord...");
    const members = await guild.members.fetch({ cache: false });

    members.forEach((m) => cacheUserInfo(m));

    await updateServerStats(guild);
    await syncVoiceActivity(guild);
    await syncBoosters(members);
    await initialSyncRecentMembers(members);

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

// === HELPER: VOICE ACTIVITY (INITIAL SYNC) ===

async function syncVoiceActivity(guild) {
  try {
    const voiceMembers = [];

    guild.voiceStates.cache.forEach((state) => {
      if (!state.channelId) return;

      const info = userInfoCache.get(state.id);
      if (!info || info.bot) return;

      const channel = guild.channels.cache.get(state.channelId);
      voiceMembers.push({
        discord_user_id: state.id,
        username: info.username,
        avatar_url: info.avatarURL,
        channel_id: state.channelId,
        channel_name: channel?.name ?? "unknown",
        joined_at: new Date().toISOString(),
      });
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
async function updateServerStats() {
  try {
    const guild = await client.guilds.fetch({
      guild: GUILD_ID,
      withCounts: true,
      force: true,
    });
    await supabase
      .from("server_stats")
      .update({
        total_members: guild.approximateMemberCount ?? guild.memberCount,
        online_count: guild.approximatePresenceCount ?? 0,
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

  cacheUserInfo(newMember);

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
        const hadRoleBefore = group.roleIds.some((id) =>
          oldMember.roles.cache.has(id),
        );
        if (hadRoleBefore) {
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
// 🎙️ EVENT: VOICE UPDATE (REALTIME)
// ==========================================
client.on("voiceStateUpdate", async (oldState, newState) => {
  try {
    const guildId = newState.guild?.id || oldState.guild?.id;
    if (guildId !== GUILD_ID) return;

    const userId = newState.id || oldState.id;
    const fallbackMember = newState.member || oldState.member;

    const info = await resolveUserInfo(userId, fallbackMember);
    if (!info || info.bot) return;

    if (newState.channelId) {
      await supabase.from("voice_activity").upsert(
        {
          discord_user_id: userId,
          username: info.username,
          avatar_url: info.avatarURL,
          channel_id: newState.channelId,
          channel_name: newState.channel?.name ?? "unknown",
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
  } catch (err) {
    console.error("❌ Error voiceStateUpdate:", err.message);
  }
});

// === HELPER: HANYA BERJALAN 1X SAAT BOT NYALA ===
async function initialSyncRecentMembers(members) {
  try {
    const recentMembers = members
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

    await supabase.from("recent_members").delete().neq("discord_user_id", "0");
    await supabase.from("recent_members").insert(records);
    console.log(
      `🆕 Modal Awal 10 Warga Terbaru berhasil disinkronkan tanpa kena Rate Limit.`,
    );
  } catch (err) {
    console.error("❌ Error initial sync recent members:", err.message);
  }
}

// ⏱️ CRON JOB: UPDATE STATS ONLINE

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

// EVENT: WARGA BARU JOIN (ULTRA REALTIME)

client.on("guildMemberAdd", async (member) => {
  if (member.guild.id !== GUILD_ID || member.user.bot) return;
  console.log(`👋 Warga baru: ${member.user.username}`);

  cacheUserInfo(member);

  try {
    await supabase.from("recent_members").insert({
      discord_user_id: member.id,
      username: member.user.username,
      avatar_url: member.user.displayAvatarURL(),
      joined_at: new Date(member.joinedTimestamp || Date.now()).toISOString(),
    });

    // Trim langsung di database
    await supabase.rpc("trim_recent_members", { keep_count: 10 });

    await updateServerStats();
    console.log("✅ Warga baru ditambahkan, tabel di-trim di sisi database.");
  } catch (err) {
    console.error("❌ Error insert new member:", err.message);
  }
});

// 🚪 EVENT: WARGA KELUAR (LEAVE)

client.on("guildMemberRemove", async (member) => {
  if (member.guild.id !== GUILD_ID || member.user.bot) return;
  console.log(`🚪 Warga keluar terdeteksi: ${member.user.username}`);

  userInfoCache.delete(member.id);

  try {
    await updateServerStats(member.guild);
    console.log("📊 Statistik server diperbarui (Warga keluar).");
  } catch (err) {
    console.error("❌ Error remove member:", err.message);
  }
});

client.login(process.env.DISCORD_BOT_TOKEN);
