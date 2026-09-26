import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import { tournamentStore } from './store.js';
import { db, verifyPassword, createToken, verifyToken } from './database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);

// Allow Socket.IO connections from any client
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  },
});

app.use(cors());
app.use(express.json());

// Helper to get local network IP address
function getLocalIpAddress() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

const PORT = process.env.PORT || 3001;
const LOCAL_IP = getLocalIpAddress();

// API Routes
app.get('/api/network-info', (req, res) => {
  res.json({
    localIp: LOCAL_IP,
    port: PORT,
    localUrl: `http://localhost:${PORT}`,
    networkUrl: `http://${LOCAL_IP}:${PORT}`,
  });
});

// --- AUTHENTICATION ROUTES ---

// Register
app.post('/api/auth/register', (req, res) => {
  try {
    const { name, email, password, role, skillLevel, avatar } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, error: 'Nama wajib diisi' });
    }
    if (!email || !email.includes('@')) {
      return res.status(400).json({ success: false, error: 'Format email tidak valid' });
    }
    if (!password || password.length < 6) {
      return res.status(400).json({ success: false, error: 'Password minimal 6 karakter' });
    }

    const user = db.createUser({
      name: name.trim(),
      email: email.trim(),
      password,
      role: role || 'player',
      skillLevel: skillLevel || 'intermediate',
      avatar
    });

    const token = createToken({ id: user.id, email: user.email, name: user.name, role: user.role });
    res.json({ success: true, user, token });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Login
app.post('/api/auth/login', (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email dan password wajib diisi' });
    }

    const user = db.findUserByEmail(email);
    if (!user) {
      return res.status(401).json({ success: false, error: 'Email atau password salah' });
    }

    const isValid = verifyPassword(password, user.salt, user.hash);
    if (!isValid) {
      return res.status(401).json({ success: false, error: 'Email atau password salah' });
    }

    const { salt: _, hash: __, ...safeUser } = user;
    const token = createToken({ id: user.id, email: user.email, name: user.name, role: user.role });

    res.json({ success: true, user: safeUser, token });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Current User profile from token
app.get('/api/auth/me', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'Token tidak ditemukan' });
  }

  const token = authHeader.split(' ')[1];
  const payload = verifyToken(token);
  if (!payload || !payload.id) {
    return res.status(401).json({ success: false, error: 'Token tidak valid atau kedaluwarsa' });
  }

  const user = db.findUserById(payload.id);
  if (!user) {
    return res.status(404).json({ success: false, error: 'User tidak ditemukan' });
  }

  const { salt: _, hash: __, ...safeUser } = user;
  res.json({ success: true, user: safeUser });
});

// --- TOURNAMENT & PLAYER HISTORY DATABASE ROUTES ---

