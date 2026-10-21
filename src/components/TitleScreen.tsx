/**
 * 16-Bit Systemic Game Engine - Title Screen
 * Authentic 16-bit industrial aesthetic, title emblem lockup,
 * track selector, and clean start handshake.
 */

import React, { useEffect, useState } from 'react';
import { Play, Disc3, Terminal, Shield, Sparkles } from 'lucide-react';
import { SOUNDTRACK_TRACKS } from '../game/audio/audioManager';
import { AudioTrackKey } from '../game/types';

interface TitleScreenProps {
  onStartGame: () => void;
  onSelectTrack: (trackKey: AudioTrackKey) => void;
  currentTrackKey: AudioTrackKey;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  onStartGame,
  onSelectTrack,
  currentTrackKey
}) => {
  const [selectedTrack, setSelectedTrack] = useState<AudioTrackKey>(currentTrackKey);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Enter' || e.code === 'Space') {
        e.preventDefault();
        onStartGame();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onStartGame]);

  return (
    <div className="relative flex h-full w-full flex-col items-center justify-between p-6 sm:p-10 select-none overflow-hidden bg-[#07090e]">
      {/* Background Animated Pixel Grid & Scanlines */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-900/40 via-[#0a0d14] to-[#040609]" />
      
      {/* Decorative Blueprint Lines */}
      <div className="pointer-events-none absolute inset-0 opacity-15">
        <svg className="h-full w-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid" width="32" height="32" patternUnits="userSpaceOnUse">
              <path d="M 32 0 L 0 0 0 32" fill="none" stroke="#06b6d4" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>

      {/* Top Header: System Spec & Version */}
      <div className="relative z-10 flex w-full items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <Terminal className="h-4 w-4 text-cyan-400" />
          <span className="mono-font tracking-wider">SYSTEM-16 ENGINE v0.1 · TDD PRE-PROTOTYPE</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
          <span className="mono-font text-emerald-400 text-[11px]">АРХІВ ТРЕКІВ ГОТОВИЙ (8/8)</span>
        </div>
      </div>

      {/* Center: Title Lockup & Cog Crest Emblem */}
      <div className="relative z-10 flex flex-col items-center text-center my-auto max-w-2xl">
        {/* Inline SVG Mechanical Cog Emblem */}
        <div className="mb-4">
          <svg className="h-20 w-20 text-cyan-400 drop-shadow-[0_0_15px_rgba(6,182,212,0.6)] animate-[spin_24s_linear_infinite]" viewBox="0 0 100 100" fill="currentColor">
            <path d="M50 20 A30 30 0 1 0 50 80 A30 30 0 1 0 50 20 Z M50 35 A15 15 0 1 1 50 65 A15 15 0 1 1 50 35 Z" fillRule="evenodd" />
            {/* Cog Teeth */}
            <rect x="44" y="5" width="12" height="15" rx="2" />
            <rect x="44" y="80" width="12" height="15" rx="2" />
            <rect x="5" y="44" width="15" height="12" rx="2" />
            <rect x="80" y="44" width="15" height="12" rx="2" />
            <rect x="18" y="18" width="12" height="14" rx="2" transform="rotate(45 24 25)" />
            <rect x="70" y="70" width="12" height="14" rx="2" transform="rotate(45 76 77)" />
            <rect x="18" y="70" width="12" height="14" rx="2" transform="rotate(-45 24 77)" />
            <rect x="70" y="18" width="12" height="14" rx="2" transform="rotate(-45 76 25)" />
          </svg>
        </div>

        <h1 className="pixel-font text-2xl sm:text-4xl font-extrabold tracking-wider text-slate-100 drop-shadow-[0_4px_12px_rgba(0,0,0,0.9)]">
          MECHANICUS
        </h1>
        <p className="mono-font mt-2 text-sm sm:text-base font-semibold tracking-widest text-cyan-400 uppercase">
          ПРОТОКОЛ СТАЛІ · СИСТЕМНА ЕКШН-АДВЕНЧУРА
        </p>
        <p className="mt-3 text-xs sm:text-sm text-slate-400 max-w-lg leading-relaxed">
          «Мінімум графічної складності — максимум системної складності». Інтерактивне середовище, елементальні реакції води, нафти, струму та кріо-холоду.
        </p>

        {/* Primary Start CTA Button */}
        <div className="mt-8 flex flex-col items-center gap-3">
          <button
            data-start="true"
            onClick={onStartGame}
            className="group relative flex items-center gap-3 rounded-lg border-2 border-cyan-400 bg-cyan-950/80 px-8 py-3.5 pixel-font text-sm font-bold text-cyan-200 shadow-[0_0_20px_rgba(6,182,212,0.4)] transition-all hover:bg-cyan-500 hover:text-slate-950 active:scale-95"
          >
            <Play className="h-5 w-5 fill-current" />
            <span>РОЗПОЧАТИ ПРОТОКОЛ [ENTER]</span>
          </button>
        </div>

        {/* Soundtrack Preview Selector */}
        <div className="mt-6 flex flex-col items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-950/80 p-3 max-w-md w-full">
          <div className="flex items-center gap-2 text-xs text-amber-400">
            <Disc3 className="h-4 w-4 animate-spin" />
            <span className="mono-font font-bold">ВИБІР САУНДТРЕКУ ДЛЯ СТАРТУ:</span>
          </div>
          <select
            value={selectedTrack}
            onChange={(e) => {
              const val = e.target.value as AudioTrackKey;
              setSelectedTrack(val);
              onSelectTrack(val);
            }}
            className="w-full rounded border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-slate-200 focus:border-cyan-500 focus:outline-none"
          >
            {Object.values(SOUNDTRACK_TRACKS).map((t) => (
              <option key={t.key} value={t.key}>
                {t.title} ({t.duration}) · {t.vibeUk.slice(0, 32)}...
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Bottom Safe Margin: Flat Single-Line Control Hint */}
      <div className="relative z-10 w-full text-center">
        <div className="mono-font text-[11px] text-slate-400">
          WASD / D-Pad Рух · J / ЛКМ Легкий · K / ПКМ Важкий · L / Shift Ривок · Пробіл ЕМІ · Tab Дека · Esc Пауза
        </div>
      </div>
    </div>
  );
};
