
-- Tabel 1: members (log join/leave member)

CREATE TABLE IF NOT EXISTS members (
  id BIGSERIAL PRIMARY KEY,
  discord_user_id TEXT NOT NULL,
  username TEXT NOT NULL,
  avatar_url TEXT,
  event_type TEXT NOT NULL, -- 'join' atau 'leave'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index untuk query cepat
CREATE INDEX IF NOT EXISTS idx_members_discord_user_id ON members(discord_user_id);
CREATE INDEX IF NOT EXISTS idx_members_event_type ON members(event_type);
CREATE INDEX IF NOT EXISTS idx_members_created_at ON members(created_at DESC);


-- Tabel 2: boosters (tracking server booster)

CREATE TABLE IF NOT EXISTS boosters (
  id BIGSERIAL PRIMARY KEY,
  discord_user_id TEXT UNIQUE NOT NULL,
  username TEXT NOT NULL,
  avatar_url TEXT,
  boosting_since TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_boosters_discord_user_id ON boosters(discord_user_id);


-- Tabel 3: voice_activity (tracking VC real-time)

CREATE TABLE IF NOT EXISTS voice_activity (
  id BIGSERIAL PRIMARY KEY,
  discord_user_id TEXT UNIQUE NOT NULL,
  username TEXT NOT NULL,
  avatar_url TEXT,
  channel_id TEXT NOT NULL,
  channel_name TEXT NOT NULL,
  joined_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_voice_activity_discord_user_id ON voice_activity(discord_user_id);
CREATE INDEX IF NOT EXISTS idx_voice_activity_channel_id ON voice_activity(channel_id);


-- Tabel 4: server_stats (total member & online)

CREATE TABLE IF NOT EXISTS server_stats (
  id INTEGER PRIMARY KEY DEFAULT 1,
  total_members INTEGER DEFAULT 0,
  online_count INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT single_row_only CHECK (id = 1)
);

-- Insert row awal (hanya 1 row)
INSERT INTO server_stats (id, total_members, online_count)
VALUES (1, 0, 0)
ON CONFLICT (id) DO NOTHING;