// Get all tournament history
app.get('/api/history', (req, res) => {
  try {
    const { hostId, playerName } = req.query;
    const history = db.getHistory({ hostId, playerName });
    res.json({ success: true, history });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get specific archived tournament
app.get('/api/history/:code', (req, res) => {
  const history = db.getHistory().find(h => h.code.toUpperCase() === req.params.code.toUpperCase());
  if (!history) {
    return res.status(404).json({ success: false, error: 'Arsip riwayat tidak ditemukan' });
  }
  res.json({ success: true, tournament: history });
});

// Get player career stats & MMR progression history
app.get('/api/players/:idOrName/career', (req, res) => {
  try {
    const data = db.getPlayerCareerStats(req.params.idOrName);
    res.json({ success: true, ...data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Finish tournament and save to history database
app.post('/api/tournaments/:code/finish', (req, res) => {
  try {
    const tournament = tournamentStore.finishTournament(req.params.code);
    io.to(req.params.code.toUpperCase()).emit('tournament_updated', tournament);
    res.json({ success: true, tournament });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Create tournament
app.post('/api/tournaments', (req, res) => {
  try {
    const tournament = tournamentStore.createTournament(req.body);
    res.json({ success: true, tournament });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Get tournament
app.get('/api/tournaments/:code', (req, res) => {
  const tournament = tournamentStore.getTournament(req.params.code);
  if (!tournament) {
    return res.status(404).json({ success: false, error: 'Turnamen tidak ditemukan' });
  }
  res.json({ success: true, tournament });
});

// Verify Host PIN
app.post('/api/tournaments/:code/verify-host', (req, res) => {
  const { pin } = req.body;
  const isValid = tournamentStore.verifyHostPin(req.params.code, pin);
  res.json({ success: true, isValid });
});

// Start tournament
app.post('/api/tournaments/:code/start', (req, res) => {
  try {
    const tournament = tournamentStore.startTournament(req.params.code);
    io.to(req.params.code.toUpperCase()).emit('tournament_updated', tournament);
    res.json({ success: true, tournament });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Generate next round
app.post('/api/tournaments/:code/next-round', (req, res) => {
  try {
    const tournament = tournamentStore.generateNextRound(req.params.code);
    io.to(req.params.code.toUpperCase()).emit('tournament_updated', tournament);
    res.json({ success: true, tournament });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Update score
app.post('/api/tournaments/:code/score', (req, res) => {
  try {
    const { roundNumber, matchId, team1Score, team2Score } = req.body;
    const tournament = tournamentStore.updateMatchScore(
      req.params.code,
      roundNumber,
      matchId,
      team1Score,
      team2Score
    );
    io.to(req.params.code.toUpperCase()).emit('tournament_updated', tournament);
    res.json({ success: true, tournament });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Update player status (rest / active / late / injured)
app.post('/api/tournaments/:code/player-status', (req, res) => {
  try {
    const { playerId, status } = req.body;
    const tournament = tournamentStore.setPlayerStatus(req.params.code, playerId, status);
    io.to(req.params.code.toUpperCase()).emit('tournament_updated', tournament);
    res.json({ success: true, tournament });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Add player mid match
app.post('/api/tournaments/:code/add-player', (req, res) => {
  try {
    const { playerData, options } = req.body;
    const result = tournamentStore.addPlayer(req.params.code, playerData, options);
    io.to(req.params.code.toUpperCase()).emit('tournament_updated', result.tournament);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Substitute player
app.post('/api/tournaments/:code/substitute', (req, res) => {
  try {
    const { originalPlayerId, subData, options } = req.body;
    const result = tournamentStore.substitute(req.params.code, originalPlayerId, subData, options);
    io.to(req.params.code.toUpperCase()).emit('tournament_updated', result.tournament);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Import players (Excel / Reclub)
app.post('/api/tournaments/:code/import-players', (req, res) => {
  try {
    const { players } = req.body;
    const result = tournamentStore.importPlayers(req.params.code, players);
    io.to(req.params.code.toUpperCase()).emit('tournament_updated', result.tournament);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Socket.IO real-time event handling
io.on('connection', (socket) => {
  console.log(`[Socket] Client connected: ${socket.id}`);

  socket.on('join_tournament', ({ code, role, playerId }) => {
    const upperCode = (code || '').toUpperCase();
    socket.join(upperCode);
    console.log(`[Socket] ${socket.id} joined room ${upperCode} as ${role}`);
    
    // Send immediate tournament data
    const tournament = tournamentStore.getTournament(upperCode);
    if (tournament) {
      socket.emit('tournament_updated', tournament);
    }
  });

  socket.on('submit_score', ({ code, roundNumber, matchId, team1Score, team2Score }) => {
    try {
      const tournament = tournamentStore.updateMatchScore(code, roundNumber, matchId, team1Score, team2Score);
      io.to(code.toUpperCase()).emit('tournament_updated', tournament);
    } catch (err) {
      socket.emit('error', err.message);
    }
  });

  socket.on('timer_action', ({ code, action, remainingSeconds }) => {
    const upperCode = code.toUpperCase();
    const tournament = tournamentStore.getTournament(upperCode);
    if (!tournament) return;

    let updatedTimer;
    if (action === 'start') {
      updatedTimer = tournamentStore.updateTimer(upperCode, { running: true, startedAt: Date.now() });
    } else if (action === 'pause') {
      updatedTimer = tournamentStore.updateTimer(upperCode, { running: false, remainingSeconds });
    } else if (action === 'reset') {
      const duration = (tournament.matchDurationMinutes || 15) * 60;
      updatedTimer = tournamentStore.updateTimer(upperCode, { running: false, remainingSeconds: duration });
    }

    io.to(upperCode).emit('timer_updated', updatedTimer);
  });

  socket.on('disconnect', () => {
    console.log(`[Socket] Client disconnected: ${socket.id}`);
  });
});

// Serve frontend build if exists
const distPath = path.join(__dirname, '..', 'dist');
app.use(express.static(distPath));

// Fallback to index.html for SPA client-side routing
app.use((req, res) => {
  if (req.url.startsWith('/api')) {
    return res.status(404).json({ error: 'Not found' });
  }
  const indexPath = path.join(distPath, 'index.html');
  res.sendFile(indexPath, (err) => {
    if (err) {
      res.send(`Padel Match Manager API Server is running on port ${PORT}.`);
    }
  });
});

server.listen(PORT, () => {
  console.log(`
=====================================================
🎾 PADEL MATCH MANAGER SERVER RUNNING
=====================================================
Local:            http://localhost:${PORT}
Network / Mobile: http://${LOCAL_IP}:${PORT}
=====================================================
  `);
});
