import React, { useState, useEffect } from 'react';
import { X, QrCode, Copy, Check, Smartphone, KeyRound, Wifi } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

export default function QRCodeModal({
  isOpen,
  onClose,
  tournament
}) {
  const [networkInfo, setNetworkInfo] = useState(null);
  const [copied, setCopied] = useState(false);
  const [useNetworkIp, setUseNetworkIp] = useState(true);

  useEffect(() => {
    if (isOpen) {
      fetch('/api/network-info')
        .then(res => res.json())
        .then(data => setNetworkInfo(data))
        .catch(() => {});
    }
  }, [isOpen]);

  if (!isOpen || !tournament) return null;

  // Construct URL
  const baseUrl = useNetworkIp && networkInfo?.networkUrl 
    ? networkInfo.networkUrl 
    : window.location.origin;

  const joinUrl = `${baseUrl}/?code=${tournament.code}`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(joinUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fade-in">
      <div className="bg-padel-card border border-padel-border rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl text-center">
        {/* Header */}
        <div className="p-4 border-b border-padel-border flex items-center justify-between">
          <div className="flex items-center gap-2 text-left">
            <div className="w-8 h-8 rounded-xl bg-padel-lime/20 flex items-center justify-center text-padel-lime">
              <QrCode className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">Join via QR & Link</h3>
              <span className="text-[11px] text-slate-400">Scan untuk buka di HP pemain</span>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* QR Code Container */}
        <div className="p-6 space-y-4">
          {/* High contrast white card for reliable phone camera scanning */}
          <div className="bg-white p-5 rounded-2xl inline-block shadow-2xl mx-auto border-4 border-padel-lime">
            <QRCodeSVG
              value={joinUrl}
              size={200}
              level="H"
              includeMargin={false}
            />
          </div>

          <div>
            <span className="text-[11px] text-slate-400 block mb-1">Kode Turnamen:</span>
            <span className="font-mono text-2xl font-black text-padel-lime tracking-widest bg-slate-900 px-4 py-1.5 rounded-xl border border-slate-700 inline-block">
              {tournament.code}
            </span>
          </div>

          {/* Multi-host PIN info */}
          <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 text-slate-300">
              <KeyRound className="w-3.5 h-3.5 text-amber-400" />
              <span>Host Admin PIN:</span>
            </div>
            <span className="font-mono font-bold text-amber-400 tracking-wider">
              {tournament.hostPin}
            </span>
          </div>

          {/* Toggle URL Network mode */}
          {networkInfo?.localIp && (
            <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
              <span className="flex items-center gap-1">
                <Wifi className="w-3.5 h-3.5 text-padel-blue" />
                IP Wi-Fi Venue:
              </span>
              <button
                onClick={() => setUseNetworkIp(!useNetworkIp)}
                className="text-padel-blue hover:underline font-mono text-[10px]"
              >
                {useNetworkIp ? `${networkInfo.localIp}` : 'Gunakan Host Saat Ini'}
              </button>
            </div>
          )}

          {/* Copy Link Button */}
          <button
            onClick={copyToClipboard}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 text-xs font-bold transition active:scale-95"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-400" />
                <span className="text-emerald-400">Link Tersalin!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-slate-300" />
                <span>Salin Link Turnamen</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
