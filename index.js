import { Client, GatewayIntentBits, Options, Partials } from "discord.js";
import "dotenv/config";
import { GUILD_ID, DISCORD_ROLE_GROUPS } from "./src/config/constants.js";
import { cacheUserInfo } from "./src/utils/userCache.js";
import {
  updateServerStats,
  startStatsCron,
} from "./src/modules/statsTracker.js";
import {
  syncVoiceActivity,
  handleVoiceStateUpdate,
} from "./src/modules/voiceTracker.js";
import {
  syncRoleGroup,
  syncBoosters,
  initialSyncRecentMembers,
  handleGuildMemberUpdate,
  handleGuildMemberAdd,
  handleGuildMemberRemove,
} from "./src/modules/memberTracker.js";
import {
  handleVoteMessage,
  startTopGGWebhook,
} from "./src/modules/voteTracker.js";


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


// 4. EVENT ROUTING
client.once("clientReady", async () => {
  console.log(`✅ Bot online sebagai ${client.user.tag}`);
  await initialSync();
  startStatsCron(client);
  startTopGGWebhook(client); 
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

// LOGIN

client.login(process.env.DISCORD_BOT_TOKEN);
