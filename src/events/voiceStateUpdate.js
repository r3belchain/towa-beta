import { Events } from "discord.js";
import { handleVoiceStateUpdate } from "../modules/voice/voiceTracker.js";
import { trackVoiceXp } from "../services/voiceXpService.js"; 

export const name = Events.VoiceStateUpdate;

export async function execute(oldState, newState, client) {
  await handleVoiceStateUpdate(client, oldState, newState);
  await trackVoiceXp(oldState, newState);
}
