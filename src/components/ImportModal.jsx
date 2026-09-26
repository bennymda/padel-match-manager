import React, { useState } from 'react';
import { X, FileSpreadsheet, ClipboardList, Upload, Check, AlertCircle } from 'lucide-react';
import * as XLSX from 'xlsx';
import { SKILL_LEVEL_MMR } from '../services/constants.js';

export default function ImportModal({
  isOpen,
  onClose,
  onImportPlayers
}) {
  const [activeTab, setActiveTab] = useState('text'); // 'text' | 'excel' | 'reclub'
  const [textInput, setTextInput] = useState('');
  const [reclubText, setReclubText] = useState('');
  const [parsedPlayers, setParsedPlayers] = useState([]);
  const [fileName, setFileName] = useState('');

  if (!isOpen) return null;

  // Parse generic numbered/bulleted text (WhatsApp roster)
  const handleParseText = () => {
    const lines = textInput.split('\n');
    const players = [];

    lines.forEach(line => {
      // Remove leading numbers, dots, dashes: "1. Budi", "- Budi", "1) Budi"
      const cleaned = line.replace(/^\s*\d+[\.\)\-]?\s*/, '').replace(/^\s*[\-\*]\s*/, '').trim();
      if (cleaned && cleaned.length > 1) {
        players.push({
          name: cleaned,
          skillLevel: 'intermediate',
          initialMMR: 1200
        });
      }
    });

    setParsedPlayers(players);
  };

  // Parse Reclub attendee text or export
  const handleParseReclub = () => {
    const lines = reclubText.split('\n');
    const players = [];

    lines.forEach(line => {
      const trimmed = line.trim();
      if (!trimmed) return;

      // Match patterns like "John Doe (Rating 3.5)" or "John Doe - Level 3.0" or "John Doe"
      let name = trimmed;
      let skill = 'intermediate';

      if (trimmed.includes('(') || trimmed.includes('-')) {
        const parts = trimmed.split(/[\(\-]/);
        name = parts[0].replace(/^\s*\d+[\.\)\-]?\s*/, '').trim();
        const ratingStr = parts[1] || '';
        if (ratingStr.includes('4.') || ratingStr.includes('5.') || ratingStr.toLowerCase().includes('adv')) {
          skill = 'advanced';
        } else if (ratingStr.includes('2.') || ratingStr.toLowerCase().includes('beg')) {
          skill = 'beginner';
        } else if (ratingStr.includes('5.5') || ratingStr.toLowerCase().includes('pro')) {
          skill = 'pro';
        }
      } else {
        name = trimmed.replace(/^\s*\d+[\.\)\-]?\s*/, '').trim();
      }

      if (name) {
        players.push({
          name,
          skillLevel: skill,
          initialMMR: SKILL_LEVEL_MMR[skill] || 1200
        });
      }
    });

    setParsedPlayers(players);
  };

  // Handle Excel / CSV upload
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsName = wb.SheetNames[0];
        const ws = wb.Sheets[wsName];
        const data = XLSX.utils.sheet_to_json(ws, { header: 1 });

        const players = [];
        // Detect header row or start reading names
        data.forEach((row, idx) => {
          if (row.length === 0) return;
          const firstCol = String(row[0] || '').trim();
          const secondCol = String(row[1] || '').trim();

          // Skip headers like "Name", "Nama", "Player"
          if (idx === 0 && (firstCol.toLowerCase().includes('name') || firstCol.toLowerCase().includes('nama'))) {
            return;
          }

          let name = firstCol;
          let skill = 'intermediate';

          // If first col is index number, check second col
          if (/^\d+$/.test(firstCol) && secondCol) {
            name = secondCol;
          }

          if (secondCol && !/^\d+$/.test(secondCol)) {
            const lower = secondCol.toLowerCase();
            if (lower.includes('beg')) skill = 'beginner';
            else if (lower.includes('adv')) skill = 'advanced';
            else if (lower.includes('pro')) skill = 'pro';
          }

          if (name && name.length > 1) {
            players.push({
              name,
              skillLevel: skill,
              initialMMR: SKILL_LEVEL_MMR[skill] || 1200
            });
          }
        });

        setParsedPlayers(players);
      } catch (err) {
        alert('Gagal membaca file Excel. Pastikan format valid (.xlsx, .xls, .csv)');
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleConfirmImport = () => {
    if (parsedPlayers.length === 0) return;
    onImportPlayers(parsedPlayers);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-padel-card border border-padel-border rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 border-b border-padel-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">Import Daftar Pemain</h3>
              <span className="text-[11px] text-slate-400">Excel (.xlsx), Reclub, atau Paste WA</span>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-padel-border bg-slate-950/60 p-1">
          <button
            onClick={() => setActiveTab('text')}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${
              activeTab === 'text'
                ? 'bg-slate-800 text-padel-lime shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            📋 Paste WhatsApp
          </button>
          <button
            onClick={() => setActiveTab('reclub')}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${
              activeTab === 'reclub'
                ? 'bg-slate-800 text-padel-lime shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            🎾 Reclub Format
          </button>
          <button
            onClick={() => setActiveTab('excel')}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${
              activeTab === 'excel'
                ? 'bg-slate-800 text-padel-lime shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            📊 Upload Excel / CSV
          </button>
        </div>

        {/* Body Content */}
        <div className="p-4 overflow-y-auto flex-1 space-y-4">
          {activeTab === 'text' && (
            <div className="space-y-2">
              <label className="text-xs text-slate-300 font-semibold block">
                Paste list pemain (1 nama per baris):
              </label>
              <textarea
                rows={5}
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder={"1. Budi Santoso\n2. Reza Fahlevi\n3. Kevin Sanjaya\n4. Marcus Gideon..."}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs text-white font-mono focus:outline-none focus:border-padel-lime"
              />
              <button
                type="button"
                onClick={handleParseText}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition"
              >
                Proses Nama Pemain
              </button>
            </div>
          )}

          {activeTab === 'reclub' && (
            <div className="space-y-2">
              <label className="text-xs text-slate-300 font-semibold block">
                Paste daftar peserta dari aplikasi Reclub:
              </label>
              <textarea
                rows={5}
                value={reclubText}
                onChange={(e) => setReclubText(e.target.value)}
                placeholder={"Alex Rivera - Level 3.5\nDavid Chen (Intermediate)\nSarah Connor - Level 4.5..."}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs text-white font-mono focus:outline-none focus:border-padel-lime"
              />
              <button
                type="button"
                onClick={handleParseReclub}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition"
              >
                Ekstrak Roster Reclub
              </button>
            </div>
          )}

          {activeTab === 'excel' && (
            <div className="space-y-3">
              <label className="block border-2 border-dashed border-slate-700 hover:border-padel-lime rounded-2xl p-6 text-center cursor-pointer bg-slate-900/50 transition">
                <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <span className="text-xs font-bold text-slate-200 block">
                  {fileName ? fileName : 'Klik atau Drag & Drop file Excel / CSV'}
                </span>
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Format .xlsx, .xls, .csv (Kolom: Nama, Skill Level)
                </span>
                <input
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>
          )}

          {/* Parsed Preview */}
          {parsedPlayers.length > 0 && (
            <div className="pt-2 border-t border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-emerald-400 flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" /> Terdeteksi {parsedPlayers.length} Pemain:
                </span>
              </div>
              <div className="max-h-40 overflow-y-auto bg-slate-950 p-2.5 rounded-xl border border-slate-800 space-y-1">
                {parsedPlayers.map((p, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs text-slate-300">
                    <span>{idx + 1}. {p.name}</span>
                    <span className="text-[10px] font-mono text-slate-500 capitalize">{p.skillLevel}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-padel-border bg-slate-950/60 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
          >
            Batal
          </button>
          <button
            type="button"
            disabled={parsedPlayers.length === 0}
            onClick={handleConfirmImport}
            className={`px-5 py-2 rounded-xl text-xs font-bold transition shadow-lg ${
              parsedPlayers.length > 0
                ? 'bg-emerald-500 hover:bg-emerald-400 text-black shadow-emerald-500/20'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
            }`}
          >
            Import {parsedPlayers.length > 0 ? `${parsedPlayers.length} Pemain` : ''}
          </button>
        </div>
      </div>
    </div>
  );
}
