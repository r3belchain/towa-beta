// src/services/voiceXpService.js
import { updateVoiceXpInDatabase } from "./databaseService.js";

const voiceSessions = new Map();

export async function trackVoiceXp(oldState, newState) {
  if (newState.member.user.bot) return;

  const userId = newState.member.id;
  const isNowMutedOrDeafened = newState.selfMute || newState.selfDeaf;
  const wasMutedOrDeafened = oldState.selfMute || oldState.selfDeaf;

  if (!oldState.channelId && newState.channelId) {
    voiceSessions.set(userId, {
      startTime: isNowMutedOrDeafened ? null : Date.now(),
      totalValidMs: 0,
    });
    return;
  }

  const session = voiceSessions.get(userId);
  if (!session) return;

  if (oldState.channelId && newState.channelId) {
    if (!wasMutedOrDeafened && isNowMutedOrDeafened) {
      if (session.startTime) {
        session.totalValidMs += Date.now() - session.startTime;
        session.startTime = null;
      }
    } else if (wasMutedOrDeafened && !isNowMutedOrDeafened) {
      session.startTime = Date.now();
    }
    voiceSessions.set(userId, session);
    return;
  }

  if (oldState.channelId && !newState.channelId) {
    if (session.startTime) {
      session.totalValidMs += Date.now() - session.startTime;
    }

    const totalMinutes = Math.floor(session.totalValidMs / (1000 * 60));
    const earnedXp = Math.floor(totalMinutes / 5) * 45;

    voiceSessions.delete(userId);

    if (earnedXp > 0) {
      await updateVoiceXpInDatabase(userId, earnedXp);
      console.log(
        `🎙️ [Voice XP Tracker] User ${userId} dapat ${earnedXp} XP (${totalMinutes} menit).`,
      );
    }
  }
}
