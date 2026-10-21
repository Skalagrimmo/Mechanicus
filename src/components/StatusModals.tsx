/**
 * 16-Bit Systemic Game Engine - Status Modals
 * Pause, Victory, and Game Over modals strictly matching game_title_and_hud.md.
 */

import React from 'react';
import { Play, RotateCcw, Home, Award, Skull, Pause, CheckCircle2 } from 'lucide-react';

interface PauseModalProps {
  onResume: () => void;
  onRestart: () => void;
  onGoTitle: () => void;
}

export const PauseModal: React.FC<PauseModalProps> = ({ onResume, onRestart, onGoTitle }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs select-none">
      <div className="relative flex flex-col items-center max-w-sm w-full rounded-2xl border-2 border-slate-700 bg-[#0c1017] p-6 shadow-2xl text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-800 text-cyan-400 mb-3 shadow">
          <Pause className="h-6 w-6" />
        </div>

        <h2 className="pixel-font text-base font-bold text-slate-100">
          СИСТЕМУ ПРИЗУПИНЕНО
        </h2>
        <p className="mono-font text-xs text-slate-400 mt-1">
          ПРОТОКОЛ ТАКТИЧНОГО ОЧІКУВАННЯ
        </p>

        <div className="mt-6 flex flex-col gap-2.5 w-full">
          <button
            onClick={onResume}
            className="flex items-center justify-center gap-2 rounded-lg bg-cyan-600 px-4 py-2.5 pixel-font text-xs font-bold text-slate-950 hover:bg-cyan-500 transition-colors shadow"
          >
            <Play className="h-4 w-4 fill-current" />
            <span>ПРОДОВЖИТИ [ESC / P]</span>
          </button>

          <button
            onClick={onRestart}
            className="flex items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-4 py-2.5 pixel-font text-xs font-bold text-slate-300 hover:border-slate-500 transition-colors"
          >
            <RotateCcw className="h-4 w-4" />
            <span>ПЕРЕЗАПУСК СЕКТОРА</span>
          </button>

          <button
            onClick={onGoTitle}
            className="flex items-center justify-center gap-2 rounded-lg border border-slate-800 bg-slate-900/60 px-4 py-2.5 mono-font text-xs text-slate-400 hover:text-slate-200 transition-colors"
          >
            <Home className="h-4 w-4" />
            <span>ГОЛОВНЕ МЕНЮ</span>
          </button>
        </div>
      </div>
    </div>
  );
};

interface VictoryModalProps {
  clearTimeSec: number;
  enemiesKilled: number;
  scrapCollected: number;
  onPlayAgain: () => void;
  onGoTitle: () => void;
}

