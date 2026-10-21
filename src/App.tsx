/**
 * 16-Bit Systemic Game Engine - Application Shell
 * Thin presentation orchestrator connecting portable GameCore simulation,
 * InputAdapter, AudioAdapter, Canvas Renderer, and UI components.
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GameState, AudioTrackKey, SectorInfo, WeaponType } from './game/types';
import { GameCore } from './game/core/GameCore';
import { PixelRenderer } from './game/engine/renderer';
import { InputAdapter } from './adapters/inputAdapter';
import { audioManager, SOUNDTRACK_TRACKS } from './game/audio/audioManager';
import { HUD } from './components/HUD';
import { ConsoleShell } from './components/ConsoleShell';
import { TitleScreen } from './components/TitleScreen';
import { InventoryModal } from './components/InventoryModal';
import { JukeboxModal } from './components/JukeboxModal';
import { PauseModal, VictoryModal, GameOverModal } from './components/StatusModals';
import { AndroidExportModal } from './components/AndroidExportModal';

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rendererRef = useRef<PixelRenderer | null>(null);
  const coreRef = useRef<GameCore>(new GameCore());
  const inputAdapterRef = useRef<InputAdapter>(new InputAdapter());

  // High-level App UI States
  const [gameState, setGameState] = useState<GameState>('title');
  const [showCRT, setShowCRT] = useState<boolean>(true);
  const [isHandheldMode, setIsHandheldMode] = useState<boolean>(false);
  const [isInventoryOpen, setIsInventoryOpen] = useState<boolean>(false);
  const [isJukeboxOpen, setIsJukeboxOpen] = useState<boolean>(false);
  const [isAndroidExportOpen, setIsAndroidExportOpen] = useState<boolean>(false);
  const [audioVolume, setAudioVolume] = useState<number>(0.7);
  const [audioBands, setAudioBands] = useState<number[]>([0, 0, 0, 0, 0, 0, 0, 0]);
  const [objectiveUk, setObjectiveUk] = useState<string>('Знайдіть консоль безпеки та зламайте шлюз до наступного сектора.');

  // Throttled HUD update state (updated at 10Hz to avoid 60Hz React reconciliation overhead)
  const [hudTick, setHudTick] = useState<number>(0);

  // Initialize Renderer, Input Adapter, and Core Event Listeners
  useEffect(() => {
    rendererRef.current = new PixelRenderer();
    const detachInput = inputAdapterRef.current.attach();

    const unsubscribeCore = coreRef.current.subscribe((event) => {
      switch (event.type) {
        case 'sfx':
          audioManager.playSfx(event.sound);
          break;
        case 'track':
          audioManager.playTrack(event.trackKey);
          break;
        case 'shake':
          coreRef.current.screenShake = Math.max(coreRef.current.screenShake, event.amount);
          break;
        case 'hitstop':
          coreRef.current.hitstopTimer = Math.max(coreRef.current.hitstopTimer, event.duration);
          break;
        case 'particle': {
          const count = event.count || 6;
          const speed = event.speed || 2;
          const size = event.size || 2;
          for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const spd = (Math.random() * 0.7 + 0.3) * speed;
            coreRef.current.particles.push({
              x: event.x,
              y: event.y,
              vx: Math.cos(angle) * spd,
              vy: Math.sin(angle) * spd,
              life: 0.3 + Math.random() * 0.3,
              maxLife: 0.6,
              color: event.color,
              size
            });
          }
          break;
        }
        case 'floatText':
          coreRef.current.floatingTexts.push({
            id: Math.random(),
            x: event.x,
            y: event.y,
            text: event.text,
            color: event.color || '#f8fafc',
            duration: 0.9,
            alpha: 1.0
          });
          break;
        case 'stateChange':
          setGameState(event.newState);
          break;
        case 'objectiveChange':
          setObjectiveUk(event.textUk);
          break;
      }
    });

    // Check for ?autostart=1 query param
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('autostart') === '1') {
      startGame();
    }

    return () => {
      detachInput();
      unsubscribeCore();
    };
  }, []);

  // Update document body dataset for automated testability
  useEffect(() => {
    document.body.dataset.state = gameState;
  }, [gameState]);

  // Audio frequency updater for UI visualizer
  useEffect(() => {
    const interval = setInterval(() => {
      if (gameState === 'playing') {
        const bands = audioManager.getAudioFrequencyLevels();
        setAudioBands(bands);
      }
    }, 100);
    return () => clearInterval(interval);
  }, [gameState]);

  // Throttled HUD sync timer (10Hz)
  useEffect(() => {
    const interval = setInterval(() => {
      if (gameState === 'playing') {
        setHudTick((t) => t + 1);
      }
    }, 100);
    return () => clearInterval(interval);
  }, [gameState]);

  // Start / Resume Game
  const startGame = () => {
    audioManager.init();
    audioManager.playTrack('clock_in_sort_the_rain');
    coreRef.current.start();
    setGameState('playing');
  };

  // Main 60 FPS Game Loop
  useEffect(() => {
    let animId: number;
    let lastTime = performance.now();

    const loop = (now: number) => {
      const rawDt = (now - lastTime) / 1000;
      lastTime = now;
      const dt = Math.min(rawDt, 0.05); // Clamped delta-time

      if (gameState === 'playing') {
        // Poll input intent from keyboard, virtual controls, and Gamepad API
        const intent = inputAdapterRef.current.pollIntent();
        // Update authoritative core simulation with consistent dt
        coreRef.current.update(dt, intent);
      }

      // Render Frame to Canvas
      if (canvasRef.current && rendererRef.current) {
        const ctx = canvasRef.current.getContext('2d');
        if (ctx) {
          const core = coreRef.current;
          rendererRef.current.render(ctx, canvasRef.current.width, canvasRef.current.height, {
            map: core.map,
            player: core.player,
            enemies: core.enemies,
            props: core.props,
            projectiles: core.projectiles,
            hazards: core.getHazards(),
            particles: core.particles,
            floatingTexts: core.floatingTexts,
            cameraX: core.camera.x,
            cameraY: core.camera.y,
            screenShake: core.screenShake,
            weatherTimer: core.gameTime,
            hitstopTimer: core.hitstopTimer,
            showCRT,
            gameTime: core.gameTime
          });
        }
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [gameState, showCRT]);

  // Canvas resize listener
  useEffect(() => {
    const updateSize = () => {
      if (canvasRef.current) {
        const container = canvasRef.current.parentElement;
        if (container) {
          canvasRef.current.width = container.clientWidth || 960;
          canvasRef.current.height = container.clientHeight || 540;
        }
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Virtual buttons from ConsoleShell
  const handleConsoleButtonPress = useCallback((action: 'up' | 'down' | 'left' | 'right' | 'light' | 'heavy' | 'dash' | 'parry' | 'emp' | 'inventory' | 'pause') => {
    if (action === 'inventory') {
      setIsInventoryOpen((prev) => !prev);
      return;
    }
    if (action === 'pause') {
      if (gameState === 'playing') coreRef.current.pause();
      else if (gameState === 'paused') coreRef.current.resume();
      return;
    }
    inputAdapterRef.current.triggerVirtualPress(action);
  }, [gameState]);

  const handleConsoleButtonRelease = useCallback((action: 'up' | 'down' | 'left' | 'right' | 'light' | 'heavy' | 'dash' | 'parry' | 'emp') => {
    inputAdapterRef.current.triggerVirtualRelease(action);
  }, []);

  return (
    <ConsoleShell
      isHandheldMode={isHandheldMode}
      onButtonPress={handleConsoleButtonPress}
      onButtonRelease={handleConsoleButtonRelease}
      onOpenAndroidExport={() => setIsAndroidExportOpen(true)}
      onToggleHandheld={() => setIsHandheldMode(!isHandheldMode)}
    >
      {/* Viewport Canvas Wrapper */}
      <div className="relative h-full w-full overflow-hidden bg-black flex items-center justify-center">
        <canvas
          ref={canvasRef}
          className="pixelated h-full w-full block object-contain"
        />

        {/* Optional Authentic CRT Scanline & Phosphor Overlay */}
        {showCRT && (
          <div className="crt-overlay crt-vignette absolute inset-0 pointer-events-none z-10" />
        )}

        {/* Title Screen Overlay */}
        {gameState === 'title' && (
          <div className="absolute inset-0 z-30">
            <TitleScreen
              onStartGame={startGame}
              onSelectTrack={(key) => audioManager.playTrack(key)}
              currentTrackKey="clock_in_sort_the_rain"
            />
          </div>
        )}

        {/* In-Game Retro HUD */}
        {gameState === 'playing' && (
          <HUD
            player={coreRef.current.player}
            sector={coreRef.current.map.info}
            currentTrack={audioManager.getCurrentTrack()}
            audioBands={audioBands}
            objectiveUk={objectiveUk}
            isPaused={false}
            showCRT={showCRT}
            isHandheldMode={isHandheldMode}
            onTogglePause={() => coreRef.current.pause()}
            onOpenInventory={() => setIsInventoryOpen(true)}
            onOpenJukebox={() => setIsJukeboxOpen(true)}
            onToggleCRT={() => setShowCRT(!showCRT)}
            onOpenAndroidExport={() => setIsAndroidExportOpen(true)}
            onToggleHandheld={() => setIsHandheldMode(!isHandheldMode)}
          />
        )}

        {/* Pause Modal */}
        {gameState === 'paused' && (
          <PauseModal
            onResume={() => coreRef.current.resume()}
            onRestart={() => coreRef.current.restartCurrentSector()}
            onGoTitle={() => {
              setGameState('title');
              coreRef.current.gameState = 'title';
            }}
          />
        )}

        {/* Victory Modal */}
        {gameState === 'victory' && (
          <VictoryModal
            clearTimeSec={coreRef.current.runStats.timeSec}
            enemiesKilled={coreRef.current.runStats.enemiesKilled}
            scrapCollected={coreRef.current.runStats.scrapCollected}
            onPlayAgain={() => coreRef.current.resetGame()}
            onGoTitle={() => {
              setGameState('title');
              coreRef.current.gameState = 'title';
            }}
          />
        )}

        {/* Game Over Modal */}
        {gameState === 'gameover' && (
          <GameOverModal
            sectorNameUk={coreRef.current.map.info.nameUk}
            enemiesKilled={coreRef.current.runStats.enemiesKilled}
            scrapCollected={coreRef.current.runStats.scrapCollected}
            onRetry={() => coreRef.current.restartCurrentSector()}
            onGoTitle={() => {
              setGameState('title');
              coreRef.current.gameState = 'title';
            }}
          />
        )}

        {/* Cyberdeck / Inventory Modal */}
        {isInventoryOpen && (
          <InventoryModal
            player={coreRef.current.player}
            onClose={() => setIsInventoryOpen(false)}
            onSelectWeapon={(w: WeaponType) => {
              coreRef.current.selectWeapon(w);
              setIsInventoryOpen(false);
            }}
            onToggleImplant={(impId: string) => {
              coreRef.current.toggleImplant(impId);
            }}
            onUseConsumable={(itemId: string) => {
              coreRef.current.useConsumable(itemId);
              setIsInventoryOpen(false);
            }}
          />
        )}

        {/* Jukebox Modal */}
        {isJukeboxOpen && (
          <JukeboxModal
            currentTrackKey={audioManager.getCurrentTrack()?.key || null}
            onSelectTrack={(key) => audioManager.playTrack(key)}
            onClose={() => setIsJukeboxOpen(false)}
            volume={audioVolume}
            onVolumeChange={(v) => {
              setAudioVolume(v);
              audioManager.setMusicVolume(v);
            }}
          />
        )}

        {/* Android Native Export Guide Modal */}
        {isAndroidExportOpen && (
          <AndroidExportModal onClose={() => setIsAndroidExportOpen(false)} />
        )}
      </div>
    </ConsoleShell>
  );
}
