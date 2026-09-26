import React, { useState } from 'react';
import { X, LogIn, UserPlus, Mail, Lock, User, ShieldCheck, Sparkles, AlertCircle } from 'lucide-react';

export default function AuthModal({
  isOpen,
  onClose,
  onAuthSuccess
}) {
  const [tab, setTab] = useState('login'); // 'login' | 'register'
  
  // Login Form
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Register Form
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regRole, setRegRole] = useState('player'); // 'player' | 'host'
  const [regSkill, setRegSkill] = useState('intermediate');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail.trim(), password: loginPassword })
      });
      const data = await res.json();

      if (data.success && data.user) {
        localStorage.setItem('padel_auth_token', data.token);
        localStorage.setItem('padel_auth_user', JSON.stringify(data.user));
        onAuthSuccess(data.user);
        onClose();
      } else {
        setError(data.error || 'Login gagal');
      }
    } catch (err) {
      setError('Koneksi ke server gagal: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const avatar = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(regName.trim())}`;
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: regName.trim(),
          email: regEmail.trim(),
          password: regPassword,
          role: regRole,
          skillLevel: regSkill,
          avatar
        })
      });
      const data = await res.json();

      if (data.success && data.user) {
        localStorage.setItem('padel_auth_token', data.token);
        localStorage.setItem('padel_auth_user', JSON.stringify(data.user));
        onAuthSuccess(data.user);
        onClose();
      } else {
        setError(data.error || 'Pendaftaran gagal');
      }
    } catch (err) {
      setError('Koneksi ke server gagal: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fade-in">
      <div className="bg-padel-card border border-padel-border rounded-3xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 border-b border-padel-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-2xl bg-padel-lime/20 flex items-center justify-center text-padel-lime font-bold">
              🎾
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Akun PadelPro</h3>
              <span className="text-[11px] text-slate-400">Simpan statistik karier & database turnamen</span>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-padel-border bg-slate-950/60 p-1">
          <button
            onClick={() => { setTab('login'); setError(''); }}
            className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition ${
              tab === 'login'
                ? 'bg-slate-800 text-padel-lime shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Masuk (Login)
          </button>
          <button
            onClick={() => { setTab('register'); setError(''); }}
            className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition ${
              tab === 'register'
                ? 'bg-slate-800 text-padel-blue shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Daftar Akun Baru
          </button>
        </div>

        {/* Error message */}
        {error && (
          <div className="mx-4 mt-3 p-3 rounded-xl bg-rose-950/50 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form Body */}
        <div className="p-5 overflow-y-auto flex-1">
          {tab === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1.5">Email</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    placeholder="nama@email.com"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-padel-lime font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1.5">Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-padel-lime"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-padel-lime hover:bg-padel-lime-dark text-black font-extrabold text-xs shadow-lg shadow-padel-lime/20 transition active:scale-95 flex items-center justify-center gap-2 mt-2"
              >
                <LogIn className="w-4 h-4" />
                <span>{loading ? 'Memproses...' : 'Masuk Sekarang'}</span>
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1.5">Nama Lengkap</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Budi Santoso"
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-padel-blue font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1.5">Email</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    placeholder="budi@example.com"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-padel-blue font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1.5">Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    placeholder="Minimal 6 karakter"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-padel-blue"
                  />
                </div>
              </div>

              {/* Role selection */}
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1.5">Peran Utama</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRegRole('player')}
                    className={`p-2.5 rounded-xl border text-left transition ${
                      regRole === 'player'
                        ? 'bg-padel-blue/15 border-padel-blue text-padel-blue'
                        : 'bg-slate-900 border-slate-800 text-slate-400'
                    }`}
                  >
                    <span className="text-xs font-bold block">🎾 Pemain (Player)</span>
                    <span className="text-[10px] text-slate-400">Pantau lapangan & catat MMR</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRegRole('host')}
                    className={`p-2.5 rounded-xl border text-left transition ${
                      regRole === 'host'
                        ? 'bg-padel-lime/15 border-padel-lime text-padel-lime'
                        : 'bg-slate-900 border-slate-800 text-slate-400'
                    }`}
                  >
                    <span className="text-xs font-bold block">👑 Host / Panitia</span>
                    <span className="text-[10px] text-slate-400">Bikin turnamen & kelola skor</span>
                  </button>
                </div>
              </div>

              {/* Skill level */}
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1.5">Level Skill & MMR Awal</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'beginner', label: 'Beginner', mmr: '1000 MMR' },
                    { id: 'intermediate', label: 'Intermediate', mmr: '1200 MMR' },
                    { id: 'advanced', label: 'Advanced', mmr: '1450 MMR' },
                    { id: 'pro', label: 'Pro / Expert', mmr: '1700 MMR' }
                  ].map(lvl => (
                    <button
                      key={lvl.id}
                      type="button"
                      onClick={() => setRegSkill(lvl.id)}
                      className={`p-2 rounded-xl border text-left transition ${
                        regSkill === lvl.id
                          ? 'bg-slate-800 border-padel-blue text-white'
                          : 'bg-slate-900 border-slate-800 text-slate-400'
                      }`}
                    >
                      <span className="text-xs font-bold block">{lvl.label}</span>
                      <span className="text-[10px] font-mono text-slate-400">{lvl.mmr}</span>
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-padel-blue hover:bg-padel-blue/80 text-black font-extrabold text-xs shadow-lg shadow-padel-blue/20 transition active:scale-95 flex items-center justify-center gap-2 mt-2"
              >
                <UserPlus className="w-4 h-4" />
                <span>{loading ? 'Mendaftarkan...' : 'Buat Akun PadelPro'}</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