export const VictoryModal: React.FC<VictoryModalProps> = ({
  clearTimeSec,
  enemiesKilled,
  scrapCollected,
  onPlayAgain,
  onGoTitle
}) => {
  const formatTime = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${mins}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xs select-none">
      <div className="relative flex flex-col items-center max-w-md w-full rounded-2xl border-2 border-emerald-500 bg-[#091512] p-6 shadow-[0_0_40px_rgba(16,185,129,0.3)] text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-950 border border-emerald-500/50 text-emerald-400 mb-3 shadow">
          <Award className="h-8 w-8" />
        </div>

        <h2 className="pixel-font text-lg font-bold text-emerald-300">
          СВЯТИЛИЩЕ ПІДКОРЕНО!
        </h2>
        <p className="mono-font text-xs text-slate-300 mt-1">
          АРХІТЕКТОРА КОРПУСУ НЕЙТРАЛІЗОВАНО · ЯДРО СТАЛІ ПІД ВАШИМ КОНТРОЛЕМ
        </p>

        {/* Mastery Metrics */}
        <div className="mt-5 grid grid-cols-3 gap-2 w-full">
          <div className="rounded-xl border border-emerald-900/60 bg-emerald-950/40 p-2.5">
            <span className="mono-font text-[10px] text-emerald-400">ЧАС ОЧИЩЕННЯ</span>
            <div className="mono-font text-sm font-bold text-slate-100 mt-0.5">
              {formatTime(clearTimeSec)}
            </div>
          </div>

          <div className="rounded-xl border border-emerald-900/60 bg-emerald-950/40 p-2.5">
            <span className="mono-font text-[10px] text-emerald-400">НЕЙТРАЛІЗОВАНО</span>
            <div className="mono-font text-sm font-bold text-slate-100 mt-0.5">
              {enemiesKilled} МАШИН
            </div>
          </div>

          <div className="rounded-xl border border-emerald-900/60 bg-emerald-950/40 p-2.5">
            <span className="mono-font text-[10px] text-emerald-400">СКРАПУ ЗІБРАНО</span>
            <div className="mono-font text-sm font-bold text-slate-100 mt-0.5">
              {scrapCollected} ОД
            </div>
          </div>
        </div>

        {/* Action CTAs */}
        <div className="mt-6 flex flex-col gap-2.5 w-full">
          <button
            data-start="true"
            onClick={onPlayAgain}
            className="flex items-center justify-center gap-2 rounded-lg bg-emerald-500 px-5 py-3 pixel-font text-xs font-bold text-slate-950 hover:bg-emerald-400 transition-colors shadow-lg active:scale-95"
          >
            <RotateCcw className="h-4 w-4" />
            <span>НОВИЙ РЕЙД [ENTER]</span>
          </button>

          <button
            onClick={onGoTitle}
            className="rounded-lg border border-emerald-900/60 bg-slate-900/60 px-4 py-2 mono-font text-xs text-slate-400 hover:text-slate-200"
          >
            ГОЛОВНЕ МЕНЮ
          </button>
        </div>
      </div>
    </div>
  );
};

interface GameOverModalProps {
  sectorNameUk: string;
  enemiesKilled: number;
  scrapCollected: number;
  onRetry: () => void;
  onGoTitle: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  sectorNameUk,
  enemiesKilled,
  scrapCollected,
  onRetry,
  onGoTitle
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-xs select-none">
      <div className="relative flex flex-col items-center max-w-md w-full rounded-2xl border-2 border-red-600 bg-[#140b0e] p-6 shadow-[0_0_40px_rgba(239,68,68,0.35)] text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-950 border border-red-600/50 text-red-500 mb-3 shadow">
          <Skull className="h-8 w-8" />
        </div>

        <h2 className="pixel-font text-lg font-bold text-red-400">
          КРИТИЧНА ВІДМОВА КОРПУСУ
        </h2>
        <p className="mono-font text-xs text-slate-300 mt-1">
          СИГНАЛ ПЕРЕРВАНО В СЕКТОРІ: {sectorNameUk}
        </p>

        {/* Progress Metrics */}
        <div className="mt-5 grid grid-cols-2 gap-2.5 w-full">
          <div className="rounded-xl border border-red-950 bg-red-950/40 p-2.5">
            <span className="mono-font text-[10px] text-red-400">НЕЙТРАЛІЗОВАНО ДРОНІВ</span>
            <div className="mono-font text-base font-bold text-slate-100 mt-0.5">
              {enemiesKilled}
            </div>
          </div>

          <div className="rounded-xl border border-red-950 bg-red-950/40 p-2.5">
            <span className="mono-font text-[10px] text-red-400">ВТРАЧЕНО СКРАПУ</span>
            <div className="mono-font text-base font-bold text-slate-100 mt-0.5">
              {scrapCollected} ОД
            </div>
          </div>
        </div>

        {/* Action CTAs */}
        <div className="mt-6 flex flex-col gap-2.5 w-full">
          <button
            data-start="true"
            onClick={onRetry}
            className="flex items-center justify-center gap-2 rounded-lg bg-red-600 px-5 py-3 pixel-font text-xs font-bold text-white hover:bg-red-500 transition-colors shadow-lg active:scale-95"
          >
            <RotateCcw className="h-4 w-4" />
            <span>ВІДНОВИТИ ПРОТОКОЛ [ENTER]</span>
          </button>

          <button
            onClick={onGoTitle}
            className="rounded-lg border border-red-950 bg-slate-900/60 px-4 py-2 mono-font text-xs text-slate-400 hover:text-slate-200"
          >
            ГОЛОВНЕ МЕНЮ
          </button>
        </div>
      </div>
    </div>
  );
};
