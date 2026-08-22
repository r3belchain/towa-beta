import { supabase } from "../../config/supabase.js";
import { GUILD_ID } from "../../config/constants.js";
import { userInfoCache, resolveUserInfo } from "../../utils/userCache.js";

export async function syncVoiceActivity(guild) {
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

export async function handleVoiceStateUpdate(client, oldState, newState) {
  try {
    const guildId = newState.guild?.id || oldState.guild?.id;
    if (guildId !== GUILD_ID) return;

    const userId = newState.id || oldState.id;
    const fallbackMember = newState.member || oldState.member;

    const info = await resolveUserInfo(client, userId, fallbackMember);
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
}
