/**
 * 16-Bit Systemic Game Engine - Cyber-Deck & Inventory Modal
 * Minimal RPG character sheet, weapons, implants socketing, and consumables.
 */

import React from 'react';
import { PlayerEntity, WeaponType } from '../game/types';
import { WEAPONS_CATALOG, IMPLANTS_CATALOG } from '../game/systems/combat';
import { X, Cpu, Wrench, Shield, Zap, Sparkles, BatteryCharging, HeartPulse } from 'lucide-react';

interface InventoryModalProps {
  player: PlayerEntity;
  onClose: () => void;
  onSelectWeapon: (weapon: WeaponType) => void;
  onToggleImplant: (implantId: string) => void;
  onUseConsumable: (itemId: string) => void;
}

export const InventoryModal: React.FC<InventoryModalProps> = ({
  player,
  onClose,
  onSelectWeapon,
  onToggleImplant,
  onUseConsumable
}) => {
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.code === 'Tab') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [onClose]);

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs select-none"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative flex flex-col max-w-2xl w-full rounded-2xl border-2 border-cyan-800 bg-[#0b0f19] p-5 shadow-[0_0_30px_rgba(6,182,212,0.3)] max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-cyan-900/60 pb-3">
          <div className="flex items-center gap-2">
            <Cpu className="h-5 w-5 text-cyan-400" />
            <h2 className="pixel-font text-sm font-bold text-slate-100">
              КІБЕР-ДЕКА ТА АУГМЕНТАЦІЇ
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Stats Grid */}
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="rounded-lg border border-slate-800 bg-slate-900/80 p-2.5">
            <span className="mono-font text-[10px] text-slate-400">МІЦНІСТЬ КОРПУСУ</span>
            <div className="flex items-center gap-1.5 mt-1">
              <HeartPulse className="h-4 w-4 text-red-400" />
              <span className="mono-font text-sm font-bold text-red-200">
                {Math.round(player.stats.hp)} / {player.stats.maxHp}
              </span>
            </div>
          </div>

          <div className="rounded-lg border border-slate-800 bg-slate-900/80 p-2.5">
            <span className="mono-font text-[10px] text-slate-400">ЕНЕРГІЯ / СТАМІНА</span>
            <div className="flex items-center gap-1.5 mt-1">
              <Zap className="h-4 w-4 text-amber-400" />
              <span className="mono-font text-sm font-bold text-amber-200">
                {Math.round(player.stats.stamina)} / {player.stats.maxStamina}
              </span>
            </div>
          </div>

          <div className="rounded-lg border border-slate-800 bg-slate-900/80 p-2.5">
            <span className="mono-font text-[10px] text-slate-400">ЗАХИСТ БРОНІ</span>
            <div className="flex items-center gap-1.5 mt-1">
              <Shield className="h-4 w-4 text-blue-400" />
              <span className="mono-font text-sm font-bold text-blue-200">
                {player.stats.equippedImplants.includes('ferro_plating') ? '45%' : '15%'}
              </span>
            </div>
          </div>

          <div className="rounded-lg border border-slate-800 bg-slate-900/80 p-2.5">
            <span className="mono-font text-[10px] text-slate-400">ДЕТАЛІ / СКРАП</span>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="text-amber-400">⚙️</span>
              <span className="mono-font text-sm font-bold text-amber-300">
                {player.stats.scrap} ОД
              </span>
            </div>
          </div>
        </div>

        {/* Section 1: Weapons Arsenal */}
        <div className="mt-5">
          <h3 className="mono-font text-xs font-bold text-cyan-400 uppercase tracking-wider mb-2">
            1. Доступне Озброєння (Вибір активного інструменту)
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {Object.values(WEAPONS_CATALOG).map((w) => {
              const isEquipped = player.stats.equippedWeapon === w.id;
              return (
                <button
                  key={w.id}
                  onClick={() => onSelectWeapon(w.id)}
                  className={`flex flex-col text-left p-3 rounded-xl border transition-all ${
                    isEquipped
                      ? 'border-cyan-400 bg-cyan-950/70 shadow-[0_0_12px_rgba(6,182,212,0.4)]'
                      : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="font-bold text-xs text-slate-100">{w.nameUk}</span>
                    {isEquipped && (
                      <span className="rounded bg-cyan-500 px-1.5 py-0.5 text-[9px] font-bold text-slate-950">
                        АКТИВНО
                      </span>
                    )}
                  </div>
                  <div className="mt-2 flex items-center gap-3 text-[10px] mono-font text-slate-300">
                    <span>Удар: {w.damage}</span>
                    <span>·</span>
                    <span>Елемент: {w.element === 'electricity' ? '⚡ Шок' : '⚙️ Фіз'}</span>
                  </div>
                  <p className="mt-1.5 text-[10px] text-slate-400 line-clamp-2">
                    {w.descriptionUk}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Section 2: Implants Sockets */}
        <div className="mt-5">
          <h3 className="mono-font text-xs font-bold text-cyan-400 uppercase tracking-wider mb-2">
            2. Модульні Імпланти (Слоти розширення)
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {Object.values(IMPLANTS_CATALOG).map((imp) => {
              const isInstalled = player.stats.equippedImplants.includes(imp.id);
              return (
                <div
                  key={imp.id}
                  className={`flex items-start justify-between p-3 rounded-xl border ${
                    isInstalled
                      ? 'border-emerald-600 bg-emerald-950/40'
                      : 'border-slate-800 bg-slate-900/60'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-800 text-base shadow">
                      {imp.icon}
                    </div>
                    <div>
                      <div className="font-bold text-xs text-slate-200">{imp.nameUk}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5 max-w-[200px]">
                        {imp.descriptionUk}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => onToggleImplant(imp.id)}
                    className={`px-2.5 py-1 rounded text-[10px] font-bold transition-colors ${
                      isInstalled
                        ? 'bg-red-900/80 text-red-200 hover:bg-red-800'
                        : 'bg-emerald-600 text-white hover:bg-emerald-500'
                    }`}
                  >
                    {isInstalled ? 'Вийняти' : 'Встановити'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Section 3: Consumables */}
        <div className="mt-5">
          <h3 className="mono-font text-xs font-bold text-cyan-400 uppercase tracking-wider mb-2">
            3. Ремонтні Стимулятори та Витратні матеріали
          </h3>
          <div className="flex flex-wrap gap-2.5">
            <button
              onClick={() => onUseConsumable('repair_stim')}
              className="flex items-center gap-2 rounded-lg border border-red-900/70 bg-red-950/50 px-3.5 py-2 text-xs text-red-200 hover:bg-red-900/60 transition-colors"
            >
              <HeartPulse className="h-4 w-4 text-red-400" />
              <span>Рем-Стим (+50 HP)</span>
            </button>

            <button
              onClick={() => onUseConsumable('overdrive_battery')}
              className="flex items-center gap-2 rounded-lg border border-amber-900/70 bg-amber-950/50 px-3.5 py-2 text-xs text-amber-200 hover:bg-amber-900/60 transition-colors"
            >
              <BatteryCharging className="h-4 w-4 text-amber-400" />
              <span>Овердрайв Батарея (Повна Енергія)</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 flex justify-end border-t border-slate-800/80 pt-3">
          <button
            onClick={onClose}
            className="rounded-lg bg-cyan-600 px-5 py-2 text-xs font-bold text-slate-950 hover:bg-cyan-500 transition-colors"
          >
            Закрити Деку [Tab / Esc]
          </button>
        </div>
      </div>
    </div>
  );
};
