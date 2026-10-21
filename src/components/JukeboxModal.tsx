/**
 * 16-Bit Systemic Game Engine - Soundtrack Jukebox
 * Showcase and play any of the 8 industrial tracks, adjust volume and view vibes.
 */

import React from 'react';
import { SOUNDTRACK_TRACKS } from '../game/audio/audioManager';
import { AudioTrackKey } from '../game/types';
import { X, Disc3, Play, Volume2, Radio, Music } from 'lucide-react';

interface JukeboxModalProps {
  currentTrackKey: AudioTrackKey | null;
  onSelectTrack: (trackKey: AudioTrackKey) => void;
  onClose: () => void;
  volume: number;
  onVolumeChange: (vol: number) => void;
}

export const JukeboxModal: React.FC<JukeboxModalProps> = ({
  currentTrackKey,
  onSelectTrack,
  onClose,
  volume,
  onVolumeChange
}) => {
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.code === 'KeyM') {
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xs select-none"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative flex flex-col max-w-2xl w-full rounded-2xl border-2 border-amber-800 bg-[#0d0f17] p-5 shadow-[0_0_35px_rgba(245,158,11,0.25)] max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-amber-900/60 pb-3">
          <div className="flex items-center gap-2">
            <Radio className="h-5 w-5 text-amber-400" />
            <h2 className="pixel-font text-sm font-bold text-slate-100">
              МУЗИЧНИЙ МОДУЛЬ «МЕХАНІКУС» (8 ТРЕКІВ)
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Volume Slider */}
        <div className="mt-4 flex items-center gap-3 rounded-lg border border-slate-800 bg-slate-900/80 p-3">
          <Volume2 className="h-4 w-4 text-amber-400" />
          <span className="mono-font text-xs text-slate-300">Гучність Саундтреку:</span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={volume}
            onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
            className="flex-1 accent-amber-500 cursor-pointer"
          />
          <span className="mono-font text-xs text-amber-300 w-10 text-right">
            {Math.round(volume * 100)}%
          </span>
        </div>

        {/* Tracks List */}
        <div className="mt-4 space-y-2">
          {Object.values(SOUNDTRACK_TRACKS).map((t) => {
            const isPlaying = currentTrackKey === t.key;
            return (
              <div
                key={t.key}
                onClick={() => onSelectTrack(t.key)}
                className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                  isPlaying
                    ? 'border-amber-500 bg-amber-950/60 shadow-[0_0_12px_rgba(245,158,11,0.3)]'
                    : 'border-slate-800 bg-slate-900/50 hover:border-slate-700 hover:bg-slate-900/80'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                      isPlaying
                        ? 'bg-amber-500 text-slate-950'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {isPlaying ? <Disc3 className="h-5 w-5 animate-spin" /> : <Play className="h-4 w-4 fill-current ml-0.5" />}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-slate-100">{t.title}</span>
                      <span
                        className={`rounded px-1.5 py-0.2 text-[9px] font-bold uppercase ${
                          t.role === 'boss'
                            ? 'bg-red-950 text-red-400 border border-red-800'
                            : t.role === 'combat'
                            ? 'bg-amber-950 text-amber-400 border border-amber-800'
                            : t.role === 'chase'
                            ? 'bg-purple-950 text-purple-400 border border-purple-800'
                            : 'bg-cyan-950 text-cyan-400 border border-cyan-800'
                        }`}
                      >
                        {t.role}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">{t.vibeUk}</div>
                  </div>
                </div>

                <div className="mono-font text-xs text-slate-400">{t.duration}</div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="mt-5 flex justify-end border-t border-slate-800/80 pt-3">
          <button
            onClick={onClose}
            className="rounded-lg bg-amber-600 px-5 py-2 text-xs font-bold text-slate-950 hover:bg-amber-500 transition-colors"
          >
            Закрити [Esc]
          </button>
        </div>
      </div>
    </div>
  );
};
