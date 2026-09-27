CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  salt TEXT NOT NULL,
  hash TEXT NOT NULL,
  role TEXT DEFAULT 'player',
  skill_level TEXT DEFAULT 'intermediate',
  mmr INTEGER DEFAULT 1200,
  avatar TEXT,
  stats TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS tournaments (
  code TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  format TEXT NOT NULL DEFAULT 'americano',
  game_mode TEXT NOT NULL DEFAULT 'doubles',
  court_count INTEGER DEFAULT 2,
  points_target INTEGER DEFAULT 24,
  duration_minutes INTEGER DEFAULT 15,
  host_pin TEXT DEFAULT '1234',
  host_id TEXT,
  status TEXT DEFAULT 'in_progress',
  allow_player_score_entry INTEGER DEFAULT 1,
  players_json TEXT NOT NULL DEFAULT '[]',
  rounds_json TEXT NOT NULL DEFAULT '[]',
  timer_json TEXT DEFAULT '{}',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  completed_at TEXT
);

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
  leaderboard_json TEXT NOT NULL,
  rounds_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  completed_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_tournaments_host ON tournaments(host_id);
CREATE INDEX IF NOT EXISTS idx_history_completed ON tournament_history(completed_at);
