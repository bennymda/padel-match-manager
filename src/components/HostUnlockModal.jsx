import React, { useState } from 'react';
import { X, ShieldCheck, KeyRound, AlertCircle } from 'lucide-react';

export default function HostUnlockModal({
  isOpen,
  onClose,
  onVerifyHost,
  tournamentCode
}) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!pin.trim()) return;

    setLoading(true);
    setError('');

    try {
      const res = await fetch(`/api/tournaments/${tournamentCode}/verify-host`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: pin.trim() })
      });
      const data = await res.json();

      if (data.isValid) {
        onVerifyHost();
        onClose();
      } else {
        setError('PIN Host tidak sesuai. Silakan hubungi host utama.');
      }
    } catch (err) {
      setError('Gagal memverifikasi PIN.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-padel-card border border-padel-border rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl">
        <div className="p-4 border-b border-padel-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-400 font-bold">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">Multi-Host Login</h3>
              <span className="text-[11px] text-slate-400">Kelola turnamen bersama-sama</span>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <p className="text-xs text-slate-300">
            Masukkan PIN Host untuk mengaktifkan akses kontrol penuh (atur lapangan, shuffle round, edit skor, dll) dari perangkat ini.
          </p>

          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1.5">Host Passcode / PIN</label>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                placeholder="Contoh: 1234"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-sm text-white font-mono tracking-widest focus:outline-none focus:border-padel-lime"
              />
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-black shadow-lg shadow-amber-500/20 transition active:scale-95"
            >
              {loading ? 'Memverifikasi...' : 'Unlock Akses Host'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
