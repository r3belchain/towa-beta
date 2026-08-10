require("dotenv").config();
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY,
);

async function testDatabase() {
  console.log("🔍 Testing database tables...\n");

  // Test 1: members table
  try {
    const { data, error } = await supabase.from("members").select("*").limit(1);
    if (error) throw error;
    console.log("✅ members table OK");
  } catch (err) {
    console.error("❌ members table ERROR:", err.message);
  }

  // Test 2: boosters table
  try {
    const { data, error } = await supabase
      .from("boosters")
      .select("*")
      .limit(1);
    if (error) throw error;
    console.log("✅ boosters table OK");
  } catch (err) {
    console.error("❌ boosters table ERROR:", err.message);
  }

  // Test 3: voice_activity table
  try {
    const { data, error } = await supabase
      .from("voice_activity")
      .select("*")
      .limit(1);
    if (error) throw error;
    console.log("✅ voice_activity table OK");
  } catch (err) {
    console.error("❌ voice_activity table ERROR:", err.message);
  }

  // Test 4: server_stats table
  try {
    const { data, error } = await supabase
      .from("server_stats")
      .select("*")
      .eq("id", 1)
      .single();
    if (error) throw error;
    console.log("✅ server_stats table OK");
    console.log("   └─ Current stats:", data);
  } catch (err) {
    console.error("❌ server_stats table ERROR:", err.message);
  }

  console.log("\n✨ Database test complete!");
}

testDatabase();
