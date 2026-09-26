import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { 
  Trophy, 
  MapPin, 
  Users, 
  Sparkles, 
  History, 
  ChevronRight, 
  PlusCircle, 
  RefreshCw, 
  Coffee, 
  Play, 
  AlertCircle,
  Smartphone
} from 'lucide-react';

import { socket } from './services/socket.js';
import { sounds } from './services/audio.js';

import Navbar from './components/Navbar.jsx';
import MatchTimer from './components/MatchTimer.jsx';
import CourtCard from './components/CourtCard.jsx';
import Leaderboard from './components/Leaderboard.jsx';
import PlayerPortal from './components/PlayerPortal.jsx';
import PlayerRoster from './components/PlayerRoster.jsx';
import RoundHistory from './components/RoundHistory.jsx';
import TournamentSetup from './components/TournamentSetup.jsx';
import QRCodeModal from './components/QRCodeModal.jsx';
import HostUnlockModal from './components/HostUnlockModal.jsx';
import AddPlayerModal from './components/AddPlayerModal.jsx';
import SubstituteModal from './components/SubstituteModal.jsx';
import ImportModal from './components/ImportModal.jsx';
import AuthModal from './components/AuthModal.jsx';
import HistoryModal from './components/HistoryModal.jsx';

export default function App() {
  const [tournament, setTournament] = useState(null);
  const [isConnected, setIsConnected] = useState(socket.connected);
  const [activeTab, setActiveTab] = useState('courts'); // 'courts' | 'leaderboard' | 'player_portal' | 'roster' | 'history'
  
  // User Session & Role
  const [currentUser, setCurrentUser] = useState(null);
  const [role, setRole] = useState('spectator'); // 'host' | 'player' | 'spectator'
  const [activePlayer, setActivePlayer] = useState(null);

  // Modals
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  const [isHostUnlockOpen, setIsHostUnlockOpen] = useState(false);
  const [isAddPlayerOpen, setIsAddPlayerOpen] = useState(false);
  const [isSubstituteOpen, setIsSubstituteOpen] = useState(false);
  const [substituteTarget, setSubstituteTarget] = useState(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

  // Auto-load session from URL or LocalStorage
  useEffect(() => {
    // Restore User Auth
    const savedUser = localStorage.getItem('padel_auth_user');
    const token = localStorage.getItem('padel_auth_token');
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        setCurrentUser(parsed);
      } catch {}
    }

    if (token) {
      fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.json())
        .then(d => {
          if (d.success && d.user) {
            setCurrentUser(d.user);
            localStorage.setItem('padel_auth_user', JSON.stringify(d.user));
          }
        })
        .catch(() => {});
    }

    const urlParams = new URLSearchParams(window.location.search);
    const codeFromUrl = urlParams.get('code');
    const savedCode = localStorage.getItem('padel_tournament_code');
    const targetCode = codeFromUrl || savedCode;

    if (targetCode) {
      loadTournament(targetCode);
    }

    // Restore saved host role or active player
    const savedRole = localStorage.getItem(`padel_role_${targetCode}`);
    if (savedRole === 'host') {
      setRole('host');
    }
  }, []);

  const handleAuthSuccess = (user) => {
    setCurrentUser(user);
    if (user.role === 'host') {
      setRole('host');
    } else if (tournament) {
      // Find matching player
      const found = tournament.players.find(p => 
        p.id === user.id || p.name.toLowerCase() === user.name.toLowerCase()
      );
      if (found) {
        setActivePlayer(found);
        setRole('player');
      }
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('padel_auth_token');
    localStorage.removeItem('padel_auth_user');
    setCurrentUser(null);
  };

  const handleFinishTournament = async () => {
    if (!tournament) return;
    if (!window.confirm(`Selesaikan turnamen "${tournament.title}" dan simpan ke Database Riwayat?`)) return;

    try {
      const res = await fetch(`/api/tournaments/${tournament.code}/finish`, { method: 'POST' });
      const data = await res.json();
      if (data.success && data.tournament) {
        setTournament(data.tournament);
        confetti({ particleCount: 150, spread: 90, origin: { y: 0.5 } });
        alert(`🏆 Turnamen berhasil diselesaikan dan diarsipkan ke Database Riwayat!`);
      } else {
        alert('Gagal menyelesaikan turnamen: ' + (data.error || ''));
      }
    } catch (err) {
      alert('Gagal menyelesaikan turnamen: ' + err.message);
    }
  };

  // Socket Connection & Realtime Event Listeners
  useEffect(() => {
    function onConnect() {
      setIsConnected(true);
      if (tournament?.code) {
        socket.emit('join_tournament', { code: tournament.code, role, playerId: activePlayer?.id });
      }
    }

    function onDisconnect() {
      setIsConnected(false);
    }

    function onTournamentUpdated(updatedTournament) {
      setTournament(updatedTournament);
      // Sync active player object if exists
      if (activePlayer) {
        const found = updatedTournament.players.find(p => p.id === activePlayer.id);
        if (found) setActivePlayer(found);
      }
    }

    function onTimerUpdated(timerData) {
      setTournament(prev => prev ? { ...prev, timer: timerData } : prev);
    }

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('tournament_updated', onTournamentUpdated);
    socket.on('timer_updated', onTimerUpdated);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('tournament_updated', onTournamentUpdated);
      socket.off('timer_updated', onTimerUpdated);
    };
  }, [tournament?.code, role, activePlayer?.id]);

  const loadTournament = async (code) => {
    try {
      const res = await fetch(`/api/tournaments/${code}`);
      const data = await res.json();
      if (data.success && data.tournament) {
        setTournament(data.tournament);
        localStorage.setItem('padel_tournament_code', code);
        socket.emit('join_tournament', { code, role, playerId: activePlayer?.id });

        // Match active player if ID was saved
        const savedPlayerId = localStorage.getItem(`padel_player_${code}`);
        if (savedPlayerId) {
          const found = data.tournament.players.find(p => p.id === savedPlayerId);
          if (found) {
            setActivePlayer(found);
            setRole('player');
          }
        }
      }
    } catch (err) {
      console.error('Failed to load tournament:', err);
    }
  };

  const handleCreateTournament = async (payload) => {
    try {
      const res = await fetch('/api/tournaments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success && data.tournament) {
        setTournament(data.tournament);
        setRole('host');
        localStorage.setItem('padel_tournament_code', data.tournament.code);
        localStorage.setItem(`padel_role_${data.tournament.code}`, 'host');
        socket.emit('join_tournament', { code: data.tournament.code, role: 'host' });
        
        // If rounds not yet started, trigger start
        if (!data.tournament.rounds || data.tournament.rounds.length === 0) {
          await handleStartTournament(data.tournament.code);
        } else {
          sounds.playWhistle();
        }
        confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 } });
      } else {
        alert('Gagal membuat turnamen: ' + (data.error || 'Error tidak diketahui'));
      }
    } catch (err) {
      alert('Gagal membuat turnamen: ' + err.message);
    }
  };

  const handleStartTournament = async (code = tournament?.code) => {
    if (!code) return;
    try {
      const res = await fetch(`/api/tournaments/${code}/start`, { method: 'POST' });
      const data = await res.json();
      if (data.success && data.tournament) {
        setTournament(data.tournament);
        sounds.playWhistle();
      } else {
        alert('Gagal memulai ronde: ' + (data.error || 'Silakan periksa pemain aktif'));
      }
    } catch (err) {
      alert('Gagal memulai turnamen: ' + err.message);
    }
  };

  const handleNextRound = async () => {
    if (!tournament) return;
    try {
      const res = await fetch(`/api/tournaments/${tournament.code}/next-round`, { method: 'POST' });
      const data = await res.json();
      if (data.success && data.tournament) {
        setTournament(data.tournament);
        sounds.playWhistle();
        confetti({ particleCount: 50, spread: 70, origin: { y: 0.6 } });
      } else {
        alert('Gagal membuat ronde baru: ' + (data.error || 'Error tidak diketahui'));
      }
    } catch (err) {
      alert('Gagal membuat ronde baru: ' + err.message);
    }
  };

  const handleSubmitScore = async ({ roundNumber, matchId, team1Score, team2Score }) => {
    if (!tournament) return;
    try {
      const res = await fetch(`/api/tournaments/${tournament.code}/score`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roundNumber, matchId, team1Score, team2Score })
      });
      const data = await res.json();
      if (data.success && data.tournament) {
        setTournament(data.tournament);
        sounds.playScoreBlip();
      } else if (!data.success) {
        alert('Gagal menyimpan skor: ' + (data.error || ''));
      }
    } catch (err) {
      alert('Gagal menyimpan skor: ' + err.message);
    }
  };

  const handleTimerAction = (action, remainingSeconds) => {
    if (!tournament) return;
    socket.emit('timer_action', {
      code: tournament.code,
      action,
      remainingSeconds
    });
  };

  const handleUpdatePlayerStatus = async (playerId, status) => {
    if (!tournament) return;
    try {
      const res = await fetch(`/api/tournaments/${tournament.code}/player-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId, status })
      });
      const data = await res.json();
      if (data.success && data.tournament) {
        setTournament(data.tournament);
      }
    } catch (err) {
      alert('Gagal mengubah status: ' + err.message);
    }
  };

  const handleAddPlayer = async ({ playerData, options }) => {
    if (!tournament) return;
    try {
      const res = await fetch(`/api/tournaments/${tournament.code}/add-player`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerData, options })
      });
      const data = await res.json();
      if (data.success && data.tournament) {
        setTournament(data.tournament);
      }
    } catch (err) {
      alert('Gagal menambah pemain: ' + err.message);
    }
  };

  const handleSubstitute = async ({ originalPlayerId, subData, options }) => {
    if (!tournament) return;
    try {
      const res = await fetch(`/api/tournaments/${tournament.code}/substitute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ originalPlayerId, subData, options })
      });
      const data = await res.json();
      if (data.success && data.tournament) {
        setTournament(data.tournament);
      }
    } catch (err) {
      alert('Gagal melakukan substitusi: ' + err.message);
    }
  };

  const handleImportPlayers = async (playersList) => {
    if (!tournament) return;
    try {
      const res = await fetch(`/api/tournaments/${tournament.code}/import-players`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ players: playersList })
      });
      const data = await res.json();
      if (data.success && data.tournament) {
        setTournament(data.tournament);
      }
    } catch (err) {
      alert('Gagal import pemain: ' + err.message);
    }
  };

  const handleSelectPlayer = (player) => {
    setActivePlayer(player);
    if (player) {
      setRole('player');
      localStorage.setItem(`padel_player_${tournament?.code}`, player.id);
      setActiveTab('player_portal');
    } else {
      setRole('spectator');
      localStorage.removeItem(`padel_player_${tournament?.code}`);
    }
  };

  const handleVerifyHost = () => {
    setRole('host');
    if (tournament) {
      localStorage.setItem(`padel_role_${tournament.code}`, 'host');
    }
  };

  // If no tournament is loaded, show Tournament Setup with Navbar
  if (!tournament) {
    return (
      <div className="min-h-screen bg-padel-dark text-slate-100 flex flex-col">
        <Navbar
          tournament={null}
          role={role}
          currentUser={currentUser}
          isConnected={isConnected}
          onOpenAuth={() => setIsAuthModalOpen(true)}
          onOpenHistory={() => setIsHistoryModalOpen(true)}
          onLogout={handleLogout}
          onSwitchTournament={() => setTournament(null)}
        />
        <TournamentSetup
          currentUser={currentUser}
          onCreateTournament={handleCreateTournament}
          onJoinTournament={loadTournament}
          onOpenHistory={() => setIsHistoryModalOpen(true)}
          onOpenAuth={() => setIsAuthModalOpen(true)}
        />
        <AuthModal
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
          onAuthSuccess={handleAuthSuccess}
        />
        <HistoryModal
          isOpen={isHistoryModalOpen}
          onClose={() => setIsHistoryModalOpen(false)}
          currentUser={currentUser}
          onLoadTournament={loadTournament}
        />
      </div>
    );
  }

  const currentRound = tournament.rounds?.[tournament.rounds.length - 1];
  const playerMap = new Map((tournament.players || []).map(p => [p.id, p]));
  const byePlayers = (currentRound?.byes || []).map(id => playerMap.get(id)).filter(Boolean);
  const isHost = role === 'host';

  const allCurrentMatchesCompleted = currentRound?.matches?.every(m => m.status === 'completed');

  // Compute average points for mid-match add fairness
  const avgPts = tournament.leaderboard?.length > 0
    ? Math.round(tournament.leaderboard.reduce((s, p) => s + p.pointsWon, 0) / tournament.leaderboard.length)
    : 0;

  return (
    <div className="min-h-screen bg-padel-dark text-slate-100 flex flex-col pb-16">
      {/* Top Navbar */}
      <Navbar
        tournament={tournament}
        role={role}
        activePlayer={activePlayer}
        currentUser={currentUser}
        isConnected={isConnected}
        onOpenQR={() => setIsQRModalOpen(true)}
        onOpenHostUnlock={() => setIsHostUnlockOpen(true)}
        onSwitchTournament={() => setTournament(null)}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onOpenHistory={() => setIsHistoryModalOpen(true)}
        onLogout={handleLogout}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-4 space-y-4">
        {/* Timer Bar */}
        <MatchTimer
          timer={tournament.timer}
          isHost={isHost}
          onTimerAction={handleTimerAction}
          matchDurationMinutes={tournament.matchDurationMinutes}
        />

        {/* Tab Navigation Pill Bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-padel-border/60">
          <button
            onClick={() => setActiveTab('courts')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              activeTab === 'courts'
                ? 'bg-padel-lime text-black shadow-lg shadow-padel-lime/20'
                : 'bg-slate-900/80 text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <MapPin className="w-4 h-4" />
            <span>Lapangan (Round {currentRound?.roundNumber || 1})</span>
          </button>

          <button
            onClick={() => setActiveTab('player_portal')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              activeTab === 'player_portal'
                ? 'bg-padel-blue text-black shadow-lg shadow-padel-blue/20'
                : 'bg-slate-900/80 text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            <span>Mode HP Pemain</span>
            {activePlayer && <span className="w-2 h-2 rounded-full bg-emerald-400" />}
          </button>

          <button
            onClick={() => setActiveTab('leaderboard')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              activeTab === 'leaderboard'
                ? 'bg-amber-400 text-black shadow-lg shadow-amber-400/20'
                : 'bg-slate-900/80 text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Trophy className="w-4 h-4" />
            <span>Leaderboard</span>
          </button>

          <button
            onClick={() => setActiveTab('roster')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              activeTab === 'roster'
                ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/20'
                : 'bg-slate-900/80 text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Pemain ({tournament.players?.length || 0})</span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              activeTab === 'history'
                ? 'bg-slate-700 text-white shadow-lg'
                : 'bg-slate-900/80 text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Riwayat Ronde</span>
          </button>
        </div>

        {/* TAB 1: COURTS & CURRENT ROUND */}
        {activeTab === 'courts' && (
          <div className="space-y-4">
            {/* Host Round Control Action Bar */}
            {isHost && (
              <div className="bg-padel-card rounded-2xl border border-padel-border p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-md">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-sm text-white">
                      Kontrol Ronde Host
                    </span>
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-padel-lime text-black uppercase">
                      Round {currentRound?.roundNumber || 1}
                    </span>
                  </div>
                  <span className="text-xs text-slate-400">
                    {allCurrentMatchesCompleted
                      ? '✅ Semua lapangan selesai input skor! Siap lanjut ke ronde berikutnya.'
                      : '⚡ Pertandingan sedang berjalan di tiap lapangan.'}
                  </span>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap">
                  {tournament.rounds?.length > 0 && (
                    <button
                      onClick={handleFinishTournament}
                      className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs shadow-md transition active:scale-95"
                      title="Selesaikan turnamen dan simpan arsip ke database riwayat"
                    >
                      <Trophy className="w-4 h-4" />
                      <span>Selesaikan & Simpan DB</span>
                    </button>
                  )}
                  <button
                    onClick={handleNextRound}
                    className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-padel-lime hover:bg-padel-lime-dark text-black font-extrabold text-xs shadow-lg shadow-padel-lime/20 transition active:scale-95"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Generate Round {(currentRound?.roundNumber || 0) + 1} ({tournament.format})</span>
                  </button>
                </div>
              </div>
            )}

            {/* Resting / Bye Players Alert */}
            {byePlayers.length > 0 && (
              <div className="p-3.5 rounded-2xl bg-amber-950/30 border border-amber-500/30 flex items-center gap-3">
                <Coffee className="w-5 h-5 text-amber-400 flex-shrink-0" />
                <div className="text-xs text-amber-200/90 min-w-0">
                  <span className="font-bold block">Pemain Istirahat / BYE Round Ini:</span>
                  <span className="truncate block mt-0.5 font-medium">
                    {byePlayers.map(p => p.name).join(', ')}
                  </span>
                </div>
              </div>
            )}

            {/* Court Cards Grid */}
            {currentRound ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {currentRound.matches.map(match => (
                  <CourtCard
                    key={match.id}
                    match={match}
                    roundNumber={currentRound.roundNumber}
                    playerMap={playerMap}
                    isHost={isHost}
                    canSubmitScore={tournament.allowPlayerScoreEntry || isHost}
                    currentUserId={activePlayer?.id}
                    onSubmitScore={handleSubmitScore}
                    pointsTarget={tournament.pointsTarget}
                  />
                ))}
              </div>
            ) : (
              <div className="p-12 text-center bg-padel-card rounded-3xl border border-padel-border space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-padel-lime/10 border border-padel-lime/30 flex items-center justify-center mx-auto text-2xl">
                  🎾
                </div>
                <h3 className="text-lg font-bold text-white">Belum Ada Ronde Berjalan</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Klik tombol di bawah untuk membuat pasangan pertandingan Round 1 secara fair.
                </p>
                {isHost && (
                  <button
                    onClick={() => handleStartTournament()}
                    className="px-6 py-2.5 rounded-xl bg-padel-lime hover:bg-padel-lime-dark text-black font-extrabold text-xs shadow-lg shadow-padel-lime/20"
                  >
                    Mulai Round 1 Sekarang
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: PLAYER PERSONAL PORTAL */}
        {activeTab === 'player_portal' && (
          <PlayerPortal
            tournament={tournament}
            activePlayer={activePlayer}
            onSelectPlayer={handleSelectPlayer}
            onUpdateStatus={handleUpdatePlayerStatus}
            onSubmitScore={handleSubmitScore}
          />
        )}

        {/* TAB 3: LEADERBOARD */}
        {activeTab === 'leaderboard' && (
          <Leaderboard
            leaderboard={tournament.leaderboard}
            tournamentTitle={tournament.title}
            currentUserId={activePlayer?.id}
          />
        )}

        {/* TAB 4: ROSTER & SUBSTITUTION */}
        {activeTab === 'roster' && (
          <PlayerRoster
            players={tournament.players}
            isHost={isHost}
            onUpdateStatus={handleUpdatePlayerStatus}
            onOpenAddPlayer={() => setIsAddPlayerOpen(true)}
            onOpenSubstitute={(player) => {
              setSubstituteTarget(player);
              setIsSubstituteOpen(true);
            }}
            onOpenImport={() => setIsImportModalOpen(true)}
          />
        )}

        {/* TAB 5: ROUND HISTORY */}
        {activeTab === 'history' && (
          <RoundHistory
            rounds={tournament.rounds}
            playerMap={playerMap}
            isHost={isHost}
            onSubmitScore={handleSubmitScore}
            pointsTarget={tournament.pointsTarget}
          />
        )}
      </main>

      {/* MODALS */}
      {/* 1. QR Code / Share */}
      <QRCodeModal
        isOpen={isQRModalOpen}
        onClose={() => setIsQRModalOpen(false)}
        tournament={tournament}
      />

      {/* 2. Host Unlock Modal */}
      <HostUnlockModal
        isOpen={isHostUnlockOpen}
        onClose={() => setIsHostUnlockOpen(false)}
        onVerifyHost={handleVerifyHost}
        tournamentCode={tournament.code}
      />

      {/* 3. Add Player Mid-Match Modal */}
      <AddPlayerModal
        isOpen={isAddPlayerOpen}
        onClose={() => setIsAddPlayerOpen(false)}
        onAddPlayer={handleAddPlayer}
        currentRoundNumber={tournament.rounds?.length || 1}
        averageTournamentPoints={avgPts}
      />

      {/* 4. Substitute Player Modal */}
      <SubstituteModal
        isOpen={isSubstituteOpen}
        onClose={() => {
          setIsSubstituteOpen(false);
          setSubstituteTarget(null);
        }}
        targetPlayer={substituteTarget}
        onSubstitute={handleSubstitute}
        currentRoundInProgress={currentRound?.status === 'in_progress'}
      />

      {/* 5. Import Excel / Reclub Modal */}
      <ImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImportPlayers={handleImportPlayers}
      />

      {/* 6. Auth Login/Register Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onAuthSuccess={handleAuthSuccess}
      />

      {/* 7. History Database Modal */}
      <HistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        currentUser={currentUser}
        onLoadTournament={loadTournament}
      />
    </div>
  );
}
