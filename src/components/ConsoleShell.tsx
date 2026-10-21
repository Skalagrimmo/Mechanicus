/**
 * 16-Bit Systemic Game Engine - Retro Console Shell
 * Provides an authentic retro cyber-handheld enclosure option,
 * tactile virtual touchscreen D-pad & action buttons with haptic vibration,
 * and Gamepad API integration for external controllers.
 */

import React, { useEffect, useState } from 'react';
import { Smartphone, Maximize2, Minimize2, Sliders, Volume2, Sparkles } from 'lucide-react';

interface ConsoleShellProps {
  children: React.ReactNode;
  isHandheldMode: boolean;
  onButtonPress: (action: 'up' | 'down' | 'left' | 'right' | 'light' | 'heavy' | 'dash' | 'parry' | 'emp' | 'inventory' | 'pause') => void;
  onButtonRelease: (action: 'up' | 'down' | 'left' | 'right' | 'light' | 'heavy' | 'dash' | 'parry' | 'emp') => void;
  onOpenAndroidExport: () => void;
  onToggleHandheld: () => void;
}

export const ConsoleShell: React.FC<ConsoleShellProps> = ({
  children,
  isHandheldMode,
  onButtonPress,
  onButtonRelease,
  onOpenAndroidExport,
  onToggleHandheld
}) => {
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Trigger tactile haptics on supported mobile devices
  const triggerHaptic = (ms: number = 25) => {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(ms);
      } catch {
        // Ignored if user didn't grant gesture
      }
    }
  };

  const handleTouchStart = (action: Parameters<typeof onButtonPress>[0]) => (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    triggerHaptic(25);
    onButtonPress(action);
  };

  const handleTouchEnd = (action: Parameters<typeof onButtonRelease>[0]) => (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    onButtonRelease(action);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // Gamepad API Polling
  useEffect(() => {
    let animId: number;
    let prevButtons: Record<number, boolean> = {};

    const pollGamepad = () => {
      const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
      const gp = gamepads[0];
      if (gp) {
        // D-Pad / Left Stick
        const axisX = gp.axes[0] || 0;
        const axisY = gp.axes[1] || 0;

        if (axisX < -0.4 || gp.buttons[14]?.pressed) {
          onButtonPress('left');
        } else if (axisX > 0.4 || gp.buttons[15]?.pressed) {
          onButtonPress('right');
        } else {
          onButtonRelease('left');
          onButtonRelease('right');
        }

        if (axisY < -0.4 || gp.buttons[12]?.pressed) {
          onButtonPress('up');
        } else if (axisY > 0.4 || gp.buttons[13]?.pressed) {
          onButtonPress('down');
        } else {
          onButtonRelease('up');
          onButtonRelease('down');
        }

        // A (Light Attack) - Button 0
        if (gp.buttons[0]?.pressed && !prevButtons[0]) {
          onButtonPress('light');
        } else if (!gp.buttons[0]?.pressed && prevButtons[0]) {
          onButtonRelease('light');
        }

        // B (Heavy Attack) - Button 1
        if (gp.buttons[1]?.pressed && !prevButtons[1]) {
          onButtonPress('heavy');
        } else if (!gp.buttons[1]?.pressed && prevButtons[1]) {
          onButtonRelease('heavy');
        }

        // X (Dash) - Button 2
        if (gp.buttons[2]?.pressed && !prevButtons[2]) {
          onButtonPress('dash');
        } else if (!gp.buttons[2]?.pressed && prevButtons[2]) {
          onButtonRelease('dash');
        }

        // Y (EMP) - Button 3
        if (gp.buttons[3]?.pressed && !prevButtons[3]) {
          onButtonPress('emp');
        } else if (!gp.buttons[3]?.pressed && prevButtons[3]) {
          onButtonRelease('emp');
        }

        // Start / Options (Pause) - Button 9
        if (gp.buttons[9]?.pressed && !prevButtons[9]) {
          onButtonPress('pause');
        }

        // Select / Share (Inventory) - Button 8
        if (gp.buttons[8]?.pressed && !prevButtons[8]) {
          onButtonPress('inventory');
        }

        // Update previous buttons
        for (let i = 0; i < gp.buttons.length; i++) {
          prevButtons[i] = gp.buttons[i]?.pressed || false;
        }
      }
      animId = requestAnimationFrame(pollGamepad);
    };

    animId = requestAnimationFrame(pollGamepad);
    return () => cancelAnimationFrame(animId);
  }, [onButtonPress, onButtonRelease]);

  return (
    <div className="relative flex h-screen w-screen flex-col items-center justify-center overflow-hidden bg-[#06080d]">
      {/* Main Viewport: Either Handheld Console Chassis or Full-Bleed Viewport */}
      {isHandheldMode ? (
        /* Handheld Retro Console Mode (Game Boy Advance / Neo Geo Style) */
        <div className="relative flex flex-col items-center justify-center rounded-[32px] border-4 border-slate-700 bg-gradient-to-b from-slate-800 via-slate-900 to-[#0e131d] p-4 sm:p-6 shadow-[0_20px_50px_rgba(0,0,0,0.9),inset_0_2px_4px_rgba(255,255,255,0.15)] max-w-5xl w-[96vw] max-h-[92vh]">
          {/* Top Speaker Grill & LED */}
          <div className="mb-2 flex w-full items-center justify-between px-4">
            <div className="flex items-center gap-2">
              <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981] animate-pulse" />
              <span className="pixel-font text-[8px] text-slate-400">PWR / BATT 100%</span>
            </div>
            <div className="pixel-font text-[9px] tracking-widest text-slate-400 font-bold">
              MECHANICUS-16X
            </div>
            <div className="flex gap-1">
              <div className="h-1 w-6 rounded bg-slate-700" />
              <div className="h-1 w-6 rounded bg-slate-700" />
            </div>
          </div>

          {/* Screen Bezel */}
          <div className="relative overflow-hidden rounded-xl border-4 border-slate-950 bg-black shadow-inner flex items-center justify-center w-full aspect-[16/9] max-h-[60vh]">
            {children}
          </div>

          {/* Bottom Console Controls (D-Pad, A/B/X/Y, Start/Select) */}
          <div className="mt-4 flex w-full items-center justify-between px-4 sm:px-12">
            {/* Retro Cross D-Pad */}
            <div className="relative h-28 w-28 flex items-center justify-center select-none">
              <button
                onMouseDown={handleTouchStart('up')}
                onMouseUp={handleTouchEnd('up')}
                onTouchStart={handleTouchStart('up')}
                onTouchEnd={handleTouchEnd('up')}
                className="absolute top-0 h-10 w-9 rounded-t-md bg-slate-700 active:bg-slate-500 border border-slate-600 shadow flex items-center justify-center text-slate-300 font-bold"
              >
                ▲
              </button>
              <button
                onMouseDown={handleTouchStart('down')}
                onMouseUp={handleTouchEnd('down')}
                onTouchStart={handleTouchStart('down')}
                onTouchEnd={handleTouchEnd('down')}
                className="absolute bottom-0 h-10 w-9 rounded-b-md bg-slate-700 active:bg-slate-500 border border-slate-600 shadow flex items-center justify-center text-slate-300 font-bold"
              >
                ▼
              </button>
              <button
                onMouseDown={handleTouchStart('left')}
                onMouseUp={handleTouchEnd('left')}
                onTouchStart={handleTouchStart('left')}
                onTouchEnd={handleTouchEnd('left')}
                className="absolute left-0 h-9 w-10 rounded-l-md bg-slate-700 active:bg-slate-500 border border-slate-600 shadow flex items-center justify-center text-slate-300 font-bold"
              >
                ◀
              </button>
              <button
                onMouseDown={handleTouchStart('right')}
                onMouseUp={handleTouchEnd('right')}
                onTouchStart={handleTouchStart('right')}
                onTouchEnd={handleTouchEnd('right')}
                className="absolute right-0 h-9 w-10 rounded-r-md bg-slate-700 active:bg-slate-500 border border-slate-600 shadow flex items-center justify-center text-slate-300 font-bold"
              >
                ▶
              </button>
              {/* D-Pad Center Pivot */}
              <div className="h-9 w-9 bg-slate-800 rounded-sm" />
            </div>

            {/* Middle: Select & Start pill buttons */}
            <div className="flex gap-4 items-center">
              <div className="flex flex-col items-center gap-1">
                <button
                  onClick={() => onButtonPress('inventory')}
                  className="h-3 w-10 -rotate-15 rounded-full bg-slate-700 active:bg-slate-500 shadow border border-slate-600"
                />
                <span className="pixel-font text-[7px] text-slate-400">ДЕКА</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <button
                  onClick={() => onButtonPress('pause')}
                  className="h-3 w-10 -rotate-15 rounded-full bg-slate-700 active:bg-slate-500 shadow border border-slate-600"
                />
                <span className="pixel-font text-[7px] text-slate-400">ПАУЗА</span>
              </div>
            </div>

            {/* Action Buttons (Diamond layout: A, B, X, Y) */}
            <div className="relative h-28 w-28 select-none">
              {/* Y Button: EMP */}
              <button
                onMouseDown={handleTouchStart('emp')}
                onMouseUp={handleTouchEnd('emp')}
                onTouchStart={handleTouchStart('emp')}
                onTouchEnd={handleTouchEnd('emp')}
                className="absolute top-0 left-9 h-10 w-10 rounded-full bg-amber-600 active:bg-amber-400 border border-amber-500 shadow-lg flex items-center justify-center pixel-font text-xs font-bold text-white"
              >
                Y
              </button>
              {/* X Button: Dash */}
              <button
                onMouseDown={handleTouchStart('dash')}
                onMouseUp={handleTouchEnd('dash')}
                onTouchStart={handleTouchStart('dash')}
                onTouchEnd={handleTouchEnd('dash')}
                className="absolute top-9 left-0 h-10 w-10 rounded-full bg-blue-600 active:bg-blue-400 border border-blue-500 shadow-lg flex items-center justify-center pixel-font text-xs font-bold text-white"
              >
                X
              </button>
              {/* B Button: Heavy Attack */}
              <button
                onMouseDown={handleTouchStart('heavy')}
                onMouseUp={handleTouchEnd('heavy')}
                onTouchStart={handleTouchStart('heavy')}
                onTouchEnd={handleTouchEnd('heavy')}
                className="absolute bottom-0 left-9 h-10 w-10 rounded-full bg-emerald-600 active:bg-emerald-400 border border-emerald-500 shadow-lg flex items-center justify-center pixel-font text-xs font-bold text-white"
              >
                B
              </button>
              {/* A Button: Light Attack */}
              <button
                onMouseDown={handleTouchStart('light')}
                onMouseUp={handleTouchEnd('light')}
                onTouchStart={handleTouchStart('light')}
                onTouchEnd={handleTouchEnd('light')}
                className="absolute top-9 right-0 h-10 w-10 rounded-full bg-red-600 active:bg-red-400 border border-red-500 shadow-lg flex items-center justify-center pixel-font text-xs font-bold text-white"
              >
                A
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Full-Bleed Viewport with Floating Virtual Controls on Touch Screens */
        <div className="relative flex h-full w-full items-center justify-center overflow-hidden">
          {children}

          {/* Floating On-Screen D-Pad (Touch Only) */}
          <div className="pointer-events-auto sm:hidden absolute bottom-4 left-4 z-30 select-none">
            <div className="relative h-32 w-32 rounded-full bg-slate-950/70 p-2 backdrop-blur-sm border border-slate-800/80 shadow-2xl">
              <button
                onTouchStart={handleTouchStart('up')}
                onTouchEnd={handleTouchEnd('up')}
                className="absolute top-1 left-11 h-10 w-10 rounded-t-lg bg-slate-800/90 active:bg-cyan-600 text-slate-200 font-bold flex items-center justify-center"
              >
                ▲
              </button>
              <button
                onTouchStart={handleTouchStart('down')}
                onTouchEnd={handleTouchEnd('down')}
                className="absolute bottom-1 left-11 h-10 w-10 rounded-b-lg bg-slate-800/90 active:bg-cyan-600 text-slate-200 font-bold flex items-center justify-center"
              >
                ▼
              </button>
              <button
                onTouchStart={handleTouchStart('left')}
                onTouchEnd={handleTouchEnd('left')}
                className="absolute top-11 left-1 h-10 w-10 rounded-l-lg bg-slate-800/90 active:bg-cyan-600 text-slate-200 font-bold flex items-center justify-center"
              >
                ◀
              </button>
              <button
                onTouchStart={handleTouchStart('right')}
                onTouchEnd={handleTouchEnd('right')}
                className="absolute top-11 right-1 h-10 w-10 rounded-r-lg bg-slate-800/90 active:bg-cyan-600 text-slate-200 font-bold flex items-center justify-center"
              >
                ▶
              </button>
            </div>
          </div>

          {/* Floating On-Screen Action Buttons (Touch Only) */}
          <div className="pointer-events-auto sm:hidden absolute bottom-4 right-4 z-30 select-none">
            <div className="relative h-32 w-32">
              {/* Button Y: EMP */}
              <button
                onTouchStart={handleTouchStart('emp')}
                onTouchEnd={handleTouchEnd('emp')}
                className="absolute top-0 left-11 h-10 w-10 rounded-full bg-amber-600/90 active:bg-amber-400 text-white font-bold pixel-font text-[10px] shadow-lg flex items-center justify-center border border-amber-400/50"
              >
                Y
              </button>
              {/* Button X: Dash */}
              <button
                onTouchStart={handleTouchStart('dash')}
                onTouchEnd={handleTouchEnd('dash')}
                className="absolute top-11 left-0 h-10 w-10 rounded-full bg-cyan-600/90 active:bg-cyan-400 text-white font-bold pixel-font text-[10px] shadow-lg flex items-center justify-center border border-cyan-400/50"
              >
                X
              </button>
              {/* Button B: Heavy */}
              <button
                onTouchStart={handleTouchStart('heavy')}
                onTouchEnd={handleTouchEnd('heavy')}
                className="absolute bottom-0 left-11 h-10 w-10 rounded-full bg-emerald-600/90 active:bg-emerald-400 text-white font-bold pixel-font text-[10px] shadow-lg flex items-center justify-center border border-emerald-400/50"
              >
                B
              </button>
              {/* Button A: Light */}
              <button
                onTouchStart={handleTouchStart('light')}
                onTouchEnd={handleTouchEnd('light')}
                className="absolute top-11 right-0 h-10 w-10 rounded-full bg-red-600/90 active:bg-red-400 text-white font-bold pixel-font text-[10px] shadow-lg flex items-center justify-center border border-red-400/50"
              >
                A
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
