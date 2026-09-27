import { generateAmericanoRound } from '../algorithms/americano.js';
import { generateMexicanoRound } from '../algorithms/mexicano.js';
import { calculateLeaderboard, addPlayerMidMatch, substitutePlayer } from '../algorithms/fairness.js';
import { hashPassword, verifyPassword, createToken, verifyToken } from '../crypto.js';

// In-memory fallback if D1 database binding 'DB' is not yet configured in Cloudflare Dashboard
const memoryFallback = {
  users: new Map(),
  tournaments: new Map(),
  history: []
};

const CORS_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: CORS_HEADERS
  });
}

function generateCode() {
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const numbers = '23456789';
  let code = '';
  for (let i = 0; i < 3; i++) code += letters.charAt(Math.floor(Math.random() * letters.length));
  code += '-';
  for (let i = 0; i < 3; i++) code += numbers.charAt(Math.floor(Math.random() * numbers.length));
  return code;
}

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  // Handle CORS preflight
  if (method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS });
  }

  const db = env.DB; // Cloudflare D1 Database binding

  try {
    // 1. GET /api/network-info
    if (path === '/api/network-info' && method === 'GET') {
      return jsonResponse({
        platform: 'Cloudflare Pages & D1 Database',
        edgeLocation: request.cf?.colo || 'Cloudflare Edge',
        hasD1Binding: !!db,
        localUrl: url.origin,
        networkUrl: url.origin
      });
    }

    // 2. POST /api/auth/register
    if (path === '/api/auth/register' && method === 'POST') {
      const body = await request.json();
      const { name, email, password, role, skillLevel, avatar } = body;
      if (!name || !email || !password) {
        return jsonResponse({ success: false, error: 'Nama, email, dan password wajib diisi' }, 400);
      }

      const trimmedEmail = email.toLowerCase().trim();
      const { salt, hash } = await hashPassword(password);
      const userId = 'usr_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
      const initialMMR = skillLevel === 'pro' ? 1700 : skillLevel === 'advanced' ? 1450 : skillLevel === 'beginner' ? 1000 : 1200;
      const initialStats = {
        tournamentsPlayed: 0,
        matchesPlayed: 0,
        matchesWon: 0,
        matchesLost: 0,
        matchesDrawn: 0,
        totalPointsWon: 0,
        mmrHistory: [{ date: new Date().toISOString(), mmr: initialMMR, note: 'Initial Rating' }]
      };

      if (db) {
        // Check existing user in D1
        const existing = await db.prepare('SELECT id FROM users WHERE email = ?').bind(trimmedEmail).first();
        if (existing) {
          return jsonResponse({ success: false, error: 'Email sudah terdaftar' }, 400);
        }
        await db.prepare(`
          INSERT INTO users (id, name, email, salt, hash, role, skill_level, mmr, avatar, stats, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          userId,
          name.trim(),
          trimmedEmail,
          salt,
          hash,
          role || 'player',
          skillLevel || 'intermediate',
          initialMMR,
          avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(name.trim())}`,
          JSON.stringify(initialStats),
          new Date().toISOString()
        ).run();
      } else {
        memoryFallback.users.set(trimmedEmail, {
          id: userId, name: name.trim(), email: trimmedEmail, salt, hash,
          role: role || 'player', skillLevel: skillLevel || 'intermediate',
          mmr: initialMMR, avatar, stats: initialStats, createdAt: new Date().toISOString()
        });
      }

      const safeUser = { id: userId, name: name.trim(), email: trimmedEmail, role: role || 'player', skillLevel, mmr: initialMMR, avatar, stats: initialStats };
      const token = await createToken({ id: userId, email: trimmedEmail, name: name.trim(), role: role || 'player' });
      return jsonResponse({ success: true, user: safeUser, token });
    }

    // 3. POST /api/auth/login
    if (path === '/api/auth/login' && method === 'POST') {
      const { email, password } = await request.json();
      const trimmedEmail = (email || '').toLowerCase().trim();

      let user = null;
      if (db) {
        const row = await db.prepare('SELECT * FROM users WHERE email = ?').bind(trimmedEmail).first();
        if (row) {
          user = {
            ...row,
            stats: typeof row.stats === 'string' ? JSON.parse(row.stats) : row.stats
          };
        }
      } else {
        user = memoryFallback.users.get(trimmedEmail);
      }

      if (!user) {
        return jsonResponse({ success: false, error: 'Email atau password salah' }, 401);
      }

      const isValid = await verifyPassword(password, user.salt, user.hash);
      if (!isValid) {
        return jsonResponse({ success: false, error: 'Email atau password salah' }, 401);
      }

      const { salt: _, hash: __, ...safeUser } = user;
      const token = await createToken({ id: user.id, email: user.email, name: user.name, role: user.role });
      return jsonResponse({ success: true, user: safeUser, token });
    }

    // 4. GET /api/auth/me
    if (path === '/api/auth/me' && method === 'GET') {
      const authHeader = request.headers.get('Authorization');
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return jsonResponse({ success: false, error: 'Token tidak ditemukan' }, 401);
      }

      const token = authHeader.split(' ')[1];
      const payload = await verifyToken(token);
      if (!payload || !payload.id) {
        return jsonResponse({ success: false, error: 'Token tidak valid' }, 401);
      }

      let user = null;
      if (db) {
        const row = await db.prepare('SELECT * FROM users WHERE id = ?').bind(payload.id).first();
        if (row) {
          user = { ...row, stats: typeof row.stats === 'string' ? JSON.parse(row.stats) : row.stats };
        }
      } else {
        for (const u of memoryFallback.users.values()) {
          if (u.id === payload.id) { user = u; break; }
        }
      }

      if (!user) return jsonResponse({ success: false, error: 'User tidak ditemukan' }, 404);
      const { salt: _, hash: __, ...safeUser } = user;
      return jsonResponse({ success: true, user: safeUser });
    }

    // 5. POST /api/tournaments (Create Tournament)
    if (path === '/api/tournaments' && method === 'POST') {
      const payload = await request.json();
      const code = (payload.code || generateCode()).toUpperCase().trim();

      const rawPlayers = payload.players && payload.players.length > 0 ? payload.players : [];
      const players = rawPlayers.map((p, idx) => ({
        id: p.id || `p_${Date.now()}_${idx}`,
        name: p.name.trim(),
        avatar: p.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(p.name)}`,
        skillLevel: p.skillLevel || 'intermediate',
        status: p.status || 'active',
        initialMMR: p.initialMMR || (p.skillLevel === 'pro' ? 1700 : p.skillLevel === 'advanced' ? 1450 : p.skillLevel === 'beginner' ? 1000 : 1200),
        mmr: p.initialMMR || (p.skillLevel === 'pro' ? 1700 : p.skillLevel === 'advanced' ? 1450 : p.skillLevel === 'beginner' ? 1000 : 1200),
        startingPoints: 0,
        joinedRound: 1
      }));

      const tournament = {
        code,
        title: payload.title || 'Padel Tournament',
        format: payload.format || 'americano',
        gameMode: payload.gameMode || 'doubles',
        courtCount: Number(payload.courtCount) || 2,
        pointsTarget: Number(payload.pointsTarget) || 24,
        matchDurationMinutes: Number(payload.matchDurationMinutes) || 15,
        allowPlayerScoreEntry: payload.allowPlayerScoreEntry ?? true,
        hostId: payload.hostId || null,
        hostPin: payload.hostPin || '1234',
        status: 'in_progress',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        players,
        rounds: [],
        timer: {
          running: true,
          startedAt: Date.now(),
          durationSeconds: (Number(payload.matchDurationMinutes) || 15) * 60,
          remainingSeconds: (Number(payload.matchDurationMinutes) || 15) * 60
        }
      };

      // Auto-generate Round 1 if enough players
      const minPlayers = tournament.gameMode === 'singles' ? 2 : 4;
      if (players.length >= minPlayers) {
        const round1 = generateAmericanoRound({
          players: tournament.players,
          rounds: [],
          courtCount: tournament.courtCount,
          gameMode: tournament.gameMode,
          pointsTarget: tournament.pointsTarget
        });
        tournament.rounds.push(round1);
      }

      if (db) {
        await db.prepare(`
          INSERT INTO tournaments (code, title, format, game_mode, court_count, points_target, duration_minutes, host_pin, host_id, status, allow_player_score_entry, players_json, rounds_json, timer_json, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          code, tournament.title, tournament.format, tournament.gameMode, tournament.courtCount,
          tournament.pointsTarget, tournament.matchDurationMinutes, tournament.hostPin, tournament.hostId,
          tournament.status, tournament.allowPlayerScoreEntry ? 1 : 0, JSON.stringify(tournament.players),
          JSON.stringify(tournament.rounds), JSON.stringify(tournament.timer), tournament.createdAt, tournament.updatedAt
        ).run();
      } else {
        memoryFallback.tournaments.set(code, tournament);
      }

      const leaderboard = calculateLeaderboard(tournament);
      return jsonResponse({ success: true, tournament: { ...tournament, leaderboard } });
    }

    // Helper: load tournament from D1 or memory
    async function getTournament(code) {
      const upper = (code || '').toUpperCase();
      if (db) {
        const row = await db.prepare('SELECT * FROM tournaments WHERE code = ?').bind(upper).first();
        if (!row) return null;
        const tournament = {
          code: row.code,
          title: row.title,
          format: row.format,
          gameMode: row.game_mode,
          courtCount: row.court_count,
          pointsTarget: row.points_target,
          matchDurationMinutes: row.duration_minutes,
          hostPin: row.host_pin,
          hostId: row.host_id,
          status: row.status,
          allowPlayerScoreEntry: Boolean(row.allow_player_score_entry),
          players: JSON.parse(row.players_json || '[]'),
          rounds: JSON.parse(row.rounds_json || '[]'),
          timer: JSON.parse(row.timer_json || '{}'),
          createdAt: row.created_at,
          updatedAt: row.updated_at,
          completedAt: row.completed_at
        };
        const leaderboard = calculateLeaderboard(tournament);
        return { ...tournament, leaderboard };
      } else {
        const t = memoryFallback.tournaments.get(upper);
        if (!t) return null;
        const leaderboard = calculateLeaderboard(t);
        return { ...t, leaderboard };
      }
    }

    // Helper: save tournament to D1 or memory
    async function saveTournament(tournament) {
      tournament.updatedAt = new Date().toISOString();
      if (db) {
        await db.prepare(`
          UPDATE tournaments SET
            players_json = ?,
            rounds_json = ?,
            timer_json = ?,
            status = ?,
            updated_at = ?,
            completed_at = ?
          WHERE code = ?
        `).bind(
          JSON.stringify(tournament.players),
          JSON.stringify(tournament.rounds),
          JSON.stringify(tournament.timer),
          tournament.status,
          tournament.updatedAt,
          tournament.completedAt || null,
          tournament.code.toUpperCase()
        ).run();
      } else {
        memoryFallback.tournaments.set(tournament.code.toUpperCase(), tournament);
      }
    }

    // 6. GET /api/tournaments/:code
    const getTourMatch = path.match(/^\/api\/tournaments\/([^\/]+)$/);
    if (getTourMatch && method === 'GET') {
      const code = getTourMatch[1];
      const tournament = await getTournament(code);
      if (!tournament) return jsonResponse({ success: false, error: 'Turnamen tidak ditemukan' }, 404);
      return jsonResponse({ success: true, tournament });
    }

    // 7. POST /api/tournaments/:code/verify-host
    const verifyHostMatch = path.match(/^\/api\/tournaments\/([^\/]+)\/verify-host$/);
    if (verifyHostMatch && method === 'POST') {
      const code = verifyHostMatch[1];
      const { pin } = await request.json();
      const tournament = await getTournament(code);
      if (!tournament) return jsonResponse({ success: false, error: 'Turnamen tidak ditemukan' }, 404);
      const isValid = String(tournament.hostPin).trim() === String(pin).trim();
      return jsonResponse({ success: true, isValid });
    }

    // 8. POST /api/tournaments/:code/start
    const startMatch = path.match(/^\/api\/tournaments\/([^\/]+)\/start$/);
    if (startMatch && method === 'POST') {
      const code = startMatch[1];
      const tournament = await getTournament(code);
      if (!tournament) return jsonResponse({ success: false, error: 'Turnamen tidak ditemukan' }, 404);

      if (!tournament.rounds || tournament.rounds.length === 0) {
        const round1 = generateAmericanoRound({
          players: tournament.players,
          rounds: [],
          courtCount: tournament.courtCount,
          gameMode: tournament.gameMode,
          pointsTarget: tournament.pointsTarget
        });
        tournament.rounds.push(round1);
      }
      tournament.status = 'in_progress';
      await saveTournament(tournament);
      const updated = await getTournament(code);
      return jsonResponse({ success: true, tournament: updated });
    }

    // 9. POST /api/tournaments/:code/next-round
    const nextRoundMatch = path.match(/^\/api\/tournaments\/([^\/]+)\/next-round$/);
    if (nextRoundMatch && method === 'POST') {
      const code = nextRoundMatch[1];
      const tournament = await getTournament(code);
      if (!tournament) return jsonResponse({ success: false, error: 'Turnamen tidak ditemukan' }, 404);

      const leaderboard = calculateLeaderboard(tournament);
      let nextRound;
      if (tournament.format === 'mexicano') {
        nextRound = generateMexicanoRound({
          players: tournament.players,
          leaderboard,
          rounds: tournament.rounds,
          courtCount: tournament.courtCount,
          gameMode: tournament.gameMode,
          pointsTarget: tournament.pointsTarget
        });
      } else {
        nextRound = generateAmericanoRound({
          players: tournament.players,
          rounds: tournament.rounds,
          courtCount: tournament.courtCount,
          gameMode: tournament.gameMode,
          pointsTarget: tournament.pointsTarget
        });
      }

      tournament.rounds.push(nextRound);
      tournament.timer = {
        running: true,
        startedAt: Date.now(),
        durationSeconds: (tournament.matchDurationMinutes || 15) * 60,
        remainingSeconds: (tournament.matchDurationMinutes || 15) * 60
      };
      await saveTournament(tournament);
      const updated = await getTournament(code);
      return jsonResponse({ success: true, tournament: updated });
    }

    // 10. POST /api/tournaments/:code/score
    const scoreMatch = path.match(/^\/api\/tournaments\/([^\/]+)\/score$/);
    if (scoreMatch && method === 'POST') {
      const code = scoreMatch[1];
      const { roundNumber, matchId, team1Score, team2Score } = await request.json();
      const tournament = await getTournament(code);
      if (!tournament) return jsonResponse({ success: false, error: 'Turnamen tidak ditemukan' }, 404);

      const round = tournament.rounds.find(r => r.roundNumber === Number(roundNumber));
      if (!round) return jsonResponse({ success: false, error: 'Round tidak ditemukan' }, 404);

      const match = round.matches.find(m => m.id === matchId);
      if (!match) return jsonResponse({ success: false, error: 'Match tidak ditemukan' }, 404);

      match.team1Score = Number(team1Score);
      match.team2Score = Number(team2Score);
      match.status = 'completed';

      if (round.matches.every(m => m.status === 'completed')) {
        round.status = 'completed';
      }

      await saveTournament(tournament);
      const updated = await getTournament(code);
      return jsonResponse({ success: true, tournament: updated });
    }

    // 11. POST /api/tournaments/:code/player-status
    const statusMatch = path.match(/^\/api\/tournaments\/([^\/]+)\/player-status$/);
    if (statusMatch && method === 'POST') {
      const code = statusMatch[1];
      const { playerId, status } = await request.json();
      const tournament = await getTournament(code);
      if (!tournament) return jsonResponse({ success: false, error: 'Turnamen tidak ditemukan' }, 404);

      const player = tournament.players.find(p => p.id === playerId);
      if (!player) return jsonResponse({ success: false, error: 'Player tidak ditemukan' }, 404);

      player.status = status;
      await saveTournament(tournament);
      const updated = await getTournament(code);
      return jsonResponse({ success: true, tournament: updated });
    }

    // 12. POST /api/tournaments/:code/add-player
    const addPlayerMatch = path.match(/^\/api\/tournaments\/([^\/]+)\/add-player$/);
    if (addPlayerMatch && method === 'POST') {
      const code = addPlayerMatch[1];
      const { playerData, options } = await request.json();
      const tournament = await getTournament(code);
      if (!tournament) return jsonResponse({ success: false, error: 'Turnamen tidak ditemukan' }, 404);

      const newPlayer = addPlayerMidMatch(tournament, playerData, options);
      await saveTournament(tournament);
      const updated = await getTournament(code);
      return jsonResponse({ success: true, tournament: updated, player: newPlayer });
    }

    // 13. POST /api/tournaments/:code/substitute
    const subMatch = path.match(/^\/api\/tournaments\/([^\/]+)\/substitute$/);
    if (subMatch && method === 'POST') {
      const code = subMatch[1];
      const { originalPlayerId, subData, options } = await request.json();
      const tournament = await getTournament(code);
      if (!tournament) return jsonResponse({ success: false, error: 'Turnamen tidak ditemukan' }, 404);

      const sub = substitutePlayer(tournament, originalPlayerId, subData, options);
      await saveTournament(tournament);
      const updated = await getTournament(code);
      return jsonResponse({ success: true, tournament: updated, substitute: sub });
    }

    // 14. POST /api/tournaments/:code/import-players
    const importMatch = path.match(/^\/api\/tournaments\/([^\/]+)\/import-players$/);
    if (importMatch && method === 'POST') {
      const code = importMatch[1];
      const { players } = await request.json();
      const tournament = await getTournament(code);
      if (!tournament) return jsonResponse({ success: false, error: 'Turnamen tidak ditemukan' }, 404);

      players.forEach((p, idx) => {
        if (!p.name || !p.name.trim()) return;
        tournament.players.push({
          id: `p_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 5)}`,
          name: p.name.trim(),
          avatar: p.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(p.name)}`,
          skillLevel: p.skillLevel || 'intermediate',
          status: 'active',
          initialMMR: p.initialMMR || 1200,
          mmr: p.initialMMR || 1200,
          startingPoints: 0,
          joinedRound: tournament.rounds.length + 1
        });
      });

      await saveTournament(tournament);
      const updated = await getTournament(code);
      return jsonResponse({ success: true, tournament: updated });
    }

    // 15. POST /api/tournaments/:code/finish (Archive to D1 Database)
    const finishMatch = path.match(/^\/api\/tournaments\/([^\/]+)\/finish$/);
    if (finishMatch && method === 'POST') {
      const code = finishMatch[1];
      const tournament = await getTournament(code);
      if (!tournament) return jsonResponse({ success: false, error: 'Turnamen tidak ditemukan' }, 404);

      tournament.status = 'completed';
      tournament.completedAt = new Date().toISOString();
      const leaderboard = calculateLeaderboard(tournament);
      const winner = leaderboard[0] || null;

      if (db) {
        await db.prepare(`
          INSERT OR REPLACE INTO tournament_history
          (code, title, format, game_mode, court_count, points_target, host_id, winner_name, winner_points, winner_mmr, total_rounds, total_players, leaderboard_json, rounds_json, created_at, completed_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          tournament.code, tournament.title, tournament.format, tournament.gameMode, tournament.courtCount,
          tournament.pointsTarget, tournament.hostId, winner?.name || 'Unknown', winner?.pointsWon || 0,
          winner?.currentMMR || 1200, tournament.rounds.length, tournament.players.length,
          JSON.stringify(leaderboard), JSON.stringify(tournament.rounds), tournament.createdAt, tournament.completedAt
        ).run();

        // Update player career records in D1 users table
        for (const entry of leaderboard) {
          const userRow = await db.prepare('SELECT id, stats FROM users WHERE id = ? OR name = ?').bind(entry.id, entry.name).first();
          if (userRow) {
            const stats = typeof userRow.stats === 'string' ? JSON.parse(userRow.stats) : (userRow.stats || {});
            stats.tournamentsPlayed = (stats.tournamentsPlayed || 0) + 1;
            stats.matchesPlayed = (stats.matchesPlayed || 0) + (entry.matchesPlayed || 0);
            stats.matchesWon = (stats.matchesWon || 0) + (entry.matchesWon || 0);
            stats.matchesLost = (stats.matchesLost || 0) + (entry.matchesLost || 0);
            stats.totalPointsWon = (stats.totalPointsWon || 0) + (entry.pointsWon || 0);
            stats.mmrHistory = stats.mmrHistory || [];
            stats.mmrHistory.push({
              date: new Date().toISOString(),
              tournamentCode: tournament.code,
              tournamentTitle: tournament.title,
              mmr: entry.currentMMR,
              rank: entry.rank
            });

            await db.prepare('UPDATE users SET mmr = ?, stats = ? WHERE id = ?')
              .bind(entry.currentMMR, JSON.stringify(stats), userRow.id).run();
          }
        }
      } else {
        memoryFallback.history.unshift({
          code: tournament.code,
          title: tournament.title,
          format: tournament.format,
          completedAt: tournament.completedAt,
          winner,
          leaderboard
        });
      }

      await saveTournament(tournament);
      const updated = await getTournament(code);
      return jsonResponse({ success: true, tournament: updated });
    }

    // 16. GET /api/history (Query Archived Tournaments from D1)
    if (path === '/api/history' && method === 'GET') {
      if (db) {
        const { results } = await db.prepare('SELECT * FROM tournament_history ORDER BY completed_at DESC LIMIT 50').all();
        const history = (results || []).map(row => ({
          code: row.code,
          title: row.title,
          format: row.format,
          gameMode: row.game_mode,
          totalRounds: row.total_rounds,
          totalPlayers: row.total_players,
          createdAt: row.created_at,
          completedAt: row.completed_at,
          winner: {
            name: row.winner_name,
            points: row.winner_points,
            mmr: row.winner_mmr
          },
          leaderboard: JSON.parse(row.leaderboard_json || '[]'),
          rounds: JSON.parse(row.rounds_json || '[]')
        }));
        return jsonResponse({ success: true, history });
      } else {
        return jsonResponse({ success: true, history: memoryFallback.history });
      }
    }

    // 17. GET /api/players/:idOrName/career
    const careerMatch = path.match(/^\/api\/players\/([^\/]+)\/career$/);
    if (careerMatch && method === 'GET') {
      const q = decodeURIComponent(careerMatch[1]).toLowerCase();
      let user = null;
      let historyParticipations = [];

      if (db) {
        const userRow = await db.prepare('SELECT * FROM users WHERE LOWER(id) = ? OR LOWER(name) = ? OR LOWER(email) = ?').bind(q, q, q).first();
        if (userRow) {
          user = { ...userRow, stats: typeof userRow.stats === 'string' ? JSON.parse(userRow.stats) : userRow.stats };
        }

        const { results } = await db.prepare('SELECT code, title, format, completed_at, leaderboard_json FROM tournament_history ORDER BY completed_at DESC').all();
        (results || []).forEach(row => {
          const lb = JSON.parse(row.leaderboard_json || '[]');
          const entry = lb.find(p => p.id === user?.id || p.name.toLowerCase() === q);
          if (entry) {
            historyParticipations.push({
              tournamentCode: row.code,
              tournamentTitle: row.title,
              format: row.format,
              completedAt: row.completed_at,
              rank: entry.rank,
              points: entry.pointsWon,
              ppr: entry.pointsPerMatch,
              matchesPlayed: entry.matchesPlayed,
              matchesWon: entry.matchesWon,
              mmr: entry.currentMMR
            });
          }
        });
      }

      return jsonResponse({ success: true, user, historyParticipations });
    }

    return jsonResponse({ error: 'Endpoint not found: ' + path }, 404);
  } catch (err) {
    return jsonResponse({ success: false, error: err.message }, 500);
  }
}
