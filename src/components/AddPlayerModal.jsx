import React, { useState } from 'react';
import { X, UserPlus, Scale, Shield, Sparkles } from 'lucide-react';
import { SKILL_LEVEL_MMR } from '../services/constants.js';

export default function AddPlayerModal({
  isOpen,
  onClose,
  onAddPlayer,
  currentRoundNumber = 1,
  averageTournamentPoints = 0
}) {
  const [name, setName] = useState('');
  const [skillLevel, setSkillLevel] = useState('intermediate');
  const [pointMode, setPointMode] = useState(currentRoundNumber > 1 ? 'average' : 'zero');
  const [customPoints, setCustomPoints] = useState(0);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    onAddPlayer({
      playerData: {
        name: name.trim(),
        skillLevel,
        initialMMR: SKILL_LEVEL_MMR[skillLevel] || 1200
      },
      options: {
        pointMode,
        customPoints: pointMode === 'custom' ? Number(customPoints) : undefined
      }
    });

    setName('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-padel-card border border-padel-border rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
        <div className="p-4 border-b border-padel-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-padel-lime/20 flex items-center justify-center text-padel-lime font-bold">
              <UserPlus className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">Tambah Pemain Baru</h3>
              <span className="text-[11px] text-slate-400">
                {currentRoundNumber > 1 ? `Gabung di tengah turnamen (Round ${currentRoundNumber})` : 'Registrasi pemain awal'}
              </span>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1.5">Nama Pemain</label>
            <input
              type="text"
              required
              placeholder="Contoh: Budi Santoso"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-padel-lime"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1.5">Skill Level / Baseline MMR</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'beginner', label: 'Beginner', mmr: 1000 },
                { id: 'intermediate', label: 'Intermediate', mmr: 1200 },
                { id: 'advanced', label: 'Advanced', mmr: 1450 },
                { id: 'pro', label: 'Pro / Expert', mmr: 1700 }
              ].map(lvl => (
                <button
                  type="button"
                  key={lvl.id}
                  onClick={() => setSkillLevel(lvl.id)}
                  className={`p-2.5 rounded-xl border text-left transition ${
                    skillLevel === lvl.id
                      ? 'bg-padel-lime/10 border-padel-lime text-padel-lime'
                      : 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <span className="text-xs font-bold block">{lvl.label}</span>
                  <span className="text-[10px] font-mono text-slate-400">{lvl.mmr} MMR</span>
                </button>
              ))}
            </div>
          </div>

          {/* Fairness Setting for Mid-Match Join */}
          {currentRoundNumber > 1 && (
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-padel-lime">
                <Scale className="w-4 h-4" />
                <span>Kompensasi Poin (Fairness Mid-Match)</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Pemain bergabung di ronde {currentRoundNumber}. Tentukan poin awal agar tetap adil:
              </p>

              <div className="space-y-1.5 pt-1">
                <label className="flex items-center gap-2 text-xs text-slate-200 cursor-pointer">
                  <input
                    type="radio"
                    name="pointMode"
                    value="average"
                    checked={pointMode === 'average'}
                    onChange={() => setPointMode('average')}
                    className="accent-padel-lime"
                  />
                  <span>
                    Beri Poin Rata-Rata Turnamen (<strong className="text-padel-lime font-mono">+{averageTournamentPoints} Poin</strong>)
                  </span>
                </label>

                <label className="flex items-center gap-2 text-xs text-slate-200 cursor-pointer">
                  <input
                    type="radio"
                    name="pointMode"
                    value="zero"
                    checked={pointMode === 'zero'}
                    onChange={() => setPointMode('zero')}
                    className="accent-padel-lime"
                  />
                  <span>Mulai dari 0 Poin (Peringkat mengacu ke PPR / Poin per match)</span>
                </label>

                <label className="flex items-center gap-2 text-xs text-slate-200 cursor-pointer">
                  <input
                    type="radio"
                    name="pointMode"
                    value="custom"
                    checked={pointMode === 'custom'}
                    onChange={() => setPointMode('custom')}
                    className="accent-padel-lime"
                  />
                  <span>Custom Poin:</span>
                  {pointMode === 'custom' && (
                    <input
                      type="number"
                      value={customPoints}
                      onChange={(e) => setCustomPoints(e.target.value)}
                      className="w-16 bg-slate-950 border border-slate-700 rounded px-2 py-0.5 text-xs text-padel-lime font-mono ml-1"
                    />
                  )}
                </label>
              </div>
            </div>
          )}

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
              className="px-5 py-2 rounded-xl text-xs font-bold bg-padel-lime hover:bg-padel-lime-dark text-black shadow-lg shadow-padel-lime/20"
            >
              Tambahkan ke Turnamen
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
