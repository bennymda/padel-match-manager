import fs from 'fs';
import path from 'path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, 'data');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const USERS_FILE = path.join(DATA_DIR, 'users.json');
const TOURNAMENTS_FILE = path.join(DATA_DIR, 'tournaments.json');
const HISTORY_FILE = path.join(DATA_DIR, 'history.json');

const JWT_SECRET = process.env.JWT_SECRET || 'padel_pro_secret_key_2026_xyz_auth';

// Password Hashing using native Node.js crypto (scrypt)
export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return { salt, hash };
}

export function verifyPassword(password, salt, hash) {
  try {
    const checkHash = crypto.scryptSync(password, salt, 64).toString('hex');
    return crypto.timingSafeEqual(Buffer.from(checkHash, 'hex'), Buffer.from(hash, 'hex'));
  } catch (err) {
    return false;
  }
}

// Lightweight native JWT generation & verification
export function createToken(payload) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify({
    ...payload,
    iat: Date.now(),
    exp: Date.now() + 14 * 24 * 60 * 60 * 1000 // 14 days
  })).toString('base64url');
  const signature = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${signature}`;
}

export function verifyToken(token) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [header, body, signature] = parts;
  const expectedSig = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest('base64url');
  if (expectedSig !== signature) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf-8'));
    if (payload.exp && Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

class Database {
  constructor() {
    this.users = new Map();
    this.tournaments = new Map();
    this.history = [];
    this.init();
  }

  init() {
    this.loadUsers();
    this.loadTournaments();
    this.loadHistory();
  }

  // --- USERS TABLE ---
  loadUsers() {
    try {
      if (fs.existsSync(USERS_FILE)) {
        const raw = fs.readFileSync(USERS_FILE, 'utf-8');
        const list = JSON.parse(raw);
        list.forEach(u => this.users.set(u.id, u));
      }
    } catch (err) {
      console.error('[DB] Failed to load users:', err);
    }
  }

  saveUsers() {
    try {
      const list = Array.from(this.users.values());
      fs.writeFileSync(USERS_FILE, JSON.stringify(list, null, 2), 'utf-8');
    } catch (err) {
      console.error('[DB] Failed to save users:', err);
    }
  }

  createUser({ name, email, password, role = 'player', skillLevel = 'intermediate', avatar }) {
    const trimmedEmail = email.toLowerCase().trim();
    // Check if email already exists
    for (const u of this.users.values()) {
      if (u.email.toLowerCase() === trimmedEmail) {
        throw new Error('Email sudah terdaftar. Silakan gunakan email lain atau login.');
      }
    }

    const { salt, hash } = hashPassword(password);
    const userId = `usr_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const initialMMR = skillLevel === 'pro' ? 1700 : skillLevel === 'advanced' ? 1450 : skillLevel === 'beginner' ? 1000 : 1200;

    const user = {
      id: userId,
      name: name.trim(),
      email: trimmedEmail,
      salt,
      hash,
      role, // 'host' | 'player'
      skillLevel,
      mmr: initialMMR,
      avatar: avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(name.trim())}`,
      createdAt: new Date().toISOString(),
      stats: {
        tournamentsPlayed: 0,
        matchesPlayed: 0,
        matchesWon: 0,
        matchesLost: 0,
        matchesDrawn: 0,
        totalPointsWon: 0,
        mmrHistory: [{ date: new Date().toISOString(), mmr: initialMMR, note: 'Initial Rating' }]
      }
    };

    this.users.set(userId, user);
    this.saveUsers();

    // Return safe user object (without salt and hash)
    const { salt: _, hash: __, ...safeUser } = user;
    return safeUser;
  }

  findUserByEmail(email) {
    const trimmed = (email || '').toLowerCase().trim();
    for (const u of this.users.values()) {
      if (u.email.toLowerCase() === trimmed) {
        return u;
      }
    }
    return null;
  }

  findUserById(id) {
    return this.users.get(id) || null;
  }

  updateUser(id, updates) {
    const user = this.users.get(id);
    if (!user) return null;
    const updated = { ...user, ...updates, updatedAt: new Date().toISOString() };
    this.users.set(id, updated);
    this.saveUsers();
    const { salt: _, hash: __, ...safeUser } = updated;
    return safeUser;
  }

  // --- TOURNAMENTS TABLE ---
  loadTournaments() {
    try {
      if (fs.existsSync(TOURNAMENTS_FILE)) {
        const raw = fs.readFileSync(TOURNAMENTS_FILE, 'utf-8');
        const data = JSON.parse(raw);
        Object.entries(data).forEach(([code, t]) => {
          this.tournaments.set(code.toUpperCase(), t);
        });
      }
    } catch (err) {
      console.error('[DB] Failed to load tournaments:', err);
    }
  }

  saveTournaments() {
    try {
      const obj = {};
      for (const [code, t] of this.tournaments.entries()) {
        obj[code] = t;
      }
      fs.writeFileSync(TOURNAMENTS_FILE, JSON.stringify(obj, null, 2), 'utf-8');
    } catch (err) {
      console.error('[DB] Failed to save tournaments:', err);
    }
  }

  // --- TOURNAMENT & MATCH HISTORY ARCHIVE ---
  loadHistory() {
    try {
      if (fs.existsSync(HISTORY_FILE)) {
        const raw = fs.readFileSync(HISTORY_FILE, 'utf-8');
        this.history = JSON.parse(raw);
      }
    } catch (err) {
      console.error('[DB] Failed to load history:', err);
    }
  }

  saveHistory() {
    try {
      fs.writeFileSync(HISTORY_FILE, JSON.stringify(this.history, null, 2), 'utf-8');
    } catch (err) {
      console.error('[DB] Failed to save history:', err);
    }
  }

  archiveTournament(tournament) {
    const existingIndex = this.history.findIndex(h => h.code === tournament.code);
    const historyItem = {
      code: tournament.code,
      title: tournament.title,
      format: tournament.format,
      gameMode: tournament.gameMode,
      courtCount: tournament.courtCount,
      pointsTarget: tournament.pointsTarget,
      hostId: tournament.hostId || null,
      createdAt: tournament.createdAt,
      completedAt: new Date().toISOString(),
      totalRounds: tournament.rounds?.length || 0,
      totalPlayers: tournament.players?.length || 0,
      winner: tournament.leaderboard?.[0] ? {
        name: tournament.leaderboard[0].name,
        points: tournament.leaderboard[0].pointsWon,
        mmr: tournament.leaderboard[0].currentMMR
      } : null,
      leaderboard: tournament.leaderboard || [],
      rounds: tournament.rounds || []
    };

    if (existingIndex !== -1) {
      this.history[existingIndex] = historyItem;
    } else {
      this.history.unshift(historyItem);
    }
    this.saveHistory();

    // Update career stats for all registered users who participated in this tournament
    if (tournament.leaderboard && Array.isArray(tournament.leaderboard)) {
      tournament.leaderboard.forEach(entry => {
        // Match player by registered email or matching ID or exact name
        let matchedUser = this.findUserById(entry.id);
        if (!matchedUser) {
          for (const u of this.users.values()) {
            if (u.name.toLowerCase() === entry.name.toLowerCase()) {
              matchedUser = u;
              break;
            }
          }
        }

        if (matchedUser) {
          const stats = matchedUser.stats || {
            tournamentsPlayed: 0,
            matchesPlayed: 0,
            matchesWon: 0,
            matchesLost: 0,
            matchesDrawn: 0,
            totalPointsWon: 0,
            mmrHistory: []
          };

          stats.tournamentsPlayed += 1;
          stats.matchesPlayed += (entry.matchesPlayed || 0);
          stats.matchesWon += (entry.matchesWon || 0);
          stats.matchesLost += (entry.matchesLost || 0);
          stats.matchesDrawn += (entry.matchesDrawn || 0);
          stats.totalPointsWon += (entry.pointsWon || 0);
          
          if (entry.currentMMR) {
            matchedUser.mmr = entry.currentMMR;
            stats.mmrHistory.push({
              date: new Date().toISOString(),
              tournamentCode: tournament.code,
              tournamentTitle: tournament.title,
              mmr: entry.currentMMR,
              rank: entry.rank
            });
          }

          this.updateUser(matchedUser.id, { stats, mmr: matchedUser.mmr });
        }
      });
    }

    return historyItem;
  }

  getHistory(filters = {}) {
    let result = [...this.history];
    if (filters.hostId) {
      result = result.filter(h => h.hostId === filters.hostId);
    }
    if (filters.playerName) {
      const q = filters.playerName.toLowerCase();
      result = result.filter(h => 
        (h.leaderboard || []).some(p => p.name.toLowerCase().includes(q))
      );
    }
    return result;
  }

  getPlayerCareerStats(playerNameOrId) {
    const q = (playerNameOrId || '').toLowerCase().trim();
    let user = this.findUserById(playerNameOrId);
    if (!user) {
      for (const u of this.users.values()) {
        if (u.name.toLowerCase() === q || u.email.toLowerCase() === q) {
          user = u;
          break;
        }
      }
    }

    // Also scan all historical tournaments for matches involving this player
    const historyParticipations = [];
    this.history.forEach(t => {
      const entry = (t.leaderboard || []).find(p => 
        p.id === user?.id || p.name.toLowerCase() === q
      );
      if (entry) {
        historyParticipations.push({
          tournamentCode: t.code,
          tournamentTitle: t.title,
          format: t.format,
          completedAt: t.completedAt,
          rank: entry.rank,
          points: entry.pointsWon,
          ppr: entry.pointsPerMatch,
          matchesPlayed: entry.matchesPlayed,
          matchesWon: entry.matchesWon,
          mmr: entry.currentMMR
        });
      }
    });

    return {
      user: user ? {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        skillLevel: user.skillLevel,
        mmr: user.mmr,
        avatar: user.avatar,
        stats: user.stats
      } : null,
      historyParticipations
    };
  }
}

export const db = new Database();
