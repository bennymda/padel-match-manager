import React, { useState, useEffect } from 'react';
import { 
  X, 
  Database, 
  Trophy, 
  Calendar, 
  Users, 
  ChevronDown, 
  ChevronUp, 
  Download, 
  Search, 
  Award, 
  TrendingUp, 
  Flame,
  Layers,
  ArrowRight
} from 'lucide-react';
import * as XLSX from 'xlsx';

export default function HistoryModal({
  isOpen,
  onClose,
  currentUser,
  onLoadTournament
}) {
  const [activeTab, setActiveTab] = useState('tournaments'); // 'tournaments' | 'career'
  const [historyList, setHistoryList] = useState([]);
  const [careerData, setCareerData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [expandedCode, setExpandedCode] = useState(null);

  useEffect(() => {
    if (isOpen) {
      loadHistory();
      if (currentUser?.id || currentUser?.name) {
        loadCareer(currentUser.id || currentUser.name);
      }
    }
  }, [isOpen, currentUser]);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/history');
      const data = await res.json();
      if (data.success && data.history) {
        setHistoryList(data.history);
      }
    } catch (err) {
      console.error('Failed to load history:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadCareer = async (idOrName) => {
    try {
      const res = await fetch(`/api/players/${encodeURIComponent(idOrName)}/career`);
      const data = await res.json();
      if (data.success) {
        setCareerData(data);
      }
    } catch (err) {
      console.error('Failed to load career:', err);
    }
  };

  if (!isOpen) return null;

  const filteredHistory = historyList.filter(t => 
    t.title.toLowerCase().includes(search.toLowerCase()) ||
    t.code.toLowerCase().includes(search.toLowerCase()) ||
    (t.winner?.name && t.winner.name.toLowerCase().includes(search.toLowerCase()))
  );

  const exportArchiveToExcel = (tournament) => {
    const data = (tournament.leaderboard || []).map((p, idx) => ({
      Rank: idx + 1,
      Name: p.name,
      'Points Won': p.pointsWon,
      'Points Conceded': p.pointsConceded,
      'Point Diff': p.pointDifferential,
      'Points Per Match (PPR)': p.pointsPerMatch,
      Played: p.matchesPlayed,
      Won: p.matchesWon,
      Lost: p.matchesLost,
      'Win Rate': `${p.winRate}%`,
      MMR: p.currentMMR
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Final Standings');
    XLSX.writeFile(wb, `${tournament.title.replace(/\s+/g, '_')}_${tournament.code}_Archive.xlsx`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fade-in">
      <div className="bg-padel-card border border-padel-border rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 border-b border-padel-border flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Database Riwayat Turnamen</h3>
              <span className="text-[11px] text-slate-400">Arsip turnamen tersimpan & statistik karier pemain</span>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switch */}
        <div className="flex border-b border-padel-border bg-slate-950/60 p-1">
          <button
            onClick={() => setActiveTab('tournaments')}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition ${
              activeTab === 'tournaments'
                ? 'bg-slate-800 text-padel-lime shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            🏆 Riwayat Turnamen ({historyList.length})
          </button>
          {currentUser && (
            <button
              onClick={() => setActiveTab('career')}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition ${
                activeTab === 'career'
                  ? 'bg-slate-800 text-padel-blue shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              ⭐ Statistik Karier ({currentUser.name})
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto flex-1 space-y-4">
          {activeTab === 'tournaments' && (
            <>
              {/* Search */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Cari arsip turnamen atau nama pemenang..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-padel-lime"
                />
              </div>

              {loading ? (
                <div className="p-8 text-center text-xs text-slate-400">Memuat data arsip...</div>
              ) : filteredHistory.length === 0 ? (
                <div className="p-8 text-center text-slate-400 space-y-2 bg-slate-900/40 rounded-2xl border border-slate-800">
                  <Database className="w-8 h-8 mx-auto text-slate-600" />
                  <p className="text-sm font-semibold text-slate-300">Belum Ada Turnamen yang Diarsipkan</p>
                  <p className="text-xs text-slate-500">
                    Selesaikan pertandingan turnamen untuk menyimpannya ke database riwayat permanen.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredHistory.map((t) => {
                    const isExpanded = expandedCode === t.code;
                    return (
                      <div
                        key={t.code}
                        className="bg-slate-900/80 border border-slate-800 hover:border-slate-700 rounded-2xl overflow-hidden transition"
                      >
                        <div
                          onClick={() => setExpandedCode(isExpanded ? null : t.code)}
                          className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 cursor-pointer"
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm text-white truncate">{t.title}</span>
                              <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-padel-lime border border-slate-700">
                                {t.code}
                              </span>
                              <span className="text-[10px] uppercase font-bold text-padel-blue bg-padel-blue/10 px-2 py-0.5 rounded border border-padel-blue/20">
                                {t.format}
                              </span>
                            </div>

                            <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3 text-slate-500" />
                                {new Date(t.completedAt || t.createdAt).toLocaleDateString('id-ID', {
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric'
                                })}
                              </span>
                              <span>•</span>
                              <span>{t.totalPlayers} Pemain</span>
                              <span>•</span>
                              <span>{t.totalRounds} Ronde</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800">
                            {t.winner && (
                              <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold">
                                <span>🥇 {t.winner.name}</span>
                                <span className="font-mono text-[10px] text-amber-400/80">({t.winner.points} pts)</span>
                              </div>
                            )}
                            {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                          </div>
                        </div>

                        {/* Expanded details */}
                        {isExpanded && (
                          <div className="p-4 bg-slate-950 border-t border-slate-800 space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-slate-300">Klasemen Akhir Turnamen:</span>
                              <button
                                onClick={() => exportArchiveToExcel(t)}
                                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700"
                              >
                                <Download className="w-3.5 h-3.5 text-emerald-400" />
                                <span>Export Excel</span>
                              </button>
                            </div>

                            <div className="max-h-48 overflow-y-auto space-y-1">
                              {(t.leaderboard || []).map((p, idx) => (
                                <div
                                  key={idx}
                                  className="flex items-center justify-between p-2 rounded-xl bg-slate-900 border border-slate-800/80 text-xs"
                                >
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono text-slate-500 w-4 font-bold">#{idx + 1}</span>
                                    <span className="font-bold text-slate-200">{p.name}</span>
                                  </div>
                                  <div className="flex items-center gap-3 font-mono">
                                    <span className="text-padel-lime font-bold">{p.pointsWon} Pts</span>
                                    <span className="text-amber-300 text-[11px]">{p.currentMMR} MMR</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* CAREER TAB */}
          {activeTab === 'career' && currentUser && (
            <div className="space-y-4">
              {/* Profile Card */}
              <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 border border-padel-border flex items-center justify-between">
                <div className="flex items-center gap-3.5">
                  <img
                    src={currentUser.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(currentUser.name)}`}
                    alt={currentUser.name}
                    className="w-14 h-14 rounded-2xl border-2 border-padel-lime shadow-md object-cover"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-black text-base text-white">{currentUser.name}</h4>
                      <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-padel-lime/20 text-padel-lime border border-padel-lime/30 capitalize">
                        {currentUser.role}
                      </span>
                    </div>
                    <span className="text-xs text-slate-400 block">{currentUser.email}</span>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs font-mono font-bold text-amber-300">
                        {currentUser.mmr || 1200} MMR
                      </span>
                      <span className="text-[10px] text-slate-500 capitalize">({currentUser.skillLevel})</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Career Stats Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-center">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Turnamen</span>
                  <span className="font-mono text-xl font-black text-white">
                    {currentUser.stats?.tournamentsPlayed || careerData?.historyParticipations?.length || 0}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-center">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Match</span>
                  <span className="font-mono text-xl font-black text-padel-blue">
                    {currentUser.stats?.matchesPlayed || 0}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-center">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Win Rate</span>
                  <span className="font-mono text-xl font-black text-emerald-400">
                    {currentUser.stats?.matchesPlayed > 0 
                      ? Math.round((currentUser.stats.matchesWon / currentUser.stats.matchesPlayed) * 100) 
                      : 0}%
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-center">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Poin</span>
                  <span className="font-mono text-xl font-black text-padel-lime">
                    {currentUser.stats?.totalPointsWon || 0}
                  </span>
                </div>
              </div>

              {/* Tournament participations */}
              <div>
                <span className="text-xs font-bold text-slate-300 block mb-2">Riwayat Partisipasi Turnamen:</span>
                {careerData?.historyParticipations?.length > 0 ? (
                  <div className="space-y-2 max-h-52 overflow-y-auto">
                    {careerData.historyParticipations.map((part, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between text-xs"
                      >
                        <div>
                          <span className="font-bold text-white block">{part.tournamentTitle}</span>
                          <span className="text-[10px] text-slate-400">
                            {new Date(part.completedAt).toLocaleDateString('id-ID')} • {part.format}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="font-bold text-amber-300">Rank #{part.rank}</span>
                          <span className="text-[10px] text-slate-400 block font-mono">
                            {part.points} Pts ({part.mmr} MMR)
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 italic">Belum ada turnamen yang diselesaikan oleh akun ini.</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
