import React, { useState } from 'react';
import { 
  Trophy, 
  Users, 
  Sparkles, 
  Layers, 
  Clock, 
  Shield, 
  ArrowRight, 
  Plus, 
  Trash2,
  FileSpreadsheet,
  CheckCircle2,
  HelpCircle,
  Database
} from 'lucide-react';
import ImportModal from './ImportModal.jsx';
import { BRANDING } from '../config/branding.js';

const SAMPLE_PLAYERS_8 = [
  { name: 'Carlos Alcaraz', skillLevel: 'pro' },
  { name: 'Alejandro Galan', skillLevel: 'pro' },
  { name: 'Juan Lebron', skillLevel: 'pro' },
  { name: 'Paquito Navarro', skillLevel: 'pro' },
  { name: 'Arturo Coello', skillLevel: 'pro' },
  { name: 'Agustin Tapia', skillLevel: 'pro' },
  { name: 'Fernando Belasteguin', skillLevel: 'advanced' },
  { name: 'Martin Di Nenno', skillLevel: 'advanced' }
];

const SAMPLE_PLAYERS_12 = [
  ...SAMPLE_PLAYERS_8,
  { name: 'Franco Stupaczuk', skillLevel: 'advanced' },
  { name: 'Sanyo Gutierrez', skillLevel: 'advanced' },
  { name: 'Alex Ruiz', skillLevel: 'intermediate' },
  { name: 'Momo Gonzalez', skillLevel: 'intermediate' }
];

