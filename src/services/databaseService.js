import { supabase } from "../config/supabase.js";

export async function getOrCreateWargaCard(userId) {
  let { data, error } = await supabase
    .from("warga_cards")
    .select("*")
    .eq("user_id", userId)
    .single();
  if (!data) {
    const { data: newData, error: insertError } = await supabase
      .from("warga_cards")
      .insert([{ user_id: userId }])
      .select()
      .single();
    if (insertError) throw insertError;
    data = newData;
  }
  return data;
}

export async function getOrCreateUserStats(userId) {
  let { data, error } = await supabase
    .from("user_stats")
    .select("*")
    .eq("user_id", userId)
    .single();
  if (!data) {
    const { data: newData, error: insertError } = await supabase
      .from("user_stats")
      .insert([{ user_id: userId }])
      .select()
      .single();
    if (insertError) throw insertError;
    data = newData;
  }
  return data;
}

export async function updateWargaDescription(userId, text) {
  await getOrCreateWargaCard(userId);
  const { error } = await supabase
    .from("warga_cards")
    .update({ description: text })
    .eq("user_id", userId);
  if (error) throw error;
}

export async function updateWargaBackground(userId, url) {
  await getOrCreateWargaCard(userId);
  const { error } = await supabase
    .from("warga_cards")
    .update({ background_url: url })
    .eq("user_id", userId);
  if (error) throw error;
}

export async function updateWargaQuote(userId, text) {
  await getOrCreateWargaCard(userId);
  const { error } = await supabase
    .from("warga_cards")
    .update({ quote: text })
    .eq("user_id", userId);

  if (error) throw error;
}

export async function updateVoiceXpInDatabase(userId, earnedXp) {
  await getOrCreateWargaCard(userId);

  const stats = await getOrCreateUserStats(userId);

  const newVoiceXp = (stats.voice_points || 0) + earnedXp;

  const { error } = await supabase
    .from("user_stats")
    .update({ voice_points: newVoiceXp })
    .eq("user_id", userId);

  if (error) {
    console.error(`❌ Gagal update Voice XP untuk ${userId}:`, error.message);
    throw error;
  }
}

export async function updateChatXpInDatabase(userId, earnedXp) {
  await getOrCreateWargaCard(userId);

  const stats = await getOrCreateUserStats(userId);

  const newChatXp = (stats.chat_points || 0) + earnedXp;

  const { error } = await supabase
    .from("user_stats")
    .update({ chat_points: newChatXp })
    .eq("user_id", userId);

  if (error) {
    console.error(`❌ Gagal update Chat XP untuk ${userId}:`, error.message);
    throw error;
  }
}

export async function updateWargaHobi(userId, text) {
  await getOrCreateWargaCard(userId);
  const { error } = await supabase
    .from("warga_cards")
    .update({ hobi: text })
    .eq("user_id", userId);
  if (error) throw error;
}

export async function updateWargaStatus(userId, statusId) {
  await getOrCreateWargaCard(userId);
  const { error } = await supabase
    .from("warga_cards")
    .update({ status_hubungan: statusId })
    .eq("user_id", userId);
  if (error) throw error;
}

export async function updateWargaTheme(userId, themeName) {
  await getOrCreateWargaCard(userId);

  const { error } = await supabase
    .from("warga_cards")
    .update({ theme: themeName })
    .eq("user_id", userId);

  if (error) throw error;
}
