import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { generateAmericanoRound } from './algorithms/americano.js';
import { generateMexicanoRound } from './algorithms/mexicano.js';
import { calculateLeaderboard, addPlayerMidMatch, substitutePlayer } from './algorithms/fairness.js';
import { DEFAULT_MMR, SKILL_LEVEL_MMR } from './algorithms/mmr.js';

import { db } from './database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_FILE = path.join(__dirname, 'tournaments_data.json');

class TournamentStore {
  constructor() {
    this.tournaments = new Map();
    this.loadData();
  }

  loadData() {
    try {
      if (fs.existsSync(DATA_FILE)) {
        const raw = fs.readFileSync(DATA_FILE, 'utf-8');
        const data = JSON.parse(raw);
        Object.entries(data).forEach(([code, t]) => {
          this.tournaments.set(code.toUpperCase(), t);
        });
        console.log(`[Store] Loaded ${this.tournaments.size} tournaments from disk.`);
      }
    } catch (err) {
      console.error('[Store] Failed to load data:', err);
    }
  }

  saveData() {
    try {
      const obj = {};
      for (const [code, t] of this.tournaments.entries()) {
        obj[code] = t;
      }
      fs.writeFileSync(DATA_FILE, JSON.stringify(obj, null, 2), 'utf-8');
    } catch (err) {
      console.error('[Store] Failed to save data:', err);
    }
  }

  generateCode() {
    const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const numbers = '23456789';
    let code = '';
    for (let i = 0; i < 3; i++) code += letters.charAt(Math.floor(Math.random() * letters.length));
    code += '-';
    for (let i = 0; i < 3; i++) code += numbers.charAt(Math.floor(Math.random() * numbers.length));
    return code;
  }

