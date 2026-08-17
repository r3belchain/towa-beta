export const userInfoCache = new Map();

export function cacheUserInfo(member) {
  if (!member?.user) return;
  userInfoCache.set(member.id, {
    username: member.user.username,
    avatarURL: member.user.displayAvatarURL(),
    bot: member.user.bot,
  });
}

export async function resolveUserInfo(client, userId, fallbackMember) {
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
