import { supabase } from "../config/supabase.js";
import { GUILD_ID, DISCORD_ROLE_GROUPS } from "../config/constants.js";
import { cacheUserInfo, userInfoCache } from "../utils/userCache.js";
import { updateServerStats } from "./statsTracker.js";

export async function syncRoleGroup(members, tableName, roleIds) {
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

    const { data: currentData } = await supabase
      .from(tableName)
      .select("discord_user_id");
    const currentIds = currentData
      ? currentData.map((d) => d.discord_user_id)
      : [];
    const newIds = records.map((r) => r.discord_user_id);
    const idsToDelete = currentIds.filter((id) => !newIds.includes(id));

    if (records.length > 0) {
      await supabase
        .from(tableName)
        .upsert(records, { onConflict: "discord_user_id" });
    }
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

export async function syncBoosters(members) {
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

export async function initialSyncRecentMembers(members) {
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
    console.log(`🆕 Modal Awal 10 Warga Terbaru berhasil disinkronkan.`);
  } catch (err) {
    console.error("❌ Error initial sync recent members:", err.message);
  }
}

export async function handleGuildMemberUpdate(oldMember, newMember) {
  if (newMember.guild.id !== GUILD_ID || newMember.user.bot) return;

  cacheUserInfo(newMember);

  // Cek Perubahan Booster
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

  // Cek Perubahan Role
  if (!oldMember.roles.cache.equals(newMember.roles.cache)) {
    for (const group of DISCORD_ROLE_GROUPS) {
      let matchedRole = null;
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
}

export async function handleGuildMemberAdd(member, client) {
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

    await supabase.rpc("trim_recent_members", { keep_count: 10 });
    await updateServerStats(client);
    console.log("✅ Warga baru ditambahkan, tabel di-trim di sisi database.");
  } catch (err) {
    console.error("❌ Error insert new member:", err.message);
  }
}

export async function handleGuildMemberRemove(member, client) {
  if (member.guild.id !== GUILD_ID || member.user.bot) return;
  console.log(`🚪 Warga keluar terdeteksi: ${member.user.username}`);

  userInfoCache.delete(member.id);
  await updateServerStats(client, member.guild);
  console.log("📊 Statistik server diperbarui (Warga keluar).");
}
