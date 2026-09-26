import React, { useState } from 'react';
import { 
  Users, 
  UserPlus, 
  FileSpreadsheet, 
  UserCheck, 
  Coffee, 
  Clock, 
  HeartCrack, 
  ArrowLeftRight,
  Shield,
  Search,
  Sparkles
} from 'lucide-react';

export default function PlayerRoster({
  players = [],
  isHost,
  onUpdateStatus,
  onOpenAddPlayer,
  onOpenSubstitute,
  onOpenImport
}) {
  const [search, setSearch] = useState('');

  const filtered = players.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const getStatusBadge = (status) => {
    switch (status) {
      case 'resting':
        return (
          <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
            <Coffee className="w-2.5 h-2.5" /> Rehat / Bye
          </span>
        );
      case 'late':
        return (
          <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
            <Clock className="w-2.5 h-2.5" /> Belum Datang
          </span>
        );
      case 'injured':
        return (
          <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
            <HeartCrack className="w-2.5 h-2.5" /> Cedera
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            <UserCheck className="w-2.5 h-2.5" /> Aktif
          </span>
        );
    }
  };

  return (
    <div className="bg-padel-card rounded-2xl border border-padel-border overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-padel-border flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <div className="w-9 h-9 rounded-xl bg-padel-blue/10 border border-padel-blue/30 flex items-center justify-center text-padel-blue">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-base text-white">Daftar Pemain</h3>
              <span className="text-xs font-mono font-bold px-2 py-0.2 rounded-full bg-slate-800 text-padel-blue border border-slate-700">
                {players.length} Pemain
              </span>
            </div>
            <span className="text-xs text-slate-400">Atur rest, pemain belum datang, sub & import</span>
          </div>
        </div>

        {/* Action Buttons for Host */}
        {isHost && (
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap">
            <button
              onClick={onOpenImport}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition active:scale-95"
              title="Import dari Excel atau Reclub"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              <span>Import Excel / Reclub</span>
            </button>
            <button
              onClick={onOpenAddPlayer}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-padel-lime hover:bg-padel-lime-dark text-black text-xs font-bold transition active:scale-95 shadow-md shadow-padel-lime/20"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Tambah Pemain</span>
            </button>
          </div>
        )}
      </div>

      {/* Search Input */}
      <div className="p-3 border-b border-padel-border bg-slate-950/40">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari pemain di roster..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-padel-lime"
          />
        </div>
      </div>

      {/* Player List */}
      <div className="divide-y divide-slate-800/60 max-h-[500px] overflow-y-auto">
        {filtered.map(player => (
          <div key={player.id} className="p-3.5 flex items-center justify-between gap-3 hover:bg-slate-800/30 transition">
            <div className="flex items-center gap-3 min-w-0">
              <img
                src={player.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(player.name)}`}
                alt={player.name}
                className="w-9 h-9 rounded-full border border-slate-700 bg-slate-900 flex-shrink-0"
              />
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-slate-200 truncate">{player.name}</span>
                  {getStatusBadge(player.status)}
                </div>
                <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                  <span className="capitalize">{player.skillLevel || 'Intermediate'}</span>
                  <span>•</span>
                  <span className="font-mono text-amber-300">{player.mmr || 1200} MMR</span>
                  {player.joinedRound > 1 && (
                    <>
                      <span>•</span>
                      <span className="text-padel-blue">Gabung R{player.joinedRound}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Actions */}
            {isHost && (
              <div className="flex items-center gap-2 flex-shrink-0">
                {/* Status Selector */}
                <select
                  value={player.status || 'active'}
                  onChange={(e) => onUpdateStatus(player.id, e.target.value)}
                  className="bg-slate-900 border border-slate-700 text-xs rounded-lg px-2 py-1 text-slate-300 focus:outline-none focus:border-padel-lime"
                >
                  <option value="active">🟢 Main (Aktif)</option>
                  <option value="resting">🟡 Rest / Istirahat</option>
                  <option value="late">⏰ Belum Datang</option>
                  <option value="injured">🔴 Cedera</option>
                </select>

                {/* Substitute Button */}
                <button
                  onClick={() => onOpenSubstitute(player)}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition"
                  title="Ganti dengan Pemain Cadangan (Substitute)"
                >
                  <ArrowLeftRight className="w-3.5 h-3.5 text-purple-400" />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
