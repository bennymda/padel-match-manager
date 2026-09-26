import { 
  Trophy, 
  QrCode, 
  Share2, 
  ShieldCheck, 
  User, 
  Wifi, 
  WifiOff, 
  PlusCircle, 
  Settings,
  ChevronRight,
  Database,
  LogIn,
  LogOut,
  Sparkles
} from 'lucide-react';
import { BRANDING } from '../config/branding.js';

export default function Navbar({
  tournament,
  role,
  activePlayer,
  currentUser,
  isConnected,
  onOpenQR,
  onOpenHostUnlock,
  onSwitchTournament,
  onOpenAuth,
  onOpenHistory,
  onLogout
}) {
  const [showUserMenu, setShowUserMenu] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-padel-dark/95 backdrop-blur border-b border-padel-border px-4 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        {/* Left: Brand & Tournament Info */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center gap-2 cursor-pointer" onClick={onSwitchTournament}>
            {BRANDING.logoType === 'image' ? (
              <img
                src={BRANDING.logoImageUrl}
                alt={BRANDING.appName}
                className="w-10 h-10 rounded-xl object-contain shadow-lg flex-shrink-0 bg-slate-900 border border-slate-700"
              />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-padel-lime flex items-center justify-center font-black text-black text-xl shadow-lg shadow-padel-lime/20 flex-shrink-0">
                {BRANDING.logoEmoji}
              </div>
            )}
            <div className="hidden sm:block">
              <span className="font-extrabold text-base tracking-wider text-white">
                {BRANDING.appName}
                {BRANDING.appNameHighlight && <span className="text-padel-lime">{BRANDING.appNameHighlight}</span>}
              </span>
              <span className="block text-[10px] text-slate-400 font-medium -mt-1 tracking-widest uppercase">
                {BRANDING.appSubtitle}
              </span>
            </div>
          </div>

          {tournament && (
            <div className="flex items-center gap-2 border-l border-slate-700/60 pl-3 min-w-0">
              <div className="truncate">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-bold text-slate-100 truncate">{tournament.title}</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-padel-card border border-padel-lime/40 text-padel-lime">
                    {tournament.format}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-400">
                  <span className="font-mono text-padel-blue font-bold tracking-wider">{tournament.code}</span>
                  <span>•</span>
                  <span>{tournament.gameMode === 'doubles' ? 'Doubles (4)' : tournament.gameMode === 'singles' ? 'Singles (2)' : 'Fixed 2v2'}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right: History DB, User Profile / Auth, Role, QR */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Database History Button */}
          <button
            onClick={onOpenHistory}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition active:scale-95 shadow-sm"
            title="Buka Database Riwayat Turnamen & Karier"
          >
            <Database className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden md:inline">Riwayat DB</span>
          </button>

          {/* User Profile / Auth Login */}
          {currentUser ? (
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs transition"
              >
                <img
                  src={currentUser.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(currentUser.name)}`}
                  alt={currentUser.name}
                  className="w-5 h-5 rounded-full border border-padel-lime"
                />
                <span className="font-bold text-slate-200 hidden sm:inline max-w-[100px] truncate">{currentUser.name}</span>
                <span className="text-[10px] text-amber-300 font-mono hidden md:inline">{currentUser.mmr || 1200}</span>
              </button>

              {/* Dropdown Menu */}
              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-padel-card border border-padel-border rounded-2xl shadow-2xl p-2 z-50 animate-fade-in text-xs">
                  <div className="px-3 py-2 border-b border-slate-800">
                    <span className="font-bold text-white block truncate">{currentUser.name}</span>
                    <span className="text-[10px] text-slate-400 block truncate">{currentUser.email}</span>
                    <span className="text-[10px] text-amber-300 font-mono mt-0.5 block">{currentUser.mmr} MMR • {currentUser.role}</span>
                  </div>
                  <button
                    onClick={() => { setShowUserMenu(false); onOpenHistory(); }}
                    className="w-full text-left px-3 py-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 flex items-center gap-2 mt-1"
                  >
                    <Trophy className="w-3.5 h-3.5 text-amber-400" />
                    <span>Statistik Karier</span>
                  </button>
                  <button
                    onClick={() => { setShowUserMenu(false); onLogout(); }}
                    className="w-full text-left px-3 py-2 rounded-xl text-rose-400 hover:bg-rose-950/40 flex items-center gap-2 mt-1"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Keluar (Logout)</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-padel-blue hover:bg-padel-blue/80 text-black text-xs font-bold transition active:scale-95 shadow-md shadow-padel-blue/20"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Masuk / Daftar</span>
            </button>
          )}

          {/* Role Badge */}
          {role === 'host' ? (
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-padel-lime/10 border border-padel-lime/40 text-padel-lime text-xs font-bold shadow-sm">
              <ShieldCheck className="w-4 h-4 text-padel-lime" />
              <span>Host</span>
            </div>
          ) : role === 'player' && activePlayer ? (
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-padel-blue/10 border border-padel-blue/40 text-padel-blue text-xs font-bold shadow-sm max-w-[140px] truncate">
              <User className="w-3.5 h-3.5 flex-shrink-0 text-padel-blue" />
              <span className="truncate">{activePlayer.name}</span>
            </div>
          ) : (
            <button
              onClick={onOpenHostUnlock}
              className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium border border-slate-700 transition"
              title="Masuk sebagai Multi-Host dengan PIN"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
              <span>Host PIN</span>
            </button>
          )}

          {/* Share & QR Code Button */}
          {tournament && (
            <button
              onClick={onOpenQR}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition active:scale-95 shadow-sm"
              title="Tampilkan QR Code & Link untuk Player"
            >
              <QrCode className="w-4 h-4 text-padel-lime" />
              <span className="hidden md:inline">Share</span>
            </button>
          )}

          {/* New Tournament / Switch */}
          <button
            onClick={onSwitchTournament}
            className="flex items-center justify-center w-8 h-8 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition"
            title="Ganti atau Buat Turnamen Baru"
          >
            <PlusCircle className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
