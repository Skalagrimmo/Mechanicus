/**
 * 16-Bit Systemic Game Engine - Retro HUD
 * World-matched framing, gaze routing, tabular numerals, and live track info.
 */

import React from 'react';
import { PlayerEntity, SectorInfo, TrackMetadata } from '../game/types';
import { WEAPONS_CATALOG, IMPLANTS_CATALOG } from '../game/systems/combat';
import { Shield, Zap, Wrench, Radio, Pause, Sparkles, HardDrive, Cpu } from 'lucide-react';

interface HUDProps {
  player: PlayerEntity;
  sector: SectorInfo;
  currentTrack: TrackMetadata | null;
  audioBands: number[];
  objectiveUk: string;
  isPaused: boolean;
  showCRT: boolean;
  isHandheldMode?: boolean;
  onTogglePause: () => void;
  onOpenInventory: () => void;
  onOpenJukebox: () => void;
  onToggleCRT: () => void;
  onOpenAndroidExport: () => void;
  onToggleHandheld: () => void;
}

export const HUD: React.FC<HUDProps> = ({
  player,
  sector,
  currentTrack,
  audioBands,
  objectiveUk,
  showCRT,
  isHandheldMode,
  onTogglePause,
  onOpenInventory,
  onOpenJukebox,
  onToggleCRT,
  onOpenAndroidExport,
  onToggleHandheld
}) => {
  const hpPct = Math.max(0, Math.min(1, player.stats.hp / player.stats.maxHp));
  const staminaPct = Math.max(0, Math.min(1, player.stats.stamina / player.stats.maxStamina));
  const weapon = WEAPONS_CATALOG[player.stats.equippedWeapon];

  // Discrete HP Pips (e.g. 5 pips)
  const totalPips = 5;
  const activePips = Math.ceil((player.stats.hp / player.stats.maxHp) * totalPips);

  return (
    <div className="pointer-events-none absolute inset-0 z-20 flex flex-col justify-between p-3 select-none">
      {/* Top Header Row */}
      <div className="flex items-start justify-between">
        {/* Left Corner: Player Status & Vitality Sockets */}
        <div className="flex flex-col gap-1.5 rounded-lg border border-cyan-950/80 bg-slate-950/90 p-2.5 backdrop-blur-sm shadow-xl">
          <div className="flex items-center gap-2">
            <span className="mono-font text-xs font-bold tracking-wider text-cyan-400">
              {sector.code}
            </span>
            <span className="text-[10px] text-slate-400">· {sector.nameUk}</span>
          </div>

          {/* Health Bar & Pips */}
          <div className="flex items-center gap-2">
            <span className="mono-font text-[10px] font-bold text-red-400">HP</span>
            <div className="flex gap-1">
              {Array.from({ length: totalPips }).map((_, i) => (
                <div
                  key={i}
                  className={`h-3 w-4.5 rounded-sm border transition-all ${
                    i < activePips
                      ? 'border-red-500 bg-red-600 shadow-[0_0_6px_rgba(239,68,68,0.7)]'
                      : 'border-slate-800 bg-slate-900/60'
                  }`}
                />
              ))}
            </div>
            <span className="mono-font text-xs font-bold tabular-nums text-red-200">
              {Math.round(player.stats.hp)}/{player.stats.maxHp}
            </span>
          </div>

          {/* Stamina / Energy Gauge */}
          <div className="flex items-center gap-2">
            <span className="mono-font text-[10px] font-bold text-amber-400">PWR</span>
            <div className="h-2 w-28 overflow-hidden rounded-sm bg-slate-900 border border-slate-800">
              <div
                className="h-full bg-gradient-to-r from-amber-600 to-amber-400 transition-all duration-75"
                style={{ width: `${staminaPct * 100}%` }}
              />
            </div>
            <span className="mono-font text-[10px] tabular-nums text-amber-200">
              {Math.round(player.stats.stamina)}
            </span>
          </div>

          {/* Equipped Weapon & Scrap */}
          <div className="mt-0.5 flex items-center justify-between gap-3 pt-1 border-t border-slate-800/80 text-[11px]">
            <div className="flex items-center gap-1.5 text-cyan-300">
              <Wrench className="h-3.5 w-3.5 text-cyan-400" />
              <span className="font-semibold">{weapon.nameUk}</span>
            </div>
            <div className="flex items-center gap-1 text-amber-400">
              <span className="text-xs">⚙️</span>
              <span className="mono-font font-bold tabular-nums">{player.stats.scrap}</span>
            </div>
          </div>
        </div>

        {/* Center: Live Mission Objective */}
        <div className="hidden sm:flex items-center gap-2 rounded-full border border-slate-800/80 bg-slate-950/85 px-3.5 py-1.5 shadow-lg">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-75"></span>
            <span className="relative inline-flex h-2 w-2 rounded-full bg-cyan-500"></span>
          </span>
          <span className="text-xs text-slate-300 font-medium">
            {objectiveUk}
          </span>
        </div>

        {/* Right Corner: Quick Action Buttons & Soundtrack Widget */}
        <div className="flex flex-col items-end gap-2">
          <div className="pointer-events-auto flex items-center gap-1.5 flex-wrap justify-end">
            <button
              onClick={onOpenAndroidExport}
              title="Інструкція збірки для Android смартфона"
              className="flex items-center gap-1 rounded border border-emerald-800/80 bg-emerald-950/90 px-2 py-1 text-xs text-emerald-300 hover:bg-emerald-900/80 transition-colors shadow"
            >
              <span className="text-[10px]">📱</span>
              <span className="hidden lg:inline font-mono text-[10px]">АНДРОЇД</span>
            </button>

            <button
              onClick={onToggleHandheld}
              title="Перемкнути консольний корпус"
              className={`flex items-center gap-1 rounded border px-2 py-1 text-xs transition-colors shadow ${
                isHandheldMode
                  ? 'border-amber-500 bg-amber-950/90 text-amber-300'
                  : 'border-slate-800 bg-slate-900/90 text-slate-300 hover:border-slate-700'
              }`}
            >
              <span className="text-[10px]">🎮</span>
              <span className="hidden lg:inline font-mono text-[10px]">КОНСОЛЬ</span>
            </button>

            <button
              onClick={onToggleCRT}
              title="Перемкнути CRT фільтр"
              className={`flex h-7.5 w-7.5 items-center justify-center rounded border transition-colors ${
                showCRT
                  ? 'border-cyan-500 bg-cyan-950/80 text-cyan-300'
                  : 'border-slate-800 bg-slate-900/80 text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sparkles className="h-3.5 w-3.5" />
            </button>

            <button
              onClick={onOpenInventory}
              title="Кібер-Дека / Інвентар [Tab]"
              className="flex items-center gap-1.5 rounded border border-slate-800 bg-slate-900/90 px-2.5 py-1 text-xs text-slate-300 hover:border-cyan-500 hover:text-cyan-300 transition-colors shadow"
            >
              <Cpu className="h-3.5 w-3.5 text-cyan-400" />
              <span className="hidden md:inline font-mono text-[10px]">ДЕКА [TAB]</span>
            </button>

            <button
              onClick={onOpenJukebox}
              title="Музичний плеєр треків [M]"
              className="flex items-center gap-1.5 rounded border border-slate-800 bg-slate-900/90 px-2.5 py-1 text-xs text-slate-300 hover:border-amber-500 hover:text-amber-300 transition-colors shadow"
            >
              <Radio className="h-3.5 w-3.5 text-amber-400" />
              <span className="hidden md:inline font-mono text-[10px]">АУДІО</span>
            </button>

            <button
              onClick={onTogglePause}
              title="Пауза [Esc / P]"
              className="flex h-7.5 w-7.5 items-center justify-center rounded border border-slate-800 bg-slate-900/90 text-slate-300 hover:border-red-500 hover:text-red-300 transition-colors shadow"
            >
              <Pause className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Live Sound Equalizer & Current Track Badge */}
          {currentTrack && (
            <div className="flex items-center gap-2 rounded border border-slate-800/80 bg-slate-950/90 px-2.5 py-1 text-[11px] shadow">
              <span className="text-amber-400 animate-pulse">♪</span>
              <span className="max-w-[140px] truncate text-slate-300 font-medium">
                {currentTrack.title}
              </span>
              {/* Animated Audio Equalizer Bars */}
              <div className="flex items-end gap-0.5 h-3 w-10">
                {audioBands.slice(0, 5).map((lvl, i) => (
                  <div
                    key={i}
                    className="w-1.5 bg-cyan-400 rounded-t-sm transition-all duration-75"
                    style={{ height: `${Math.max(20, lvl * 100)}%` }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Row: Combo Counter & Implant Status Badges */}
      <div className="flex items-end justify-between">
        {/* Left Bottom: Active Implants */}
        <div className="flex items-center gap-1.5">
          {player.stats.equippedImplants.map((id) => {
            const imp = IMPLANTS_CATALOG[id];
            if (!imp) return null;
            return (
              <div
                key={id}
                title={`${imp.nameUk}: ${imp.descriptionUk}`}
                className="flex h-7 w-7 items-center justify-center rounded border border-cyan-900/60 bg-slate-950/85 text-xs shadow"
              >
                {imp.icon}
              </div>
            );
          })}
        </div>

        {/* Center Bottom: Combo Notice */}
        {player.comboCount > 1 && (
          <div className="flex flex-col items-center animate-bounce">
            <span className="pixel-font text-xs font-bold text-amber-400 drop-shadow-[0_0_8px_rgba(245,158,11,0.8)]">
              КОМБО x{player.comboCount}!
            </span>
            {player.comboCount >= 3 && (
              <span className="pixel-font text-[9px] text-cyan-300 animate-pulse">
                ФІНІШЕР ГОТОВИЙ
              </span>
            )}
          </div>
        )}

        {/* Right Bottom: Compact Control Clues */}
        <div className="hidden lg:flex items-center gap-2 rounded bg-slate-950/80 px-2.5 py-1 text-[10px] text-slate-400 mono-font border border-slate-900">
          <span>WASD Рух</span>
          <span>·</span>
          <span>J / ЛКМ Легкий</span>
          <span>·</span>
          <span>K / ПКМ Важкий</span>
          <span>·</span>
          <span>L / Shift Ривок</span>
          <span>·</span>
          <span>Пробіл ЕМІ</span>
        </div>
      </div>
    </div>
  );
};
