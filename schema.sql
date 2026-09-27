-- Cloudflare D1 SQLite Database Schema for Padel Match Manager

-- 1. Users Table (Auth, Roles, MMR, Career Stats)
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  salt TEXT NOT NULL,
  hash TEXT NOT NULL,
  role TEXT DEFAULT 'player', -- 'host' | 'player'
  skill_level TEXT DEFAULT 'intermediate', -- 'beginner' | 'intermediate' | 'advanced' | 'pro'
  mmr INTEGER DEFAULT 1200,
  avatar TEXT,
  stats TEXT, -- JSON string containing tournamentsPlayed, matchesPlayed, etc.
  created_at TEXT NOT NULL,
  updated_at TEXT
);

-- 2. Tournaments Table (Active and completed tournament sessions)
CREATE TABLE IF NOT EXISTS tournaments (
  code TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  format TEXT NOT NULL DEFAULT 'americano', -- 'americano' | 'mexicano'
  game_mode TEXT NOT NULL DEFAULT 'doubles', -- 'doubles' | 'singles' | 'fixed_partner'
  court_count INTEGER DEFAULT 2,
  points_target INTEGER DEFAULT 24,
  duration_minutes INTEGER DEFAULT 15,
  host_pin TEXT DEFAULT '1234',
  host_id TEXT,
  status TEXT DEFAULT 'in_progress', -- 'pending' | 'in_progress' | 'completed'
  allow_player_score_entry INTEGER DEFAULT 1,
  players_json TEXT NOT NULL DEFAULT '[]', -- JSON string of players array
  rounds_json TEXT NOT NULL DEFAULT '[]', -- JSON string of rounds array
  timer_json TEXT DEFAULT '{}', -- JSON string of timer state
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  completed_at TEXT
);

-- 3. Tournament History Archive Table (Permanent archives for Leaderboard & Stats)
CREATE TABLE IF NOT EXISTS tournament_history (
  code TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  format TEXT NOT NULL,
  game_mode TEXT NOT NULL,
  court_count INTEGER,
  points_target INTEGER,
  host_id TEXT,
  winner_name TEXT,
  winner_points INTEGER,
  winner_mmr INTEGER,
  total_rounds INTEGER,
  total_players INTEGER,
  leaderboard_json TEXT NOT NULL, -- Full final standings JSON
  rounds_json TEXT NOT NULL, -- Full match score logs JSON
  created_at TEXT NOT NULL,
  completed_at TEXT NOT NULL
);

-- Create Indexes for fast querying
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_tournaments_host ON tournaments(host_id);
CREATE INDEX IF NOT EXISTS idx_history_completed ON tournament_history(completed_at DESC);
