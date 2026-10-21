/**
 * 16-Bit Systemic Game Engine - Main Application & Game Loop Orchestrator
 * Integrates canvas rendering, systemic combat, environmental reactions,
 * audio manager, and hybrid Android touch/console shell.
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GameState, PlayerEntity, EnemyEntity, WorldProp, Projectile, EnvironmentalHazard, Particle, FloatingText, AudioTrackKey, SectorInfo } from './game/types';
import { generateSectorMap, checkTileCollision, SectorMap, TILE_SIZE, SECTORS } from './game/engine/world';
import { PixelRenderer, VIRTUAL_WIDTH, VIRTUAL_HEIGHT } from './game/engine/renderer';
import { resolveElementalReaction, getElementalDamageMultiplier } from './game/systems/elemental';
import { getNextAttackPhase, calculateIncomingDamage, calculateKnockback, WEAPONS_CATALOG, IMPLANTS_CATALOG } from './game/systems/combat';
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

  // Run statistics
  const [runStats, setRunStats] = useState({
    timeSec: 0,
    enemiesKilled: 0,
    scrapCollected: 0
  });

  // Current sector ID (1 to 4)
  const currentSectorIdRef = useRef<number>(1);
  const mapRef = useRef<SectorMap>(generateSectorMap(1));

  // Mutable Game Entities in Ref to avoid 60Hz React reconciliation overhead
  const playerRef = useRef<PlayerEntity>({
    pos: { x: 48, y: 192 },
    vel: { x: 0, y: 0 },
    dir: 'down',
    stats: {
      hp: 100,
      maxHp: 100,
      stamina: 100,
      maxStamina: 100,
      scrap: 45,
      equippedWeapon: 'wrench',
      equippedImplants: ['overclock_core'],
      inventory: [
        { id: 'repair_stim', nameUk: 'Рем-Стим', count: 2, type: 'consumable', descriptionUk: 'Відновлює 50 HP.' },
        { id: 'overdrive_battery', nameUk: 'Овердрайв Батарея', count: 1, type: 'consumable', descriptionUk: 'Мистецький акумулятор.' }
      ]
    },
    attackPhase: 'none',
    attackTimer: 0,
    attackCooldown: 0,
    comboCount: 0,
    comboTimer: 0,
    invulnTimer: 0,
    isParrying: false,
    isDashing: false,
    dashTimer: 0
  });

  const enemiesRef = useRef<EnemyEntity[]>(mapRef.current.enemies);
  const propsRef = useRef<WorldProp[]>(mapRef.current.props);
  const projectilesRef = useRef<Projectile[]>([]);
  const hazardsRef = useRef<EnvironmentalHazard[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const floatingTextsRef = useRef<FloatingText[]>([]);
  const cameraRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const screenShakeRef = useRef<number>(0);
  const hitstopTimerRef = useRef<number>(0);
  const gameTimeRef = useRef<number>(0);

  // Input state
  const keysHeld = useRef<Set<string>>(new Set());
  const justPressed = useRef<Set<string>>(new Set());

  // Initialize renderer
  useEffect(() => {
    rendererRef.current = new PixelRenderer();

    // Check for ?autostart=1 query param
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('autostart') === '1') {
      startGame();
    }
  }, []);

  // Update document body dataset for testability
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

  const addParticle = (x: number, y: number, color: string, count: number = 6, speed: number = 2, size: number = 2) => {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const spd = (Math.random() * 0.7 + 0.3) * speed;
      particlesRef.current.push({
        x,
        y,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd,
        life: 0.3 + Math.random() * 0.3,
        maxLife: 0.6,
        color,
        size
      });
    }
  };

  const addFloatingText = (x: number, y: number, text: string, color: string = '#f8fafc') => {
    floatingTextsRef.current.push({
      id: Math.random(),
      x,
      y,
      text,
      color,
      duration: 0.9,
      alpha: 1.0
    });
  };

  const triggerCameraShake = (amount: number) => {
    screenShakeRef.current = Math.min(amount, 12);
  };

  const triggerHitstop = (duration: number = 0.05) => {
    hitstopTimerRef.current = duration;
  };

  // Switch to new sector
  const loadSector = useCallback((sectorId: number) => {
    const newMap = generateSectorMap(sectorId);
    currentSectorIdRef.current = sectorId;
    mapRef.current = newMap;
    enemiesRef.current = newMap.enemies;
    propsRef.current = newMap.props;
    projectilesRef.current = [];
    hazardsRef.current = [];

    // Reset player position to spawn
    playerRef.current.pos = { ...newMap.playerSpawn };
    playerRef.current.vel = { x: 0, y: 0 };

    // Play appropriate soundtrack
    audioManager.playTrack(newMap.info.ambientTrack);

    if (sectorId === 1) {
      setObjectiveUk('Знайдіть термінал безпеки та відімкніть шлюз до Корозійного Реактора.');
    } else if (sectorId === 2) {
      setObjectiveUk('Подолайте токсичних дронів і знешкодьте захист охолоджувача.');
    } else if (sectorId === 3) {
      setObjectiveUk('Пройдіть крізь Тіньові Тунелі до Святилища Архітектора Корпусу.');
    } else if (sectorId === 4) {
      setObjectiveUk('УВАГА: Фінальний бій! Знищіть АРХІТЕКТОРА КОРПУСУ та підкоріть Ядро Сталі!');
    }

    addFloatingText(newMap.playerSpawn.x, newMap.playerSpawn.y - 16, `ВХІД: ${newMap.info.nameUk}`, '#38bdf8');
  }, []);

  // Start / Resume Game
  const startGame = () => {
    audioManager.init();
    audioManager.playTrack('clock_in_sort_the_rain');
    setGameState('playing');
    loadSector(1);
  };

  // Execute Player Action
  const handlePlayerAction = useCallback((action: 'light' | 'heavy' | 'dash' | 'parry' | 'emp') => {
    if (gameState !== 'playing') return;
    const player = playerRef.current;

    const { nextPhase, comboCount, damageMultiplier, staminaRequired } = getNextAttackPhase(
      player.attackPhase,
      action,
      player.comboTimer
    );

    if (player.stats.stamina < staminaRequired) {
      addFloatingText(player.pos.x, player.pos.y - 12, 'МАЛО ЕНЕРГІЇ!', '#f59e0b');
      audioManager.playSfx('player_hurt');
      return;
    }

    // Deduct stamina
    player.stats.stamina = Math.max(0, player.stats.stamina - staminaRequired);
    player.attackPhase = nextPhase;
    player.comboCount = comboCount;
    player.comboTimer = 1.1; // Window to chain next hit
    player.attackTimer = 0.22;

    const weapon = WEAPONS_CATALOG[player.stats.equippedWeapon];

    if (action === 'dash') {
      player.isDashing = true;
      player.dashTimer = 0.22;
      player.invulnTimer = 0.24; // I-frames during dash
      const dashSpeed = player.stats.equippedImplants.includes('overclock_core') ? 7.5 : 5.8;
      
      let dx = 0;
      let dy = 0;
      if (player.dir === 'right') dx = 1;
      else if (player.dir === 'left') dx = -1;
      else if (player.dir === 'up') dy = -1;
      else if (player.dir === 'down') dy = 1;

      player.vel.x = dx * dashSpeed;
      player.vel.y = dy * dashSpeed;
      audioManager.playSfx('dash');
      addParticle(player.pos.x, player.pos.y, '#06b6d4', 8, 3, 2);
      return;
    }

    if (action === 'parry') {
      player.isParrying = true;
      player.attackTimer = 0.35;
      audioManager.playSfx('swing');
      return;
    }

    if (action === 'emp') {
      audioManager.playSfx('shock');
      triggerCameraShake(6);
      addParticle(player.pos.x, player.pos.y, '#38bdf8', 22, 5, 3);
      addFloatingText(player.pos.x, player.pos.y - 16, 'ЕМІ ШОКХВИЛЯ!', '#38bdf8');

      // EMP Blast damage to all nearby enemies and conduits
      const empRadius = player.stats.equippedImplants.includes('arc_conductor') ? 96 : 56;
      for (const enemy of enemiesRef.current) {
        if (enemy.state === 'ko') continue;
        const dist = Math.hypot(enemy.pos.x - player.pos.x, enemy.pos.y - player.pos.y);
        if (dist <= empRadius) {
          enemy.hp -= 35;
          enemy.state = 'stunned';
          enemy.stateTimer = 2.0;
          enemy.invulnTimer = 0.15;
          addFloatingText(enemy.pos.x, enemy.pos.y - 10, 'СТУН!', '#fef08a');
        }
      }
      return;
    }

    // Light or Heavy Attack
    if (action === 'light') {
      audioManager.playSfx('swing');
    } else {
      audioManager.playSfx('heavy_hit');
      triggerCameraShake(4);
    }

    // Determine attack hitbox center
    let hx = player.pos.x;
    let hy = player.pos.y;
    const reach = action === 'heavy' ? 24 : 16;
    if (player.dir === 'right') hx += reach;
    else if (player.dir === 'left') hx -= reach;
    else if (player.dir === 'up') hy -= reach;
    else if (player.dir === 'down') hy += reach;

    const hitRadius = action === 'heavy' ? 22 : 15;
    const baseDamage = weapon.damage * damageMultiplier;

    // Hit Props (barrels, canisters, crates, terminals)
    for (const prop of propsRef.current) {
      if (prop.state === 'destroyed') continue;
      const dist = Math.hypot(prop.pos.x + 8 - hx, prop.pos.y + 8 - hy);
      if (dist <= hitRadius + 8) {
        prop.hp -= baseDamage;

        if (prop.type === 'crate_scrap') {
          audioManager.playSfx('heavy_hit');
          addParticle(prop.pos.x + 8, prop.pos.y + 8, '#92400e', 10, 3, 2);
          if (prop.hp <= 0) {
            prop.state = 'destroyed';
            player.stats.scrap += 15;
            audioManager.playSfx('pickup');
            addFloatingText(prop.pos.x, prop.pos.y, '+15 СКРАПУ', '#f59e0b');
          }
        } else if (prop.type === 'barrel_oil') {
          // Trigger oil barrel ignition & explosion
          prop.state = 'ignited';
          prop.stateTimer = 0.5; // Explodes in 0.5s
          audioManager.playSfx('shock');
          addFloatingText(prop.pos.x, prop.pos.y, 'УВАГА: ДЕТОНАЦІЯ!', '#ef4444');
        } else if (prop.type === 'canister_cryo') {
          // Freeze explosion
          prop.state = 'destroyed';
          audioManager.playSfx('freeze');
          triggerCameraShake(5);
          hazardsRef.current.push({
            id: Math.random(),
            pos: { x: prop.pos.x + 8, y: prop.pos.y + 8 },
            radius: 46,
            element: 'ice',
            duration: 6.0
          });
          addParticle(prop.pos.x + 8, prop.pos.y + 8, '#67e8f9', 24, 4, 3);
          addFloatingText(prop.pos.x, prop.pos.y, 'КРІО-ВИБУХ!', '#67e8f9');

          // Freeze all nearby enemies
          for (const e of enemiesRef.current) {
            if (e.state === 'ko') continue;
            if (Math.hypot(e.pos.x - prop.pos.x, e.pos.y - prop.pos.y) <= 50) {
              e.elementalStatus = { type: 'ice', duration: 4.5 };
              e.state = 'stunned';
              e.stateTimer = 4.0;
            }
          }
        } else if (prop.type === 'generator_arc') {
          // Electric discharge across wet tiles
          audioManager.playSfx('shock');
          hazardsRef.current.push({
            id: Math.random(),
            pos: { x: prop.pos.x + 8, y: prop.pos.y + 8 },
            radius: 54,
            element: 'electricity',
            duration: 3.5
          });
          addParticle(prop.pos.x + 8, prop.pos.y + 8, '#38bdf8', 16, 4, 2);
          addFloatingText(prop.pos.x, prop.pos.y, 'СТРУМ ПО КЛЕМІ!', '#38bdf8');
        } else if (prop.type === 'terminal_security') {
          // Terminal Hack
          if (prop.state !== 'activated' && prop.state !== 'hacked') {
            prop.state = 'activated';
            audioManager.playSfx('terminal');
            addFloatingText(prop.pos.x, prop.pos.y, 'ШЛЮЗ ВІДЧИНЕНО!', '#22c55e');
            // Unlock blast door in this sector
            for (const d of propsRef.current) {
              if (d.type === 'blast_door') {
                d.state = 'activated';
              }
            }
          }
        }
      }
    }

    // Hit Enemies
    let hitCount = 0;
    for (const enemy of enemiesRef.current) {
      if (enemy.state === 'ko') continue;
      const dist = Math.hypot(enemy.pos.x - hx, enemy.pos.y - hy);
      if (dist <= hitRadius + 8) {
        hitCount++;

        // Elemental multiplier
        const mult = getElementalDamageMultiplier(weapon.element, enemy.elementalStatus?.type);
        const finalDmg = Math.round(baseDamage * mult);
        enemy.hp -= finalDmg;
        enemy.invulnTimer = 0.12;

        // Knockback
        const kb = calculateKnockback(player.pos.x, player.pos.y, enemy.pos.x, enemy.pos.y, action === 'heavy' ? 4.5 : 2.5);
        enemy.vel.x = kb.vx;
        enemy.vel.y = kb.vy;

        // Apply hitstop & screen shake on heavy
        if (action === 'heavy') {
          triggerHitstop(0.06);
          triggerCameraShake(4);
          audioManager.playSfx('heavy_hit');
          addFloatingText(enemy.pos.x, enemy.pos.y - 12, `-${finalDmg} КРИТ!`, '#f59e0b');
        } else {
          audioManager.playSfx('heavy_hit');
          addFloatingText(enemy.pos.x, enemy.pos.y - 12, `-${finalDmg}`, '#f8fafc');
        }

        addParticle(enemy.pos.x, enemy.pos.y, '#ef4444', 8, 2.5, 2);

        // Check enemy defeat
        if (enemy.hp <= 0) {
          enemy.state = 'ko';
          setRunStats((prev) => ({ ...prev, enemiesKilled: prev.enemiesKilled + 1, scrapCollected: prev.scrapCollected + 20 }));
          player.stats.scrap += 20;
          audioManager.playSfx('pickup');
          addParticle(enemy.pos.x, enemy.pos.y, '#f59e0b', 16, 4, 3);
          addFloatingText(enemy.pos.x, enemy.pos.y - 16, 'НЕЙТРАЛІЗОВАНО!', '#10b981');

          // Check if Boss defeated
          if (enemy.type === 'warden_boss') {
            audioManager.playSfx('boss_roar');
            triggerCameraShake(10);
            setTimeout(() => {
              setGameState('victory');
            }, 1200);
          }
        }
      }
    }

    // Kinetic Dynamo bonus
    if (hitCount > 0 && player.stats.equippedImplants.includes('kinetic_dynamo')) {
      player.stats.stamina = Math.min(player.stats.maxStamina, player.stats.stamina + 12);
    }
  }, [gameState]);

  // Console Shell Touch / Gamepad press handler
  const handleConsoleButtonPress = useCallback((action: 'up' | 'down' | 'left' | 'right' | 'light' | 'heavy' | 'dash' | 'parry' | 'emp' | 'inventory' | 'pause') => {
    if (action === 'inventory') {
      setIsInventoryOpen((prev) => !prev);
      return;
    }
    if (action === 'pause') {
      setGameState((prev) => (prev === 'playing' ? 'paused' : prev === 'paused' ? 'playing' : prev));
      return;
    }
    if (action === 'up' || action === 'down' || action === 'left' || action === 'right') {
      keysHeld.current.add(action);
      return;
    }
    handlePlayerAction(action);
  }, [handlePlayerAction]);

  const handleConsoleButtonRelease = useCallback((action: 'up' | 'down' | 'left' | 'right' | 'light' | 'heavy' | 'dash' | 'parry' | 'emp') => {
    if (action === 'up' || action === 'down' || action === 'left' || action === 'right') {
      keysHeld.current.delete(action);
    }
    if (action === 'parry') {
      playerRef.current.isParrying = false;
    }
  }, []);

  // Keyboard Event Listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const code = e.code;

      if (code === 'Escape' || code === 'KeyP') {
        e.preventDefault();
        setGameState((prev) => (prev === 'playing' ? 'paused' : prev === 'paused' ? 'playing' : prev));
        return;
      }

      if (code === 'Tab') {
        e.preventDefault();
        setIsInventoryOpen((prev) => !prev);
        return;
      }

      if (code === 'KeyM') {
        e.preventDefault();
        setIsJukeboxOpen((prev) => !prev);
        return;
      }

      keysHeld.current.add(code);

      // Edge triggers
      if (!justPressed.current.has(code)) {
        justPressed.current.add(code);

        if (code === 'KeyJ') {
          handlePlayerAction('light');
        } else if (code === 'KeyK') {
          handlePlayerAction('heavy');
        } else if (code === 'KeyL' || code === 'ShiftLeft' || code === 'ShiftRight') {
          handlePlayerAction('dash');
        } else if (code === 'Space') {
          handlePlayerAction('emp');
        } else if (code === 'KeyC') {
          handlePlayerAction('parry');
        } else if (code === 'KeyE') {
          // Interact with nearby prop
          const p = playerRef.current;
          for (const prop of propsRef.current) {
            const dist = Math.hypot(prop.pos.x + 8 - p.pos.x, prop.pos.y + 8 - p.pos.y);
            if (dist < 28) {
              if (prop.type === 'terminal_security') {
                prop.state = 'activated';
                audioManager.playSfx('terminal');
                addFloatingText(prop.pos.x, prop.pos.y, 'ШЛЮЗ ВІДЧИНЕНО!', '#22c55e');
                for (const d of propsRef.current) {
                  if (d.type === 'blast_door') d.state = 'activated';
                }
              } else if (prop.type === 'blast_door' && prop.sectorGate && (prop.state === 'activated' || prop.state === 'hacked')) {
                loadSector(prop.sectorGate);
              }
            }
          }
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysHeld.current.delete(e.code);
      justPressed.current.delete(e.code);
      if (e.code === 'KeyC') {
        playerRef.current.isParrying = false;
      }
    };

    const handleBlur = () => {
      keysHeld.current.clear();
      justPressed.current.clear();
      playerRef.current.isParrying = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
    };
  }, [handlePlayerAction, loadSector]);

  // Main 60 FPS Game Loop
  useEffect(() => {
    let animId: number;
    let lastTime = performance.now();

    const loop = (now: number) => {
      const rawDt = (now - lastTime) / 1000;
      lastTime = now;
      const dt = Math.min(rawDt, 0.05); // Clamped dt

      if (gameState === 'playing') {
        gameTimeRef.current += dt;
        setRunStats((prev) => ({ ...prev, timeSec: prev.timeSec + dt }));

        // Check Hitstop
        if (hitstopTimerRef.current > 0) {
          hitstopTimerRef.current -= dt;
        } else {
          // 1. Player Physics & Input
          const player = playerRef.current;
          let moveX = 0;
          let moveY = 0;

          if (keysHeld.current.has('KeyW') || keysHeld.current.has('ArrowUp') || keysHeld.current.has('up')) moveY -= 1;
          if (keysHeld.current.has('KeyS') || keysHeld.current.has('ArrowDown') || keysHeld.current.has('down')) moveY += 1;
          if (keysHeld.current.has('KeyA') || keysHeld.current.has('ArrowLeft') || keysHeld.current.has('left')) moveX -= 1;
          if (keysHeld.current.has('KeyD') || keysHeld.current.has('ArrowRight') || keysHeld.current.has('right')) moveX += 1;

          // Normalize diagonal
          const len = Math.hypot(moveX, moveY);
          if (len > 0) {
            moveX /= len;
            moveY /= len;
            if (Math.abs(moveX) > Math.abs(moveY)) {
              player.dir = moveX > 0 ? 'right' : 'left';
            } else {
              player.dir = moveY > 0 ? 'down' : 'up';
            }
          }

          const baseSpeed = player.stats.equippedImplants.includes('overclock_core') ? 2.2 : 1.8;

          if (!player.isDashing) {
            player.vel.x = moveX * baseSpeed;
            player.vel.y = moveY * baseSpeed;
          } else {
            player.dashTimer -= dt;
            if (player.dashTimer <= 0) {
              player.isDashing = false;
            }
          }

          // Move player with collision
          const nextX = player.pos.x + player.vel.x;
          if (!checkTileCollision(mapRef.current, nextX, player.pos.y, 6)) {
            player.pos.x = nextX;
          }
          const nextY = player.pos.y + player.vel.y;
          if (!checkTileCollision(mapRef.current, player.pos.x, nextY, 6)) {
            player.pos.y = nextY;
          }

          // Check blast door transition trigger
          for (const prop of propsRef.current) {
            if (prop.type === 'blast_door' && prop.sectorGate && (prop.state === 'activated' || prop.state === 'hacked')) {
              const dist = Math.hypot(prop.pos.x + 8 - player.pos.x, prop.pos.y + 8 - player.pos.y);
              if (dist < 16) {
                loadSector(prop.sectorGate);
                break;
              }
            }
          }

          // Stamina regen
          player.stats.stamina = Math.min(player.stats.maxStamina, player.stats.stamina + 20 * dt);

          // Timers
          if (player.invulnTimer > 0) player.invulnTimer -= dt;
          if (player.attackTimer > 0) player.attackTimer -= dt;
          else player.attackPhase = 'none';

          if (player.comboTimer > 0) {
            player.comboTimer -= dt;
          } else {
            player.comboCount = 0;
          }

          // Check environmental tiles beneath player (acid hazard, ice slip)
          const tileX = Math.floor(player.pos.x / TILE_SIZE);
          const tileY = Math.floor(player.pos.y / TILE_SIZE);
          if (tileX >= 0 && tileX < mapRef.current.widthInTiles && tileY >= 0 && tileY < mapRef.current.heightInTiles) {
            const currentTile = mapRef.current.tiles[tileY][tileX];
            if (currentTile === 'hazard_acid' && player.invulnTimer <= 0) {
              const incoming = calculateIncomingDamage(8, false, false, player.stats.equippedImplants);
              player.stats.hp -= incoming.finalDamage;
              player.invulnTimer = 0.5;
              audioManager.playSfx('player_hurt');
              addFloatingText(player.pos.x, player.pos.y - 10, `-${incoming.finalDamage} КИСЛОТА`, '#22c55e');
              if (player.stats.hp <= 0) {
                setGameState('gameover');
              }
            }
          }

          // 2. Props Update (barrel explosion countdown)
          for (const prop of propsRef.current) {
            if (prop.state === 'ignited') {
              prop.stateTimer -= dt;
              if (prop.stateTimer <= 0) {
                prop.state = 'destroyed';
                audioManager.playSfx('explosion');
                triggerCameraShake(8);
                addParticle(prop.pos.x + 8, prop.pos.y + 8, '#f59e0b', 28, 5, 3);
                hazardsRef.current.push({
                  id: Math.random(),
                  pos: { x: prop.pos.x + 8, y: prop.pos.y + 8 },
                  radius: 48,
                  element: 'fire',
                  duration: 4.0
                });

                // Damage all in radius
                for (const e of enemiesRef.current) {
                  if (e.state === 'ko') continue;
                  const dist = Math.hypot(e.pos.x - (prop.pos.x + 8), e.pos.y - (prop.pos.y + 8));
                  if (dist <= 50) {
                    e.hp -= 45;
                    e.invulnTimer = 0.15;
                    addFloatingText(e.pos.x, e.pos.y - 12, '-45 ВИБУХ!', '#ef4444');
                    if (e.hp <= 0) e.state = 'ko';
                  }
                }
                const playerDist = Math.hypot(player.pos.x - (prop.pos.x + 8), player.pos.y - (prop.pos.y + 8));
                if (playerDist <= 48 && player.invulnTimer <= 0) {
                  const inc = calculateIncomingDamage(30, false, false, player.stats.equippedImplants);
                  player.stats.hp -= inc.finalDamage;
                  player.invulnTimer = 0.6;
                  audioManager.playSfx('player_hurt');
                  addFloatingText(player.pos.x, player.pos.y - 12, `-${inc.finalDamage} ВИБУХ`, '#ef4444');
                  if (player.stats.hp <= 0) setGameState('gameover');
                }
              }
            }
          }

          // 3. Enemies AI & Behavior
          for (const enemy of enemiesRef.current) {
            if (enemy.state === 'ko') continue;
            if (enemy.invulnTimer > 0) enemy.invulnTimer -= dt;

            // Decay knockback
            enemy.pos.x += enemy.vel.x;
            enemy.pos.y += enemy.vel.y;
            enemy.vel.x *= 0.85;
            enemy.vel.y *= 0.85;

            const dx = player.pos.x - enemy.pos.x;
            const dy = player.pos.y - enemy.pos.y;
            const distToPlayer = Math.hypot(dx, dy);

            if (enemy.state === 'stunned') {
              enemy.stateTimer -= dt;
              if (enemy.stateTimer <= 0) enemy.state = 'idle';
              continue;
            }

            if (enemy.type === 'drone_swarmer') {
              // Chaser AI
              if (distToPlayer < 180) {
                const moveSpeed = enemy.speed * (enemy.elementalStatus?.type === 'ice' ? 0.5 : 1.0);
                enemy.pos.x += (dx / distToPlayer) * moveSpeed;
                enemy.pos.y += (dy / distToPlayer) * moveSpeed;

                // Melee strike on player
                if (distToPlayer < 14 && player.invulnTimer <= 0) {
                  const inc = calculateIncomingDamage(enemy.damage, player.isParrying, false, player.stats.equippedImplants);
                  if (inc.parrySuccess) {
                    audioManager.playSfx('parry');
                    enemy.state = 'stunned';
                    enemy.stateTimer = 1.2;
                    triggerCameraShake(3);
                    addFloatingText(player.pos.x, player.pos.y - 14, 'ПАРИР!', '#38bdf8');
                  } else if (!inc.absorbed) {
                    player.stats.hp -= inc.finalDamage;
                    player.invulnTimer = 0.45;
                    audioManager.playSfx('player_hurt');
                    triggerCameraShake(4);
                    addFloatingText(player.pos.x, player.pos.y - 12, `-${inc.finalDamage}`, '#ef4444');
                    if (player.stats.hp <= 0) setGameState('gameover');
                  }
                }
              }
            } else if (enemy.type === 'sentry_ranged') {
              // Ranged Kiter with Laser telegraph
              if (distToPlayer < 200) {
                if (enemy.state === 'idle') {
                  enemy.state = 'windup';
                  enemy.windupTimer = 0.8;
                  enemy.telegraphPos = { x: player.pos.x, y: player.pos.y };
                } else if (enemy.state === 'windup') {
                  enemy.windupTimer -= dt;
                  enemy.telegraphPos = { x: player.pos.x, y: player.pos.y };
                  if (enemy.windupTimer <= 0) {
                    // Fire laser projectile
                    enemy.state = 'attack';
                    enemy.stateTimer = 0.6;
                    audioManager.playSfx('laser');
                    const projAngle = Math.atan2(dy, dx);
                    projectilesRef.current.push({
                      id: Math.random(),
                      pos: { x: enemy.pos.x, y: enemy.pos.y },
                      vel: { x: Math.cos(projAngle) * 3.8, y: Math.sin(projAngle) * 3.8 },
                      radius: 3,
                      damage: enemy.damage,
                      element: 'electricity',
                      owner: 'enemy',
                      duration: 2.5
                    });
                  }
                } else if (enemy.state === 'attack') {
                  enemy.stateTimer -= dt;
                  if (enemy.stateTimer <= 0) enemy.state = 'idle';
                }
              }
            } else if (enemy.type === 'enforcer_heavy') {
              // Heavy charger with shield
              if (distToPlayer < 160) {
                if (enemy.state === 'idle') {
                  enemy.state = 'windup';
                  enemy.windupTimer = 0.9;
                } else if (enemy.state === 'windup') {
                  enemy.windupTimer -= dt;
                  if (enemy.windupTimer <= 0) {
                    enemy.state = 'attack';
                    enemy.stateTimer = 0.8;
                    // Rush impulse
                    const angle = Math.atan2(dy, dx);
                    enemy.vel.x = Math.cos(angle) * 4.5;
                    enemy.vel.y = Math.sin(angle) * 4.5;
                  }
                } else if (enemy.state === 'attack') {
                  enemy.stateTimer -= dt;
                  if (distToPlayer < 18 && player.invulnTimer <= 0) {
                    const inc = calculateIncomingDamage(enemy.damage, player.isParrying, false, player.stats.equippedImplants);
                    if (inc.parrySuccess) {
                      audioManager.playSfx('parry');
                      enemy.state = 'stunned';
                      enemy.stateTimer = 1.5;
                      triggerCameraShake(4);
                      addFloatingText(player.pos.x, player.pos.y - 14, 'ПАРИР СТАЛІ!', '#38bdf8');
                    } else if (!inc.absorbed) {
                      player.stats.hp -= inc.finalDamage;
                      player.invulnTimer = 0.5;
                      audioManager.playSfx('player_hurt');
                      triggerCameraShake(6);
                      addFloatingText(player.pos.x, player.pos.y - 12, `-${inc.finalDamage}`, '#ef4444');
                      if (player.stats.hp <= 0) setGameState('gameover');
                    }
                  }
                  if (enemy.stateTimer <= 0) enemy.state = 'idle';
                }
              }
            } else if (enemy.type === 'warden_boss') {
              // Warden Titan: Multi-phase attacks & arena shockwave
              if (enemy.state === 'idle') {
                enemy.stateTimer -= dt;
                if (enemy.stateTimer <= 0) {
                  // Choose attack: 1) Shockwave Ring, 2) Laser Sweep, 3) Drone Summon
                  const rand = Math.random();
                  if (rand < 0.4) {
                    // Shockwave ring
                    audioManager.playSfx('shock');
                    triggerCameraShake(6);
                    for (let a = 0; a < Math.PI * 2; a += Math.PI / 4) {
                      projectilesRef.current.push({
                        id: Math.random(),
                        pos: { x: enemy.pos.x, y: enemy.pos.y },
                        vel: { x: Math.cos(a) * 2.8, y: Math.sin(a) * 2.8 },
                        radius: 4,
                        damage: 18,
                        element: 'electricity',
                        owner: 'enemy',
                        duration: 3.0
                      });
                    }
                  } else {
                    // Laser burst towards player
                    audioManager.playSfx('laser');
                    const angle = Math.atan2(dy, dx);
                    projectilesRef.current.push({
                      id: Math.random(),
                      pos: { x: enemy.pos.x, y: enemy.pos.y },
                      vel: { x: Math.cos(angle) * 4.2, y: Math.sin(angle) * 4.2 },
                      radius: 4,
                      damage: 22,
                      element: 'electricity',
                      owner: 'enemy',
                      duration: 2.5
                    });
                  }
                  enemy.stateTimer = 1.6;
                }
              }
            }
          }

          // 4. Projectiles Update
          for (let i = projectilesRef.current.length - 1; i >= 0; i--) {
            const p = projectilesRef.current[i];
            p.pos.x += p.vel.x;
            p.pos.y += p.vel.y;
            p.duration -= dt;

            // Check hit player
            if (p.owner === 'enemy') {
              const dist = Math.hypot(p.pos.x - player.pos.x, p.pos.y - player.pos.y);
              if (dist < 10 && player.invulnTimer <= 0) {
                const inc = calculateIncomingDamage(p.damage, player.isParrying, false, player.stats.equippedImplants);
                if (inc.parrySuccess) {
                  audioManager.playSfx('parry');
                  p.owner = 'player';
                  p.vel.x *= -1.5;
                  p.vel.y *= -1.5;
                  addFloatingText(player.pos.x, player.pos.y - 12, 'ВІДБИТО!', '#38bdf8');
                  continue;
                } else if (!inc.absorbed) {
                  player.stats.hp -= inc.finalDamage;
                  player.invulnTimer = 0.4;
                  audioManager.playSfx('player_hurt');
                  addFloatingText(player.pos.x, player.pos.y - 12, `-${inc.finalDamage}`, '#ef4444');
                  projectilesRef.current.splice(i, 1);
                  if (player.stats.hp <= 0) setGameState('gameover');
                  continue;
                }
              }
            }

            // Check collision with walls
            if (checkTileCollision(mapRef.current, p.pos.x, p.pos.y, p.radius) || p.duration <= 0) {
              projectilesRef.current.splice(i, 1);
            }
          }

          // 5. Environmental Hazards duration
          for (let i = hazardsRef.current.length - 1; i >= 0; i--) {
            const h = hazardsRef.current[i];
            h.duration -= dt;
            if (h.duration <= 0) {
              hazardsRef.current.splice(i, 1);
            }
          }

          // 6. Particles update
          for (let i = particlesRef.current.length - 1; i >= 0; i--) {
            const part = particlesRef.current[i];
            part.x += part.vx;
            part.y += part.vy;
            part.life -= dt;
            if (part.life <= 0) {
              particlesRef.current.splice(i, 1);
            }
          }

          // 7. Floating texts update
          for (let i = floatingTextsRef.current.length - 1; i >= 0; i--) {
            const ft = floatingTextsRef.current[i];
            ft.y -= 14 * dt;
            ft.duration -= dt;
            ft.alpha = ft.duration / 0.9;
            if (ft.duration <= 0) {
              floatingTextsRef.current.splice(i, 1);
            }
          }

          // 8. Decay screen shake
          if (screenShakeRef.current > 0) {
            screenShakeRef.current = Math.max(0, screenShakeRef.current - dt * 25);
          }

          // 9. Camera smooth follow
          const targetCamX = player.pos.x - VIRTUAL_WIDTH / 2;
          const targetCamY = player.pos.y - VIRTUAL_HEIGHT / 2;
          const maxCamX = mapRef.current.widthInTiles * TILE_SIZE - VIRTUAL_WIDTH;
          const maxCamY = mapRef.current.heightInTiles * TILE_SIZE - VIRTUAL_HEIGHT;
          cameraRef.current.x += (Math.max(0, Math.min(maxCamX, targetCamX)) - cameraRef.current.x) * 0.12;
          cameraRef.current.y += (Math.max(0, Math.min(maxCamY, targetCamY)) - cameraRef.current.y) * 0.12;
        }
      }

      // 10. Render Frame to Canvas
      if (canvasRef.current && rendererRef.current) {
        const ctx = canvasRef.current.getContext('2d');
        if (ctx) {
          rendererRef.current.render(ctx, canvasRef.current.width, canvasRef.current.height, {
            map: mapRef.current,
            player: playerRef.current,
            enemies: enemiesRef.current,
            props: propsRef.current,
            projectiles: projectilesRef.current,
            hazards: hazardsRef.current,
            particles: particlesRef.current,
            floatingTexts: floatingTextsRef.current,
            cameraX: cameraRef.current.x,
            cameraY: cameraRef.current.y,
            screenShake: screenShakeRef.current,
            weatherTimer: gameTimeRef.current,
            hitstopTimer: hitstopTimerRef.current,
            showCRT,
            gameTime: gameTimeRef.current
          });
        }
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [gameState, showCRT, loadSector]);

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

  const handleUseConsumable = (id: string) => {
    const player = playerRef.current;
    if (id === 'repair_stim') {
      player.stats.hp = Math.min(player.stats.maxHp, player.stats.hp + 50);
      audioManager.playSfx('pickup');
      addFloatingText(player.pos.x, player.pos.y - 16, '+50 HP ВІДНОВЛЕНО', '#22c55e');
    } else if (id === 'overdrive_battery') {
      player.stats.stamina = player.stats.maxStamina;
      audioManager.playSfx('shock');
      addFloatingText(player.pos.x, player.pos.y - 16, 'ПОВНИЙ ЗАРЯД!', '#38bdf8');
    }
    setIsInventoryOpen(false);
  };

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
            player={playerRef.current}
            sector={mapRef.current.info}
            currentTrack={audioManager.getCurrentTrack()}
            audioBands={audioBands}
            objectiveUk={objectiveUk}
            isPaused={false}
            showCRT={showCRT}
            isHandheldMode={isHandheldMode}
            onTogglePause={() => setGameState('paused')}
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
            onResume={() => setGameState('playing')}
            onRestart={() => {
              loadSector(currentSectorIdRef.current);
              setGameState('playing');
            }}
            onGoTitle={() => setGameState('title')}
          />
        )}

        {/* Victory Modal */}
        {gameState === 'victory' && (
          <VictoryModal
            clearTimeSec={runStats.timeSec}
            enemiesKilled={runStats.enemiesKilled}
            scrapCollected={runStats.scrapCollected}
            onPlayAgain={() => {
              setRunStats({ timeSec: 0, enemiesKilled: 0, scrapCollected: 0 });
              loadSector(1);
              setGameState('playing');
            }}
            onGoTitle={() => setGameState('title')}
          />
        )}

        {/* Game Over Modal */}
        {gameState === 'gameover' && (
          <GameOverModal
            sectorNameUk={mapRef.current.info.nameUk}
            enemiesKilled={runStats.enemiesKilled}
            scrapCollected={runStats.scrapCollected}
            onRetry={() => {
              playerRef.current.stats.hp = playerRef.current.stats.maxHp;
              playerRef.current.stats.stamina = playerRef.current.stats.maxStamina;
              loadSector(currentSectorIdRef.current);
              setGameState('playing');
            }}
            onGoTitle={() => setGameState('title')}
          />
        )}

        {/* Cyberdeck / Inventory Modal */}
        {isInventoryOpen && (
          <InventoryModal
            player={playerRef.current}
            onClose={() => setIsInventoryOpen(false)}
            onSelectWeapon={(w) => {
              playerRef.current.stats.equippedWeapon = w;
              setIsInventoryOpen(false);
            }}
            onToggleImplant={(impId) => {
              const current = playerRef.current.stats.equippedImplants;
              if (current.includes(impId)) {
                playerRef.current.stats.equippedImplants = current.filter((x) => x !== impId);
              } else {
                playerRef.current.stats.equippedImplants = [...current, impId];
              }
            }}
            onUseConsumable={handleUseConsumable}
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
