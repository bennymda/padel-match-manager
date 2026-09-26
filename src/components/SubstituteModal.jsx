import React, { useState } from 'react';
import { X, ArrowLeftRight, AlertCircle, HeartCrack } from 'lucide-react';
import { SKILL_LEVEL_MMR } from '../services/constants.js';

export default function SubstituteModal({
  isOpen,
  onClose,
  targetPlayer,
  onSubstitute,
  currentRoundInProgress = false
}) {
  const [subName, setSubName] = useState('');
  const [skillLevel, setSkillLevel] = useState(targetPlayer?.skillLevel || 'intermediate');
  const [applyToCurrentRound, setApplyToCurrentRound] = useState(currentRoundInProgress);
  const [keepPoints, setKeepPoints] = useState(true);

  if (!isOpen || !targetPlayer) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!subName.trim()) return;

    onSubstitute({
      originalPlayerId: targetPlayer.id,
      subData: {
        name: subName.trim(),
        skillLevel,
        initialMMR: SKILL_LEVEL_MMR[skillLevel] || targetPlayer.mmr || 1200
      },
      options: {
        applyToCurrentRound,
        keepPoints
      }
    });

    setSubName('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-padel-card border border-padel-border rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
        <div className="p-4 border-b border-padel-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-purple-500/20 flex items-center justify-center text-purple-400 font-bold">
              <ArrowLeftRight className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">Substitute / Ganti Pemain</h3>
              <span className="text-[11px] text-slate-400">Pemain cedera atau izin keluar</span>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Target Player Card */}
          <div className="p-3 rounded-xl bg-rose-950/20 border border-rose-500/40 flex items-center gap-3">
            <HeartCrack className="w-5 h-5 text-rose-400 flex-shrink-0" />
            <div className="min-w-0">
              <span className="text-[10px] uppercase font-bold text-rose-300 block">Pemain yang diganti:</span>
              <span className="text-sm font-bold text-white truncate block">{targetPlayer.name}</span>
              <span className="text-[10px] text-slate-400">{targetPlayer.mmr || 1200} MMR • {targetPlayer.status}</span>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1.5">Nama Pemain Cadangan (Substitute)</label>
            <input
              type="text"
              required
              placeholder="Contoh: Hendra Setiawan"
              value={subName}
              onChange={(e) => setSubName(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-400"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1.5">Skill Level Pemain Cadangan</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'beginner', label: 'Beginner', mmr: 1000 },
                { id: 'intermediate', label: 'Intermediate', mmr: 1200 },
                { id: 'advanced', label: 'Advanced', mmr: 1450 },
                { id: 'pro', label: 'Pro', mmr: 1700 }
              ].map(lvl => (
                <button
                  type="button"
                  key={lvl.id}
                  onClick={() => setSkillLevel(lvl.id)}
                  className={`p-2.5 rounded-xl border text-left transition ${
                    skillLevel === lvl.id
                      ? 'bg-purple-500/10 border-purple-400 text-purple-300'
                      : 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <span className="text-xs font-bold block">{lvl.label}</span>
                  <span className="text-[10px] font-mono text-slate-400">{lvl.mmr} MMR</span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2 pt-1 border-t border-slate-800">
            {currentRoundInProgress && (
              <label className="flex items-center gap-2 text-xs text-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={applyToCurrentRound}
                  onChange={(e) => setApplyToCurrentRound(e.target.checked)}
                  className="accent-purple-500 rounded"
                />
                <span>Langsung masukkan pemain cadangan ke lapangan ronde saat ini</span>
              </label>
            )}

            <label className="flex items-center gap-2 text-xs text-slate-200 cursor-pointer">
              <input
                type="checkbox"
                checked={keepPoints}
                onChange={(e) => setKeepPoints(e.target.checked)}
                className="accent-purple-500 rounded"
              />
              <span>Warisi poin & riwayat klasemen dari pemain sebelumnya</span>
            </label>
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-600/20"
            >
              Simpan Pergantian
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
