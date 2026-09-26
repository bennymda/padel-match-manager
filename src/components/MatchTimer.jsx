import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Volume2, Plus, Minus, BellRing } from 'lucide-react';
import { sounds } from '../services/audio.js';

export default function MatchTimer({
  timer,
  isHost,
  onTimerAction,
  matchDurationMinutes = 15
}) {
  const [secondsLeft, setSecondsLeft] = useState(timer?.remainingSeconds ?? (matchDurationMinutes * 60));
  const isRunning = timer?.running ?? false;
  const hasTriggeredWarning = useRef(false);
  const hasTriggeredBuzzer = useRef(false);

  useEffect(() => {
    if (timer?.remainingSeconds !== undefined) {
      setSecondsLeft(timer.remainingSeconds);
      if (timer.remainingSeconds > 60) hasTriggeredWarning.current = false;
      if (timer.remainingSeconds > 0) hasTriggeredBuzzer.current = false;
    }
  }, [timer]);

  // Local ticker when running
  useEffect(() => {
    let interval = null;
    if (isRunning && secondsLeft > 0) {
      interval = setInterval(() => {
        setSecondsLeft(prev => {
          const next = prev - 1;

          // 1 minute warning whistle
          if (next === 60 && !hasTriggeredWarning.current) {
            hasTriggeredWarning.current = true;
            sounds.playWhistle();
          }

          // 0 seconds buzzer
          if (next <= 0 && !hasTriggeredBuzzer.current) {
            hasTriggeredBuzzer.current = true;
            sounds.playBuzzer();
          }

          return Math.max(0, next);
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning, secondsLeft]);

  const formatTime = (secs) => {
    const mins = Math.floor(secs / 60);
    const rem = secs % 60;
    return `${String(mins).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
  };

  const handleToggle = () => {
    if (!isHost) return;
    if (isRunning) {
      onTimerAction('pause', secondsLeft);
    } else {
      sounds.playWhistle();
      onTimerAction('start', secondsLeft);
    }
  };

  const handleReset = () => {
    if (!isHost) return;
    hasTriggeredWarning.current = false;
    hasTriggeredBuzzer.current = false;
    onTimerAction('reset', matchDurationMinutes * 60);
  };

  const adjustTime = (deltaSeconds) => {
    if (!isHost) return;
    const newSeconds = Math.max(0, secondsLeft + deltaSeconds);
    setSecondsLeft(newSeconds);
    onTimerAction(isRunning ? 'start' : 'pause', newSeconds);
  };

  const isCritical = secondsLeft <= 60 && secondsLeft > 0;
  const isTimeUp = secondsLeft === 0;

  return (
    <div className={`rounded-2xl p-3 sm:p-4 border transition-all duration-300 ${
      isTimeUp
        ? 'bg-rose-950/40 border-rose-600/70 shadow-lg shadow-rose-900/20'
        : isCritical
        ? 'bg-amber-950/40 border-amber-500/70 shadow-lg shadow-amber-900/20 animate-pulse'
        : 'bg-padel-card border-padel-border'
    }`}>
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Timer display */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-800/80 border border-slate-700 flex items-center justify-center text-slate-300">
            {isTimeUp ? (
              <BellRing className="w-5 h-5 text-rose-500 animate-bounce" />
            ) : (
              <Volume2 className="w-5 h-5 text-padel-lime cursor-pointer" onClick={() => sounds.playWhistle()} title="Uji Suara Peluit" />
            )}
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Round Clock</span>
            <div className="flex items-baseline gap-2">
              <span className={`font-mono text-3xl sm:text-4xl font-black tracking-tight ${
                isTimeUp ? 'text-rose-400' : isCritical ? 'text-amber-400' : 'text-padel-lime'
              }`}>
                {formatTime(secondsLeft)}
              </span>
              {isTimeUp && (
                <span className="text-xs font-bold px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 uppercase tracking-widest animate-pulse">
                  WAKTU HABIS
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Host Controls */}
        {isHost ? (
          <div className="flex items-center gap-1.5 w-full sm:w-auto justify-end">
            <button
              onClick={() => adjustTime(-60)}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs transition active:scale-95"
              title="-1 Menit"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => adjustTime(60)}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs transition active:scale-95"
              title="+1 Menit"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleToggle}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition shadow-md active:scale-95 ${
                isRunning
                  ? 'bg-amber-500 hover:bg-amber-600 text-black'
                  : 'bg-padel-lime hover:bg-padel-lime-dark text-black'
              }`}
            >
              {isRunning ? (
                <>
                  <Pause className="w-4 h-4" /> Pause
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current" /> Mulai
                </>
              )}
            </button>
            <button
              onClick={handleReset}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs transition active:scale-95"
              title="Reset Timer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <div className="text-xs text-slate-400 italic">
            {isRunning ? '⏱️ Pertandingan sedang berlangsung' : '⏸️ Waktu dijeda oleh Host'}
          </div>
        )}
      </div>
    </div>
  );
}
