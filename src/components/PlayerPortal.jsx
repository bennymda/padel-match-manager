import React, { useState } from 'react';
import { 
  User, 
  MapPin, 
  Users, 
  Trophy, 
  Coffee, 
  CheckCircle2, 
  Clock, 
  Activity, 
  ArrowRight,
  ShieldCheck,
  Zap
} from 'lucide-react';
import CourtCard from './CourtCard.jsx';

export default function PlayerPortal({
  tournament,
  activePlayer,
  onSelectPlayer,
  onUpdateStatus,
  onSubmitScore
}) {
  const currentRound = tournament.rounds?.[tournament.rounds.length - 1];
  const playerMap = new Map((tournament.players || []).map(p => [p.id, p]));
  
  // Find player standing
  const playerStanding = (tournament.leaderboard || []).find(p => p.id === activePlayer?.id);

  // If player hasn't selected their identity yet
  if (!activePlayer) {
    return (
      <div className="bg-padel-card rounded-2xl border border-padel-border p-6 max-w-lg mx-auto text-center space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-padel-lime/10 border border-padel-lime/30 flex items-center justify-center mx-auto text-2xl">
          🎾
        </div>
        <div>
          <h2 className="text-xl font-extrabold text-white">Pilih Profil Pemain Anda</h2>
          <p className="text-xs text-slate-400 mt-1">
            Pilih nama Anda dari daftar peserta untuk memantau lapangan & memasukkan skor dari HP Anda.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-80 overflow-y-auto pt-2 text-left">
          {tournament.players.map(p => (
            <button
              key={p.id}
              onClick={() => onSelectPlayer(p)}
              className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700 hover:border-padel-lime transition active:scale-95 text-left"
            >
              <img
                src={p.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(p.name)}`}
                alt={p.name}
                className="w-8 h-8 rounded-full border border-slate-700 bg-slate-800"
              />
              <div className="min-w-0">
                <span className="font-bold text-sm text-slate-200 block truncate">{p.name}</span>
                <span className="text-[10px] font-mono text-slate-400">{p.skillLevel} • {p.mmr || 1200} MMR</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Check if player is resting in current round
  const isRestingThisRound = currentRound?.byes?.includes(activePlayer.id);

  // Find match where active player is playing
  let activeMatch = null;
  let isTeam1 = false;
  if (currentRound && !isRestingThisRound) {
    activeMatch = currentRound.matches.find(m => 
      m.team1.includes(activePlayer.id) || m.team2.includes(activePlayer.id)
    );
    if (activeMatch) {
      isTeam1 = activeMatch.team1.includes(activePlayer.id);
    }
  }

  // Identify partner and opponents
  let partner = null;
  let opponents = [];
  if (activeMatch) {
    const myTeam = isTeam1 ? activeMatch.team1 : activeMatch.team2;
    const opponentTeam = isTeam1 ? activeMatch.team2 : activeMatch.team1;
    const partnerId = myTeam.find(id => id !== activePlayer.id);
    partner = partnerId ? playerMap.get(partnerId) : null;
    opponents = opponentTeam.map(id => playerMap.get(id)).filter(Boolean);
  }

  const isRestingRequested = activePlayer.status === 'resting';

  const toggleRestNextRound = () => {
    const newStatus = isRestingRequested ? 'active' : 'resting';
    onUpdateStatus(activePlayer.id, newStatus);
  };

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      {/* Player Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 p-4 rounded-2xl border border-padel-border flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <img
            src={activePlayer.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(activePlayer.name)}`}
            alt={activePlayer.name}
            className="w-12 h-12 rounded-2xl border-2 border-padel-lime bg-slate-800 object-cover shadow-md"
          />
          <div>
            <div className="flex items-center gap-1.5">
              <h2 className="text-base font-extrabold text-white">{activePlayer.name}</h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-padel-lime/20 text-padel-lime border border-padel-lime/30">
                Pemain
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
              <span className="font-mono text-amber-300 font-bold">{activePlayer.mmr || 1200} MMR</span>
              <span>•</span>
              <span>Rank #{playerStanding?.rank || '-'}</span>
              <span>•</span>
              <span className="text-padel-lime font-bold">{playerStanding?.pointsWon || 0} Pts</span>
            </div>
          </div>
        </div>

        <button
          onClick={() => onSelectPlayer(null)}
          className="text-xs text-slate-400 hover:text-white px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700"
        >
          Ganti Akun
        </button>
      </div>

      {/* Current Round Court Assignment Card */}
      {currentRound ? (
        isRestingThisRound ? (
          <div className="p-6 rounded-2xl bg-amber-950/20 border border-amber-500/40 text-center space-y-2">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400">
              <Coffee className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-amber-300">Round {currentRound.roundNumber}: Istirahat / BYE</h3>
            <p className="text-xs text-slate-300 max-w-sm mx-auto">
              Anda mendapat jatah istirahat di round ini. Silakan minum atau rehat sejenak sebelum round berikutnya dimulai!
            </p>
          </div>
        ) : activeMatch ? (
          <div className="space-y-3">
            {/* Big Court Callout Banner */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-padel-lime/15 to-padel-blue/15 border border-padel-lime/50 shadow-xl">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-padel-lime animate-bounce" />
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                    Lokasi Main Round {currentRound.roundNumber}
                  </span>
                </div>
                <span className="font-mono text-xs font-black px-2 py-0.5 rounded bg-padel-lime text-black uppercase">
                  Target: {tournament.pointsTarget} Poin
                </span>
              </div>

              <div className="text-center py-2">
                <span className="block text-3xl sm:text-4xl font-black text-white font-mono tracking-tight">
                  COURT {activeMatch.courtNumber}
                </span>
              </div>

              {/* Teammate & Opponents */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3 pt-3 border-t border-slate-700/50">
                {/* Teammate */}
                <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-700/60">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Partner Anda:
                  </span>
                  {partner ? (
                    <div className="flex items-center gap-2">
                      <img
                        src={partner.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(partner.name)}`}
                        alt={partner.name}
                        className="w-7 h-7 rounded-full border border-slate-700"
                      />
                      <span className="text-sm font-bold text-padel-lime truncate">{partner.name}</span>
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400 italic">Singles (1v1)</span>
                  )}
                </div>

                {/* Opponents */}
                <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-700/60">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Lawan Anda:
                  </span>
                  <div className="space-y-1">
                    {opponents.map(op => (
                      <div key={op.id} className="flex items-center gap-1.5">
                        <img
                          src={op.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(op.name)}`}
                          alt={op.name}
                          className="w-5 h-5 rounded-full border border-slate-700"
                        />
                        <span className="text-xs font-semibold text-slate-200 truncate">{op.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Score Entry Card */}
            <div>
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
                <span>Input / Pantau Skor Pertandingan:</span>
                {tournament.allowPlayerScoreEntry && (
                  <span className="text-[11px] text-emerald-400 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Player Score Entry Aktif
                  </span>
                )}
              </div>
              <CourtCard
                match={activeMatch}
                roundNumber={currentRound.roundNumber}
                playerMap={playerMap}
                isHost={false}
                canSubmitScore={tournament.allowPlayerScoreEntry}
                currentUserId={activePlayer.id}
                onSubmitScore={onSubmitScore}
                pointsTarget={tournament.pointsTarget}
              />
            </div>
          </div>
        ) : null
      ) : (
        <div className="p-8 rounded-2xl bg-padel-card border border-padel-border text-center space-y-2">
          <Clock className="w-8 h-8 text-slate-500 mx-auto animate-spin" />
          <h3 className="text-base font-bold text-white">Menunggu Host Memulai Round 1</h3>
          <p className="text-xs text-slate-400">
            Host sedang menyiapkan giliran pertandingan. Tetap di halaman ini untuk update otomatis!
          </p>
        </div>
      )}

      {/* Request Rest Next Round toggle */}
      <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center justify-between gap-3">
        <div>
          <span className="text-xs font-bold text-slate-200 block">Jeda Istirahat Round Berikutnya</span>
          <span className="text-[11px] text-slate-400">
            Aktifkan jika Anda butuh istirahat atau cedera ringan pada round selanjutnya.
          </span>
        </div>
        <button
          onClick={toggleRestNextRound}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition ${
            isRestingRequested
              ? 'bg-amber-500 text-black border-amber-400 shadow-md shadow-amber-500/20'
              : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
          }`}
        >
          {isRestingRequested ? '⏳ Rehat Aktif' : 'Rehat Nanti'}
        </button>
      </div>
    </div>
  );
}
