import { GUILD_ID } from "../../config/constants.js";
import { supabase } from "../../config/supabase.js";

export async function updateServerStats(client) {
  try {
    const guild = await client.guilds.fetch({
      guild: GUILD_ID,
      withCounts: true,
      force: true,
    });

    if (!guild) return;

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

export function startStatsCron(client) {
  setInterval(
    async () => {
      try {
        await updateServerStats(client);
      } catch (err) {
        console.error("❌ Error interval stats:", err.message);
      }
    },
    2 * 60 * 1000,
  );
}
