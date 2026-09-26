import React, { useState } from 'react';
import { History, ChevronDown, ChevronUp, Check, Edit2, Coffee } from 'lucide-react';

export default function RoundHistory({
  rounds = [],
  playerMap,
  isHost,
  onSubmitScore,
  pointsTarget = 24
}) {
  const [expandedRound, setExpandedRound] = useState(null);

  if (rounds.length === 0) return null;

  return (
    <div className="bg-padel-card rounded-2xl border border-padel-border overflow-hidden">
      <div className="p-4 border-b border-padel-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-slate-800 flex items-center justify-center text-slate-300">
            <History className="w-4 h-4 text-padel-blue" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-white">Riwayat Pertandingan ({rounds.length} Ronde)</h3>
            <span className="text-[11px] text-slate-400">Hasil pertandingan ronde terdahulu</span>
          </div>
        </div>
      </div>

      <div className="divide-y divide-slate-800/60">
        {rounds.slice().reverse().map((round) => {
          const isExpanded = expandedRound === round.roundNumber;
          const byePlayers = (round.byes || []).map(id => playerMap.get(id)).filter(Boolean);

          return (
            <div key={round.roundNumber} className="transition">
              {/* Round Summary Bar */}
              <div
                onClick={() => setExpandedRound(isExpanded ? null : round.roundNumber)}
                className="p-3.5 flex items-center justify-between cursor-pointer hover:bg-slate-800/40"
              >
                <div className="flex items-center gap-2.5">
                  <span className="font-mono text-xs font-black px-2.5 py-1 rounded-lg bg-slate-800 text-padel-lime border border-slate-700">
                    Round {round.roundNumber}
                  </span>
                  <span className="text-xs text-slate-300 font-semibold">
                    {round.matches?.length || 0} Lapangan
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    round.status === 'completed'
                      ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-500/30'
                      : 'bg-amber-950/60 text-amber-400 border border-amber-500/30'
                  }`}>
                    {round.status === 'completed' ? 'Selesai' : 'Sedang Main'}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  {byePlayers.length > 0 && (
                    <span className="hidden sm:inline-flex items-center gap-1 text-[11px] text-amber-300/80">
                      <Coffee className="w-3 h-3" /> {byePlayers.length} Rest
                    </span>
                  )}
                  {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                </div>
              </div>

              {/* Expanded Match Cards */}
              {isExpanded && (
                <div className="p-4 bg-slate-950/60 border-t border-slate-800/60 space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {round.matches.map(m => {
                      const t1Names = (m.team1 || []).map(id => playerMap.get(id)?.name || 'Unknown').join(' & ');
                      const t2Names = (m.team2 || []).map(id => playerMap.get(id)?.name || 'Unknown').join(' & ');

                      return (
                        <div key={m.id} className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs">
                          <div className="min-w-0 flex-1 pr-2">
                            <span className="text-[10px] font-mono text-slate-500 block mb-0.5">Court {m.courtNumber}</span>
                            <div className="flex items-center justify-between font-bold text-slate-200">
                              <span className="truncate">{t1Names}</span>
                              <span className="font-mono text-padel-lime ml-2 text-sm">{m.team1Score}</span>
                            </div>
                            <div className="flex items-center justify-between font-bold text-slate-200 mt-1">
                              <span className="truncate">{t2Names}</span>
                              <span className="font-mono text-padel-blue ml-2 text-sm">{m.team2Score}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {byePlayers.length > 0 && (
                    <div className="p-2.5 rounded-xl bg-amber-950/20 border border-amber-500/20 text-xs text-amber-300/90 flex items-center gap-2">
                      <Coffee className="w-4 h-4 flex-shrink-0" />
                      <span>
                        Pemain Istirahat / BYE: <strong>{byePlayers.map(p => p.name).join(', ')}</strong>
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