  createTournament(payload) {
    const code = (payload.code || this.generateCode()).toUpperCase().trim();
    
    // Default mock or initial players if none provided
    const rawPlayers = payload.players && payload.players.length > 0 ? payload.players : [];
    const players = rawPlayers.map((p, idx) => ({
      id: p.id || `p_${Date.now()}_${idx}`,
      name: p.name.trim(),
      avatar: p.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(p.name)}`,
      skillLevel: p.skillLevel || 'intermediate',
      status: p.status || 'active',
      initialMMR: p.initialMMR || SKILL_LEVEL_MMR[p.skillLevel || 'intermediate'] || DEFAULT_MMR,
      mmr: p.initialMMR || SKILL_LEVEL_MMR[p.skillLevel || 'intermediate'] || DEFAULT_MMR,
      fixedPartnerId: p.fixedPartnerId || null,
      startingPoints: 0,
      joinedRound: 1
    }));

    const tournament = {
      code,
      title: payload.title || 'Padel Fun Americano',
      format: payload.format || 'americano', // 'americano' | 'mexicano'
      gameMode: payload.gameMode || 'doubles', // 'doubles' | 'singles' | 'fixed_partner'
      courtCount: Number(payload.courtCount) || 2,
      pointsTarget: Number(payload.pointsTarget) || 24, // 16, 21, 24, 32
      matchDurationMinutes: Number(payload.matchDurationMinutes) || 15,
      allowPlayerScoreEntry: payload.allowPlayerScoreEntry ?? true,
      hostId: payload.hostId || null,
      hostPin: payload.hostPin || '1234',
      status: 'pending', // 'pending' | 'in_progress' | 'completed'
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      players,
      rounds: [],
      // Timer state
      timer: {
        running: false,
        startedAt: null,
        durationSeconds: (Number(payload.matchDurationMinutes) || 15) * 60,
        remainingSeconds: (Number(payload.matchDurationMinutes) || 15) * 60
      }
    };

    this.tournaments.set(code, tournament);
    this.saveData();

    // Auto-generate round 1 immediately if enough players
    const minPlayers = tournament.gameMode === 'singles' ? 2 : 4;
    if (payload.autoStart !== false && players.length >= minPlayers) {
      try {
        return this.generateNextRound(code);
      } catch (err) {
        console.warn('[Store] Auto generate round 1 failed:', err.message);
      }
    }

    return this.getTournament(code);
  }

  getTournament(code) {
    const t = this.tournaments.get((code || '').toUpperCase());
    if (!t) return null;
    
    // Always compute live leaderboard and attach to response
    const leaderboard = calculateLeaderboard(t);
    return {
      ...t,
      leaderboard
    };
  }

  verifyHostPin(code, pin) {
    const t = this.tournaments.get((code || '').toUpperCase());
    if (!t) return false;
    return String(t.hostPin).trim() === String(pin).trim();
  }

  startTournament(code) {
    const t = this.tournaments.get((code || '').toUpperCase());
    if (!t) throw new Error('Turnamen tidak ditemukan');

    if (!t.rounds || t.rounds.length === 0) {
      return this.generateNextRound(code);
    }
    t.status = 'in_progress';
    t.updatedAt = new Date().toISOString();
    this.saveData();
    return this.getTournament(code);
  }

  generateNextRound(code) {
    const t = this.tournaments.get((code || '').toUpperCase());
    if (!t) throw new Error('Turnamen tidak ditemukan');

    // Current leaderboard for Mexicano pairing
    const leaderboard = calculateLeaderboard(t);

    let nextRound;
    if (t.format === 'mexicano') {
      nextRound = generateMexicanoRound({
        players: t.players,
        leaderboard,
        rounds: t.rounds,
        courtCount: t.courtCount,
        gameMode: t.gameMode,
        pointsTarget: t.pointsTarget
      });
    } else {
      nextRound = generateAmericanoRound({
        players: t.players,
        rounds: t.rounds,
        courtCount: t.courtCount,
        gameMode: t.gameMode,
        pointsTarget: t.pointsTarget
      });
    }

    t.rounds.push(nextRound);
    t.status = 'in_progress';
    t.updatedAt = new Date().toISOString();
    
    // Reset round timer
    t.timer = {
      running: true,
      startedAt: Date.now(),
      durationSeconds: (t.matchDurationMinutes || 15) * 60,
      remainingSeconds: (t.matchDurationMinutes || 15) * 60
    };

    this.saveData();
    return this.getTournament(code);
  }

  updateMatchScore(code, roundNumber, matchId, team1Score, team2Score) {
    const t = this.tournaments.get((code || '').toUpperCase());
    if (!t) throw new Error('Turnamen tidak ditemukan');

    const round = t.rounds.find(r => r.roundNumber === Number(roundNumber));
    if (!round) throw new Error(`Round ${roundNumber} tidak ditemukan`);

    const match = round.matches.find(m => m.id === matchId);
    if (!match) throw new Error(`Match ${matchId} tidak ditemukan`);

    match.team1Score = Number(team1Score);
    match.team2Score = Number(team2Score);
    match.status = 'completed';
    match.updatedAt = new Date().toISOString();

    // Check if all matches in round are completed
    const allMatchesCompleted = round.matches.every(m => m.status === 'completed');
    if (allMatchesCompleted) {
      round.status = 'completed';
    }

    t.updatedAt = new Date().toISOString();
    this.saveData();
    return this.getTournament(code);
  }

  setPlayerStatus(code, playerId, status) {
    const t = this.tournaments.get((code || '').toUpperCase());
    if (!t) throw new Error('Turnamen tidak ditemukan');

    const player = t.players.find(p => p.id === playerId);
    if (!player) throw new Error('Player tidak ditemukan');

    player.status = status; // 'active', 'resting', 'late', 'injured'
    t.updatedAt = new Date().toISOString();
    this.saveData();
    return this.getTournament(code);
  }

  addPlayer(code, playerData, options = {}) {
    const t = this.tournaments.get((code || '').toUpperCase());
    if (!t) throw new Error('Turnamen tidak ditemukan');

    const newPlayer = addPlayerMidMatch(t, playerData, options);
    t.updatedAt = new Date().toISOString();
    this.saveData();
    return { tournament: this.getTournament(code), player: newPlayer };
  }

  substitute(code, originalPlayerId, subData, options = {}) {
    const t = this.tournaments.get((code || '').toUpperCase());
    if (!t) throw new Error('Turnamen tidak ditemukan');

    const sub = substitutePlayer(t, originalPlayerId, subData, options);
    t.updatedAt = new Date().toISOString();
    this.saveData();
    return { tournament: this.getTournament(code), substitute: sub };
  }

  importPlayers(code, playersList) {
    const t = this.tournaments.get((code || '').toUpperCase());
    if (!t) throw new Error('Turnamen tidak ditemukan');

    const imported = [];
    playersList.forEach((p, idx) => {
      if (!p.name || !p.name.trim()) return;
      const player = {
        id: `p_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 5)}`,
        name: p.name.trim(),
        avatar: p.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(p.name)}`,
        skillLevel: p.skillLevel || 'intermediate',
        status: p.status || 'active',
        initialMMR: p.initialMMR || SKILL_LEVEL_MMR[p.skillLevel || 'intermediate'] || DEFAULT_MMR,
        mmr: p.initialMMR || SKILL_LEVEL_MMR[p.skillLevel || 'intermediate'] || DEFAULT_MMR,
        startingPoints: 0,
        joinedRound: t.rounds.length + 1
      };
      t.players.push(player);
      imported.push(player);
    });

    t.updatedAt = new Date().toISOString();
    this.saveData();
    return { tournament: this.getTournament(code), count: imported.length };
  }

  updateTimer(code, timerData) {
    const t = this.tournaments.get((code || '').toUpperCase());
    if (!t) return null;
    t.timer = { ...t.timer, ...timerData };
    this.saveData();
    return t.timer;
  }

  finishTournament(code) {
    const t = this.tournaments.get((code || '').toUpperCase());
    if (!t) throw new Error('Turnamen tidak ditemukan');

    t.status = 'completed';
    t.completedAt = new Date().toISOString();
    t.updatedAt = new Date().toISOString();
    this.saveData();

    const fullTournament = this.getTournament(code);
    // Archive into persistent history database
    db.archiveTournament(fullTournament);

    return fullTournament;
  }

  getUserTournaments(userId) {
    const active = [];
    for (const t of this.tournaments.values()) {
      if (t.hostId === userId || (t.players && t.players.some(p => p.id === userId))) {
        active.push(this.getTournament(t.code));
      }
    }
    return active;
  }

  getAllTournaments() {
    return Array.from(this.tournaments.keys()).map(c => this.getTournament(c));
  }
}

export const tournamentStore = new TournamentStore();

