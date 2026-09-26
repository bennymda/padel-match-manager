import React, { useState } from 'react';
import { 
  Trophy, 
  TrendingUp, 
  TrendingDown, 
  Download, 
  Search, 
  UserCheck, 
  ShieldAlert,
  ArrowUpDown,
  Flame
} from 'lucide-react';
import * as XLSX from 'xlsx';

export default function Leaderboard({
  leaderboard = [],
  tournamentTitle = 'Padel Tournament',
  currentUserId
}) {
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('pointsWon'); // 'pointsWon' | 'pointsPerMatch' | 'currentMMR' | 'pointDifferential'
  const [sortAsc, setSortAsc] = useState(false);

  const filtered = leaderboard.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const sorted = [...filtered].sort((a, b) => {
    let valA = a[sortBy] ?? 0;
    let valB = b[sortBy] ?? 0;
    if (valA === valB) {
      return (b.pointsWon ?? 0) - (a.pointsWon ?? 0);
    }
    return sortAsc ? valA - valB : valB - valA;
  });

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortBy(field);
      setSortAsc(false);
    }
  };

  const exportToExcel = () => {
    const data = sorted.map((p, idx) => ({
      Rank: idx + 1,
      Name: p.name,
      Status: p.status,
      'Points Won': p.pointsWon,
      'Points Conceded': p.pointsConceded,
      'Point Diff': p.pointDifferential,
      'Points Per Match (PPR)': p.pointsPerMatch,
      Played: p.matchesPlayed,
      Won: p.matchesWon,
      Drawn: p.matchesDrawn,
      Lost: p.matchesLost,
      'Win Rate %': `${p.winRate}%`,
      'Matchmaking Rating (MMR)': p.currentMMR,
      'MMR Delta': p.mmrDelta >= 0 ? `+${p.mmrDelta}` : p.mmrDelta,
      'Byes (Rests)': p.byesCount
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Leaderboard');
    XLSX.writeFile(wb, `${tournamentTitle.replace(/\s+/g, '_')}_Leaderboard.xlsx`);
  };

  return (
    <div className="bg-padel-card rounded-2xl border border-padel-border overflow-hidden">
      {/* Header & Controls */}
      <div className="p-4 border-b border-padel-border flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Trophy className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-base text-white">Live Leaderboard</h3>
            <span className="text-xs text-slate-400">Peringkat real-time & MMR matchmaking</span>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          {/* Search */}
          <div className="relative flex-1 sm:w-48">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari pemain..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-padel-lime"
            />
          </div>

          {/* Export */}
          <button
            onClick={exportToExcel}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition active:scale-95"
            title="Download Excel"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden md:inline">Export Excel</span>
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-950/80 border-b border-padel-border text-slate-400 uppercase font-semibold text-[10px] tracking-wider">
              <th className="py-3 px-3 text-center w-12">Rank</th>
              <th className="py-3 px-3">Player</th>
              <th 
                onClick={() => handleSort('pointsWon')}
                className="py-3 px-3 text-right cursor-pointer hover:text-white"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Poin</span>
                  <ArrowUpDown className="w-3 h-3 text-padel-lime" />
                </div>
              </th>
              <th 
                onClick={() => handleSort('pointDifferential')}
                className="py-3 px-3 text-right cursor-pointer hover:text-white"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Diff</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th 
                onClick={() => handleSort('pointsPerMatch')}
                className="py-3 px-3 text-right cursor-pointer hover:text-white"
                title="PPR: Points Per Match (Fair metric jika jumlah match beda)"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>PPR</span>
                  <ArrowUpDown className="w-3 h-3 text-padel-blue" />
                </div>
              </th>
              <th className="py-3 px-3 text-center hidden md:table-cell">W-D-L</th>
              <th 
                onClick={() => handleSort('currentMMR')}
                className="py-3 px-3 text-right cursor-pointer hover:text-white"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>MMR</span>
                  <ArrowUpDown className="w-3 h-3 text-amber-400" />
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {sorted.map((player, index) => {
              const rank = index + 1;
              const isCurrentUser = player.id === currentUserId;
              const isTop3 = rank <= 3;

              return (
                <tr
                  key={player.id}
                  className={`transition hover:bg-slate-800/40 ${
                    isCurrentUser ? 'bg-padel-lime/5 border-l-2 border-padel-lime' : ''
                  }`}
                >
                  {/* Rank */}
                  <td className="py-3 px-3 text-center font-bold">
                    {rank === 1 ? (
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-400/20 text-amber-300 font-extrabold text-sm border border-amber-400/40">
                        1🥇
                      </span>
                    ) : rank === 2 ? (
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-300/20 text-slate-200 font-extrabold text-sm border border-slate-300/40">
                        2🥈
                      </span>
                    ) : rank === 3 ? (
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-700/20 text-amber-600 font-extrabold text-sm border border-amber-600/40">
                        3🥉
                      </span>
                    ) : (
                      <span className="font-mono text-slate-400">{rank}</span>
                    )}
                  </td>

                  {/* Player Name & Avatar */}
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-2.5">
                      <div className="relative">
                        <img
                          src={player.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(player.name)}`}
                          alt={player.name}
                          className="w-8 h-8 rounded-full border border-slate-700 bg-slate-900 object-cover"
                        />
                        {player.status === 'resting' && (
                          <span className="w-2.5 h-2.5 rounded-full bg-amber-400 absolute -bottom-0.5 -right-0.5 border-2 border-slate-900" title="Resting" />
                        )}
                        {player.status === 'injured' && (
                          <span className="w-2.5 h-2.5 rounded-full bg-rose-500 absolute -bottom-0.5 -right-0.5 border-2 border-slate-900" title="Injured" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className={`font-bold truncate ${isCurrentUser ? 'text-padel-lime' : 'text-slate-100'}`}>
                            {player.name}
                          </span>
                          {isCurrentUser && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-padel-lime/20 text-padel-lime font-bold">
                              Anda
                            </span>
                          )}
                          {player.isSubstitute && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 font-bold border border-purple-500/30">
                              Sub
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-slate-400">
                          <span className="capitalize">{player.skillLevel}</span>
                          <span>•</span>
                          <span>{player.matchesPlayed} match{player.byesCount > 0 ? ` (${player.byesCount} rest)` : ''}</span>
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Points */}
                  <td className="py-3 px-3 text-right">
                    <span className="font-mono text-sm font-black text-padel-lime">
                      {player.pointsWon}
                    </span>
                  </td>

                  {/* Point Diff */}
                  <td className="py-3 px-3 text-right font-mono">
                    <span className={`font-bold ${
                      player.pointDifferential > 0
                        ? 'text-emerald-400'
                        : player.pointDifferential < 0
                        ? 'text-rose-400'
                        : 'text-slate-400'
                    }`}>
                      {player.pointDifferential > 0 ? `+${player.pointDifferential}` : player.pointDifferential}
                    </span>
                  </td>

                  {/* Points Per Match (PPR) */}
                  <td className="py-3 px-3 text-right font-mono">
                    <span className="font-semibold text-padel-blue bg-padel-blue/10 px-1.5 py-0.5 rounded border border-padel-blue/20">
                      {player.pointsPerMatch}
                    </span>
                  </td>

                  {/* W-D-L */}
                  <td className="py-3 px-3 text-center hidden md:table-cell font-mono text-[11px] text-slate-300">
                    <span className="text-emerald-400 font-bold">{player.matchesWon}</span>-
                    <span className="text-slate-400">{player.matchesDrawn}</span>-
                    <span className="text-rose-400">{player.matchesLost}</span>
                  </td>

                  {/* MMR */}
                  <td className="py-3 px-3 text-right font-mono">
                    <div className="flex flex-col items-end">
                      <span className="font-bold text-amber-300">{player.currentMMR}</span>
                      {player.mmrDelta !== 0 && (
                        <span className={`text-[10px] flex items-center gap-0.5 ${
                          player.mmrDelta > 0 ? 'text-emerald-400' : 'text-rose-400'
                        }`}>
                          {player.mmrDelta > 0 ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
                          {player.mmrDelta > 0 ? `+${player.mmrDelta}` : player.mmrDelta}
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
