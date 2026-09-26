import React, { useState, useEffect } from 'react';
import { Check, Edit2, ShieldAlert, Award, ChevronUp, ChevronDown } from 'lucide-react';
import { sounds } from '../services/audio.js';

export default function CourtCard({
  match,
  roundNumber,
  playerMap,
  isHost,
  canSubmitScore,
  currentUserId,
  onSubmitScore,
  pointsTarget = 24
}) {
  const [score1, setScore1] = useState(match.team1Score || 0);
  const [score2, setScore2] = useState(match.team2Score || 0);
  const [isEditing, setIsEditing] = useState(match.status !== 'completed');

  useEffect(() => {
    setScore1(match.team1Score || 0);
    setScore2(match.team2Score || 0);
    setIsEditing(match.status !== 'completed');
  }, [match.team1Score, match.team2Score, match.status]);

  const team1Players = (match.team1 || []).map(id => playerMap.get(id)).filter(Boolean);
  const team2Players = (match.team2 || []).map(id => playerMap.get(id)).filter(Boolean);

  const isUserInMatch = [...match.team1, ...match.team2].includes(currentUserId);
  const isCompleted = match.status === 'completed';

  const handleScore1Change = (val) => {
    const s1 = Math.max(0, val);
    setScore1(s1);
    // If Americano fixed points target, auto calculate team 2 score!
    if (pointsTarget && pointsTarget > 0 && s1 <= pointsTarget) {
      setScore2(pointsTarget - s1);
    }
    sounds.playScoreBlip();
  };

  const handleScore2Change = (val) => {
    const s2 = Math.max(0, val);
    setScore2(s2);
    if (pointsTarget && pointsTarget > 0 && s2 <= pointsTarget) {
      setScore1(pointsTarget - s2);
    }
    sounds.playScoreBlip();
  };

  const setPreset = (s1, s2) => {
    setScore1(s1);
    setScore2(s2);
    sounds.playScoreBlip();
  };

  const handleSave = () => {
    onSubmitScore({
      roundNumber,
      matchId: match.id,
      team1Score: score1,
      team2Score: score2
    });
    setIsEditing(false);
  };

  // Generate smart presets based on pointsTarget
  const presets = pointsTarget === 32 ? [
    [16, 16], [18, 14], [20, 12], [22, 10], [24, 8], [28, 4]
  ] : pointsTarget === 24 ? [
    [12, 12], [14, 10], [16, 8], [18, 6], [20, 4], [22, 2]
  ] : pointsTarget === 16 ? [
    [8, 8], [10, 6], [12, 4], [14, 2], [16, 0]
  ] : [
    [6, 4], [6, 3], [6, 2], [6, 1], [6, 0]
  ];

  return (
    <div className={`rounded-2xl border transition-all duration-200 relative overflow-hidden ${
      isUserInMatch
        ? 'bg-slate-900/90 border-padel-lime shadow-lg shadow-padel-lime/10'
        : 'bg-padel-card border-padel-border hover:border-slate-700'
    }`}>
      {/* Top Header */}
      <div className="bg-slate-950/60 px-4 py-2.5 border-b border-padel-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-black px-2 py-0.5 rounded bg-padel-lime text-black uppercase tracking-wider">
            Court {match.courtNumber}
          </span>
          {isUserInMatch && (
            <span className="text-[11px] font-bold text-padel-blue bg-padel-blue/10 border border-padel-blue/30 px-2 py-0.5 rounded-full flex items-center gap-1 animate-pulse">
              🎾 Lapangan Anda
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-400 text-[11px]">
            Target: <strong className="text-slate-200 font-mono">{pointsTarget} Poin</strong>
          </span>
          {isCompleted && (
            <span className="text-[11px] font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-500/40 px-2 py-0.5 rounded-full flex items-center gap-1">
              <Check className="w-3 h-3" /> Selesai
            </span>
          )}
        </div>
      </div>

      {/* Teams & Score Section */}
      <div className="p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-center">
          {/* Team 1 */}
          <div className={`p-3 rounded-xl border transition ${
            score1 > score2 && isCompleted
              ? 'bg-emerald-950/20 border-emerald-500/50'
              : 'bg-slate-900/50 border-slate-800'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tim 1</span>
              {score1 > score2 && isCompleted && (
                <Award className="w-4 h-4 text-padel-lime" />
              )}
            </div>
            <div className="space-y-1.5 mb-3">
              {team1Players.map(p => (
                <div key={p.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <img
                      src={p.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(p.name)}`}
                      alt={p.name}
                      className="w-6 h-6 rounded-full border border-slate-700 bg-slate-800"
                    />
                    <span className={`text-sm font-semibold truncate max-w-[130px] ${
                      p.id === currentUserId ? 'text-padel-lime font-bold' : 'text-slate-200'
                    }`}>
                      {p.name}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-500">{p.mmr || 1200} MMR</span>
                </div>
              ))}
            </div>

            {/* Score Control */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
              <span className="text-xs text-slate-400">Skor:</span>
              {isEditing && (isHost || canSubmitScore) ? (
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleScore1Change(score1 - 1)}
                    className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center justify-center font-bold"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    value={score1}
                    onChange={(e) => handleScore1Change(parseInt(e.target.value) || 0)}
                    className="w-12 h-8 text-center font-mono font-black text-lg bg-slate-950 border border-slate-700 rounded-lg text-padel-lime focus:outline-none focus:border-padel-lime"
                  />
                  <button
                    onClick={() => handleScore1Change(score1 + 1)}
                    className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center justify-center font-bold"
                  >
                    +
                  </button>
                </div>
              ) : (
                <span className="font-mono text-2xl font-black text-padel-lime">{score1}</span>
              )}
            </div>
          </div>

          {/* Team 2 */}
          <div className={`p-3 rounded-xl border transition ${
            score2 > score1 && isCompleted
              ? 'bg-emerald-950/20 border-emerald-500/50'
              : 'bg-slate-900/50 border-slate-800'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tim 2</span>
              {score2 > score1 && isCompleted && (
                <Award className="w-4 h-4 text-padel-lime" />
              )}
            </div>
            <div className="space-y-1.5 mb-3">
              {team2Players.map(p => (
                <div key={p.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <img
                      src={p.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(p.name)}`}
                      alt={p.name}
                      className="w-6 h-6 rounded-full border border-slate-700 bg-slate-800"
                    />
                    <span className={`text-sm font-semibold truncate max-w-[130px] ${
                      p.id === currentUserId ? 'text-padel-lime font-bold' : 'text-slate-200'
                    }`}>
                      {p.name}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-500">{p.mmr || 1200} MMR</span>
                </div>
              ))}
            </div>

            {/* Score Control */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
              <span className="text-xs text-slate-400">Skor:</span>
              {isEditing && (isHost || canSubmitScore) ? (
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleScore2Change(score2 - 1)}
                    className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center justify-center font-bold"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    value={score2}
                    onChange={(e) => handleScore2Change(parseInt(e.target.value) || 0)}
                    className="w-12 h-8 text-center font-mono font-black text-lg bg-slate-950 border border-slate-700 rounded-lg text-padel-blue focus:outline-none focus:border-padel-blue"
                  />
                  <button
                    onClick={() => handleScore2Change(score2 + 1)}
                    className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center justify-center font-bold"
                  >
                    +
                  </button>
                </div>
              ) : (
                <span className="font-mono text-2xl font-black text-padel-blue">{score2}</span>
              )}
            </div>
          </div>
        </div>

        {/* Quick presets for Americano */}
        {isEditing && (isHost || canSubmitScore) && (
          <div className="space-y-1.5">
            <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider block">
              Quick Preset (Total {pointsTarget} pts):
            </span>
            <div className="flex flex-wrap gap-1.5">
              {presets.map(([p1, p2], idx) => (
                <button
                  key={idx}
                  onClick={() => setPreset(p1, p2)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold border transition ${
                    score1 === p1 && score2 === p2
                      ? 'bg-padel-lime text-black border-padel-lime'
                      : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 border-slate-700'
                  }`}
                >
                  {p1} - {p2}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Action Button */}
        {(isHost || canSubmitScore) && (
          <div className="pt-2 flex justify-end gap-2">
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition"
              >
                <Edit2 className="w-3.5 h-3.5" /> Edit Skor
              </button>
            ) : (
              <button
                onClick={handleSave}
                className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-5 py-2 rounded-xl bg-padel-lime hover:bg-padel-lime-dark text-black text-xs font-black shadow-lg shadow-padel-lime/20 transition active:scale-95"
              >
                <Check className="w-4 h-4" /> Simpan & Kunci Skor
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
