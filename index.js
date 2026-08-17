import {
  Client,
  GatewayIntentBits,
  Options,
  Partials,
  REST,
  Routes,
} from "discord.js";
import "dotenv/config";
import { DISCORD_ROLE_GROUPS, GUILD_ID } from "./src/config/constants.js";
import {
  getLeaderboardEmbed,
  leaderboardCommandData,
  startWeeklyLeaderboardCron,
} from "./src/modules/leaderboard.js";
import {
  handleGuildMemberAdd,
  handleGuildMemberRemove,
  handleGuildMemberUpdate,
  initialSyncRecentMembers,
  syncBoosters,
  syncRoleGroup,
} from "./src/modules/memberTracker.js";
import {
  startStatsCron,
  updateServerStats,
} from "./src/modules/statsTracker.js";
import {
  handleVoiceStateUpdate,
  syncVoiceActivity,
} from "./src/modules/voiceTracker.js";
import {
  handleVoteMessage,
  startTopGGWebhook,
} from "./src/modules/voteTracker.js";
import { cacheUserInfo } from "./src/utils/userCache.js";

// SETUP DISCORD CLIENT

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
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

// 2. ANTI-CRASH & WARNINGS

process.on("unhandledRejection", (reason) =>
  console.error("⚠️ [ANTI-CRASH] Unhandled:", reason),
);
process.on("uncaughtException", (err) =>
  console.error("⚠️ [ANTI-CRASH] Uncaught:", err),
);
client.on("error", (err) => console.error("⚠️ [DISCORD ERROR]:", err.message));
client.rest.on("rateLimited", (info) =>
  console.warn(`⏳ [RATE LIMIT] Tunggu ${info.timeToReset}ms`),
);

// INITIAL SYNC LOGIC

async function initialSync() {
  console.log("🔄 Memulai Initial Sync data Supabase...");
  try {
    const guild = await client.guilds.fetch(GUILD_ID);
    if (!guild) return;

    console.log("📥 Mengunduh data seluruh anggota dari Discord...");
    const members = await guild.members.fetch({ cache: false });
    members.forEach((m) => cacheUserInfo(m));

    await updateServerStats(client);
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

client.once("clientReady", async () => {
  console.log(`✅ Bot online sebagai ${client.user.tag}`);
  await initialSync();
  startStatsCron(client);
  startTopGGWebhook(client);

  try {
    const rest = new REST({ version: "10" }).setToken(
      process.env.DISCORD_BOT_TOKEN,
    );
    await rest.put(Routes.applicationGuildCommands(client.user.id, GUILD_ID), {
      body: [leaderboardCommandData.toJSON()],
    });
    console.log(
      "✅ Guild Command /leaderboard berhasil terdaftar di Server TOWA!",
    );
  } catch (err) {
    console.error("❌ Gagal mendaftarkan Slash Command:", err.message);
  }

  // Jalankan Cronjob Leaderboard (Sabtu Jam 21:00 WIB)
  startWeeklyLeaderboardCron(client);
});

client.on("guildMemberUpdate", (oldMem, newMem) =>
  handleGuildMemberUpdate(oldMem, newMem),
);
client.on("guildMemberAdd", (member) => handleGuildMemberAdd(member, client));
client.on("guildMemberRemove", (member) =>
  handleGuildMemberRemove(member, client),
);
client.on("voiceStateUpdate", (oldState, newState) =>
  handleVoiceStateUpdate(client, oldState, newState),
);
client.on("messageCreate", (message) => handleVoteMessage(client, message));

// Listener Interaksi Slash Command
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === "leaderboard") {
    await interaction.deferReply();
    const embed = await getLeaderboardEmbed();
    await interaction.editReply({ embeds: [embed] });
  }
});

// LOGIN

client.login(process.env.DISCORD_BOT_TOKEN);