export default function TournamentSetup({
  onCreateTournament,
  onJoinTournament,
  currentUser,
  onOpenHistory,
  onOpenAuth
}) {
  const [mode, setMode] = useState('create'); // 'create' | 'join'
  const [joinCode, setJoinCode] = useState('');

  // Create Form State
  const [title, setTitle] = useState('Padel Fun Tournament');
  const [format, setFormat] = useState('americano'); // 'americano' | 'mexicano'
  const [gameMode, setGameMode] = useState('doubles'); // 'doubles' | 'singles' | 'fixed_partner'
  const [courtCount, setCourtCount] = useState(2);
  const [pointsTarget, setPointsTarget] = useState(24);
  const [durationMinutes, setDurationMinutes] = useState(15);
  const [hostPin, setHostPin] = useState('1234');
  const [allowPlayerScoreEntry, setAllowPlayerScoreEntry] = useState(true);

  const [players, setPlayers] = useState(SAMPLE_PLAYERS_8);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [newPlayerSkill, setNewPlayerSkill] = useState('intermediate');
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  const handleAddPlayer = () => {
    if (!newPlayerName.trim()) return;
    setPlayers(prev => [
      ...prev,
      { name: newPlayerName.trim(), skillLevel: newPlayerSkill }
    ]);
    setNewPlayerName('');
  };

  const handleRemovePlayer = (idx) => {
    setPlayers(prev => prev.filter((_, i) => i !== idx));
  };

  const handleImport = (importedList) => {
    setPlayers(prev => [...prev, ...importedList]);
  };

  const handleCreateSubmit = (e) => {
    e.preventDefault();
    if (players.length < (gameMode === 'singles' ? 2 : 4)) {
      alert(`Minimal butuh ${gameMode === 'singles' ? '2' : '4'} pemain untuk memulai turnamen.`);
      return;
    }

    onCreateTournament({
      title,
      format,
      gameMode,
      courtCount,
      pointsTarget,
      matchDurationMinutes: durationMinutes,
      hostPin,
      allowPlayerScoreEntry,
      hostId: currentUser?.id || null,
      players
    });
  };

  const handleJoinSubmit = (e) => {
    e.preventDefault();
    if (!joinCode.trim()) return;
    onJoinTournament(joinCode.trim());
  };

  return (
    <div className="max-w-3xl mx-auto py-6 px-4">
      {/* Brand Header */}
      <div className="text-center mb-8 space-y-2">
        {BRANDING.logoType === 'image' ? (
          <img
            src={BRANDING.logoImageUrl}
            alt={BRANDING.appName}
            className="w-16 h-16 rounded-3xl object-contain shadow-xl shadow-padel-lime/20 mb-2 mx-auto bg-slate-900 border border-slate-700"
          />
        ) : (
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-padel-lime text-black font-black text-3xl shadow-xl shadow-padel-lime/20 mb-2">
            {BRANDING.logoEmoji}
          </div>
        )}
        <h1 className="text-3xl font-black tracking-tight text-white uppercase">
          {BRANDING.appName}{BRANDING.appNameHighlight && <span className="text-padel-lime">{BRANDING.appNameHighlight}</span>} {BRANDING.appSubtitle}
        </h1>
        <p className="text-sm text-slate-400 max-w-md mx-auto">
          {BRANDING.description}
        </p>

        {/* Quick action bar for Database History & User Profile */}
        <div className="pt-2 flex items-center justify-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={onOpenHistory}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 text-xs font-bold transition shadow-sm"
          >
            <Database className="w-4 h-4 text-amber-400" />
            <span>Buka Database Riwayat Turnamen</span>
          </button>
          {!currentUser && (
            <button
              type="button"
              onClick={onOpenAuth}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-padel-blue/15 hover:bg-padel-blue/25 text-padel-blue border border-padel-blue/40 text-xs font-bold transition shadow-sm"
            >
              <span>Masuk / Daftar Akun</span>
            </button>
          )}
        </div>
      </div>

      {/* Mode Switcher: Create vs Join */}
      <div className="flex bg-slate-900 p-1.5 rounded-2xl border border-padel-border mb-6">
        <button
          onClick={() => setMode('create')}
          className={`flex-1 py-3 text-xs sm:text-sm font-bold rounded-xl transition ${
            mode === 'create'
              ? 'bg-padel-card text-padel-lime shadow-lg border border-padel-lime/30'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          🏆 Buat Turnamen Baru (Host)
        </button>
        <button
          onClick={() => setMode('join')}
          className={`flex-1 py-3 text-xs sm:text-sm font-bold rounded-xl transition ${
            mode === 'join'
              ? 'bg-padel-card text-padel-blue shadow-lg border border-padel-blue/30'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          📱 Gabung Sesi / Scan QR
        </button>
      </div>

      {mode === 'join' ? (
        /* Join Existing Tournament Form */
        <div className="bg-padel-card rounded-3xl border border-padel-border p-6 shadow-2xl space-y-5">
          <div className="text-center space-y-1">
            <h2 className="text-lg font-bold text-white">Gabung Turnamen</h2>
            <p className="text-xs text-slate-400">
              Masukkan kode turnamen dari Host atau link yang dibagikan.
            </p>
          </div>

          <form onSubmit={handleJoinSubmit} className="space-y-4 max-w-xs mx-auto">
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1.5 text-center">
                Kode Turnamen
              </label>
              <input
                type="text"
                required
                placeholder="Contoh: ABC-123"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-center font-mono font-black text-lg text-padel-lime tracking-widest uppercase focus:outline-none focus:border-padel-lime"
              />
            </div>

            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-padel-blue hover:bg-padel-blue/80 text-black font-extrabold text-sm shadow-lg shadow-padel-blue/20 transition active:scale-95"
            >
              <span>Masuk ke Turnamen</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>
      ) : (
        /* Create New Tournament Form */
        <form onSubmit={handleCreateSubmit} className="space-y-6">
          <div className="bg-padel-card rounded-3xl border border-padel-border p-6 shadow-2xl space-y-6">
            {/* Title */}
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1.5">Nama Turnamen</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Contoh: Friday Night Padel Americano"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-padel-lime font-medium"
              />
            </div>

            {/* Format Selection: Americano vs Mexicano */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-slate-300">Format Game</label>
                <span className="text-[11px] text-slate-400">Pilih jenis aturan rotasi</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setFormat('americano')}
                  className={`p-4 rounded-2xl border text-left transition ${
                    format === 'americano'
                      ? 'bg-padel-lime/10 border-padel-lime text-white'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-extrabold text-sm text-padel-lime">Americano</span>
                    {format === 'americano' && <CheckCircle2 className="w-4 h-4 text-padel-lime" />}
                  </div>
                  <p className="text-xs text-slate-300">
                    Rotasi fair: semua pemain bertukar partner dan lawan secara merata tanpa pasangan berulang.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setFormat('mexicano')}
                  className={`p-4 rounded-2xl border text-left transition ${
                    format === 'mexicano'
                      ? 'bg-padel-blue/10 border-padel-blue text-white'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-extrabold text-sm text-padel-blue">Mexicano</span>
                    {format === 'mexicano' && <CheckCircle2 className="w-4 h-4 text-padel-blue" />}
                  </div>
                  <p className="text-xs text-slate-300">
                    Rotasi dinamis: pairing otomatis berdasarkan peringkat klasemen (Top vs Top, pertarungan seimbang).
                  </p>
                </button>
              </div>
            </div>

            {/* Game Mode */}
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-2">Mode Permainan</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'doubles', label: 'Doubles (4/Court)', desc: 'Individu rotasi partner' },
                  { id: 'singles', label: 'Singles (2/Court)', desc: '1 vs 1 tunggal' },
                  { id: 'fixed_partner', label: 'Fixed Partner (2v2)', desc: 'Tim pasangan tetap' }
                ].map(m => (
                  <button
                    type="button"
                    key={m.id}
                    onClick={() => setGameMode(m.id)}
                    className={`p-3 rounded-xl border text-left transition ${
                      gameMode === m.id
                        ? 'bg-slate-800 border-padel-lime text-white'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-850'
                    }`}
                  >
                    <span className="font-bold text-xs block text-slate-200">{m.label}</span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">{m.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Courts, Points, Duration, PIN */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Jumlah Lapangan</label>
                <select
                  value={courtCount}
                  onChange={(e) => setCourtCount(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-padel-lime font-mono font-bold"
                >
                  {[1, 2, 3, 4, 5, 6, 8].map(c => (
                    <option key={c} value={c}>{c} Lapangan</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Target Poin</label>
                <select
                  value={pointsTarget}
                  onChange={(e) => setPointsTarget(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-padel-lime font-mono font-bold"
                >
                  <option value={16}>16 Poin</option>
                  <option value={21}>21 Poin</option>
                  <option value={24}>24 Poin (Standar)</option>
                  <option value={32}>32 Poin</option>
                  <option value={6}>6 Games (1 Set)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Durasi Ronde</label>
                <select
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-padel-lime font-mono font-bold"
                >
                  <option value={10}>10 Menit</option>
                  <option value={12}>12 Menit</option>
                  <option value={15}>15 Menit</option>
                  <option value={20}>20 Menit</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">PIN Multi-Host</label>
                <input
                  type="text"
                  maxLength={6}
                  value={hostPin}
                  onChange={(e) => setHostPin(e.target.value)}
                  placeholder="1234"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-padel-lime font-mono font-bold tracking-widest text-center"
                />
              </div>
            </div>

            {/* Permission Toggle */}
            <div className="pt-2">
              <label className="flex items-center gap-2.5 text-xs text-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={allowPlayerScoreEntry}
                  onChange={(e) => setAllowPlayerScoreEntry(e.target.checked)}
                  className="accent-padel-lime w-4 h-4 rounded"
                />
                <span>Izinkan pemain memasukkan / konfirmasi skor dari HP masing-masing</span>
              </label>
            </div>
          </div>

          {/* Player Roster Setup Section */}
          <div className="bg-padel-card rounded-3xl border border-padel-border p-6 shadow-2xl space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-base text-white">Daftar Pemain Awal</h3>
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-full bg-slate-800 text-padel-lime border border-slate-700">
                    {players.length} Pemain
                  </span>
                </div>
                <span className="text-xs text-slate-400">
                  {gameMode === 'doubles' ? `Untuk ${courtCount} lapangan, butuh minimal ${courtCount * 4} pemain (kelebihan akan auto-rest bergantian).` : ''}
                </span>
              </div>

              {/* Roster presets & import */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => setPlayers(SAMPLE_PLAYERS_8)}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700"
                >
                  8 Pemain
                </button>
                <button
                  type="button"
                  onClick={() => setPlayers(SAMPLE_PLAYERS_12)}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700"
                >
                  12 Pemain
                </button>
                <button
                  type="button"
                  onClick={() => setIsImportModalOpen(true)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-950/60 text-emerald-400 hover:bg-emerald-900 border border-emerald-500/40 text-xs font-bold"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Import Excel / Reclub</span>
                </button>
              </div>
            </div>

            {/* Quick Add Player Row */}
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Tambah nama pemain..."
                value={newPlayerName}
                onChange={(e) => setNewPlayerName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddPlayer();
                  }
                }}
                className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-padel-lime"
              />
              <select
                value={newPlayerSkill}
                onChange={(e) => setNewPlayerSkill(e.target.value)}
                className="bg-slate-900 border border-slate-700 text-xs rounded-xl px-2 py-2 text-slate-300"
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
                <option value="pro">Pro</option>
              </select>
              <button
                type="button"
                onClick={handleAddPlayer}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center gap-1 border border-slate-700"
              >
                <Plus className="w-3.5 h-3.5" /> Tambah
              </button>
            </div>

            {/* Players Tag Grid */}
            <div className="max-h-60 overflow-y-auto p-2 rounded-2xl bg-slate-950 border border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-2">
              {players.map((p, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2 rounded-xl bg-slate-900/90 border border-slate-800 text-xs text-slate-200"
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className="font-mono text-slate-500 text-[10px] w-4">{idx + 1}.</span>
                    <span className="font-bold truncate">{p.name}</span>
                    <span className="text-[10px] font-mono text-slate-400 capitalize">({p.skillLevel})</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemovePlayer(idx)}
                    className="p-1 text-slate-500 hover:text-rose-400"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="w-full py-4 rounded-2xl bg-padel-lime hover:bg-padel-lime-dark text-black font-black text-base shadow-xl shadow-padel-lime/20 transition active:scale-98 flex items-center justify-center gap-2"
          >
            <Sparkles className="w-5 h-5" />
            <span>Mulai Turnamen & Generate Round 1</span>
          </button>
        </form>
      )}

      {/* Import Modal */}
      <ImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImportPlayers={handleImport}
      />
    </div>
  );
}
