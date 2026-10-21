/**
 * 16-Bit Systemic Game Engine - Authoritative Portable Game Core
 * Self-contained simulation decoupled from DOM, React, Canvas, and browser APIs.
 * Manages game state, command processing, fixed-timestep physics, and event dispatch.
 */

import {
  GameState,
  PlayerEntity,
  EnemyEntity,
  WorldProp,
  Projectile,
  Particle,
  FloatingText,
  GameEvent,
  GameEventListener,
  PlayerInputIntent,
  PlayerActionCommand,
  WeaponType,
  SectorInfo
} from '../types';
import { SectorMap, generateSectorMap, checkTileCollision, TILE_SIZE, SECTORS } from '../engine/world';
import {
  getNextAttackPhase,
  calculateIncomingDamage,
  calculateKnockback,
  WEAPONS_CATALOG,
  IMPLANTS_CATALOG,
  PARRY_WINDOW_SEC,
  PARRY_COOLDOWN_SEC
} from '../systems/combat';
import { getElementalDamageMultiplier } from '../systems/elemental';
import { EnvironmentalSystem } from '../systems/environmental';
import { EnemyAISystem } from '../systems/enemyAI';

export const VIRTUAL_WIDTH = 384;
export const VIRTUAL_HEIGHT = 216;

export class GameCore {
  public gameState: GameState = 'title';
  public currentSectorId: number = 1;
  public map: SectorMap;
  public player: PlayerEntity;
  public enemies: EnemyEntity[] = [];
  public props: WorldProp[] = [];
  public projectiles: Projectile[] = [];
  public particles: Particle[] = [];
  public floatingTexts: FloatingText[] = [];
  public camera = { x: 0, y: 0 };
  public screenShake: number = 0;
  public hitstopTimer: number = 0;
  public gameTime: number = 0;
  public objectiveUk: string = '';

  public runStats = {
    timeSec: 0,
    enemiesKilled: 0,
    scrapCollected: 0
  };

  private environmentalSystem: EnvironmentalSystem;
  private enemyAISystem: EnemyAISystem;
  private listeners: Set<GameEventListener> = new Set();

  constructor() {
    this.map = generateSectorMap(1);
    this.environmentalSystem = new EnvironmentalSystem();
    this.enemyAISystem = new EnemyAISystem();
    this.player = this.createDefaultPlayer(this.map.playerSpawn);
  }

  private createDefaultPlayer(spawn: { x: number; y: number }): PlayerEntity {
    return {
      pos: { ...spawn },
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
          { id: 'overdrive_battery', nameUk: 'Овердрайв Батарея', count: 1, type: 'consumable', descriptionUk: 'Повний заряд енергії.' }
        ]
      },
      attackPhase: 'none',
      attackTimer: 0,
      attackCooldown: 0,
      comboCount: 0,
      comboTimer: 0,
      invulnTimer: 0,
      isParrying: false,
      parryTimer: 0,
      parryCooldown: 0,
      isDashing: false,
      dashTimer: 0
    };
  }

  public subscribe(listener: GameEventListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  public emit(event: GameEvent): void {
    for (const listener of this.listeners) {
      listener(event);
    }
  }

  public getHazards() {
    return this.environmentalSystem.getHazards();
  }

  public start(): void {
    this.gameState = 'playing';
    this.emit({ type: 'stateChange', newState: 'playing' });
    this.loadSector(1);
  }

  public pause(): void {
    if (this.gameState === 'playing') {
      this.gameState = 'paused';
      this.emit({ type: 'stateChange', newState: 'paused' });
    }
  }

  public resume(): void {
    if (this.gameState === 'paused') {
      this.gameState = 'playing';
      this.emit({ type: 'stateChange', newState: 'playing' });
    }
  }

  public loadSector(sectorId: number): void {
    this.currentSectorId = sectorId;
    this.map = generateSectorMap(sectorId);
    this.enemies = [...this.map.enemies];
    this.props = [...this.map.props];
    this.projectiles = [];
    this.environmentalSystem.clear();

    this.player.pos = { ...this.map.playerSpawn };
    this.player.vel = { x: 0, y: 0 };

    // Reset stuck combat states when changing sectors
    this.player.isParrying = false;
    this.player.parryTimer = 0;
    this.player.parryCooldown = 0;
    this.player.isDashing = false;
    this.player.dashTimer = 0;
    this.player.attackPhase = 'none';
    this.player.attackTimer = 0;
    this.player.invulnTimer = 0;

    if (sectorId === 1) {
      this.objectiveUk = 'Знайдіть термінал безпеки та відімкніть шлюз до Корозійного Реактора.';
    } else if (sectorId === 2) {
      this.objectiveUk = 'Подолайте токсичних дронів і знешкодьте захист охолоджувача.';
    } else if (sectorId === 3) {
      this.objectiveUk = 'Пройдіть крізь Тіньові Тунелі до Святилища Архітектора Корпусу.';
    } else if (sectorId === 4) {
      this.objectiveUk = 'УВАГА: Фінальний бій! Знищіть АРХІТЕКТОРА КОРПУСУ та підкоріть Ядро Сталі!';
    }

    this.emit({ type: 'sectorChange', sectorId, nameUk: this.map.info.nameUk });
    this.emit({ type: 'track', trackKey: this.map.info.ambientTrack });
    this.emit({ type: 'objectiveChange', textUk: this.objectiveUk });
    this.emit({
      type: 'floatText',
      x: this.map.playerSpawn.x,
      y: this.map.playerSpawn.y - 16,
      text: `ВХІД: ${this.map.info.nameUk}`,
      color: '#38bdf8'
    });
  }

  public restartCurrentSector(): void {
    this.player.stats.hp = this.player.stats.maxHp;
    this.player.stats.stamina = this.player.stats.maxStamina;
    this.loadSector(this.currentSectorId);
    this.gameState = 'playing';
    this.emit({ type: 'stateChange', newState: 'playing' });
  }

  public resetGame(): void {
    this.runStats = { timeSec: 0, enemiesKilled: 0, scrapCollected: 0 };
    this.player = this.createDefaultPlayer({ x: 48, y: 192 });
    this.loadSector(1);
    this.gameState = 'playing';
    this.emit({ type: 'stateChange', newState: 'playing' });
  }

  public selectWeapon(weaponId: WeaponType): void {
    this.player.stats.equippedWeapon = weaponId;
  }

  public toggleImplant(implantId: string): void {
    const current = this.player.stats.equippedImplants;
    if (current.includes(implantId)) {
      this.player.stats.equippedImplants = current.filter((x) => x !== implantId);
    } else {
      this.player.stats.equippedImplants = [...current, implantId];
    }
  }

  public useConsumable(itemId: string): void {
    if (itemId === 'repair_stim') {
      this.player.stats.hp = Math.min(this.player.stats.maxHp, this.player.stats.hp + 50);
      this.emit({ type: 'sfx', sound: 'pickup' });
      this.emit({
        type: 'floatText',
        x: this.player.pos.x,
        y: this.player.pos.y - 16,
        text: '+50 HP ВІДНОВЛЕНО',
        color: '#22c55e'
      });
    } else if (itemId === 'overdrive_battery') {
      this.player.stats.stamina = this.player.stats.maxStamina;
      this.emit({ type: 'sfx', sound: 'shock' });
      this.emit({
        type: 'floatText',
        x: this.player.pos.x,
        y: this.player.pos.y - 16,
        text: 'ПОВНИЙ ЗАРЯД!',
        color: '#38bdf8'
      });
    }
  }

  /**
   * Central authoritative damage handler for the player.
   * Handles parry windows, implants, float text, sound effects, and reliable gameover transition.
   */
  public applyDamageToPlayer(
    rawDamage: number,
    sourceName: string,
    ignoreParry: boolean = false,
    element: ElementType = 'normal'
  ): { damageDealt: number; parried: boolean; died: boolean } {
    if (this.player.invulnTimer > 0 && !ignoreParry) {
      return { damageDealt: 0, parried: false, died: false };
    }

    const isParryingActive = !ignoreParry && this.player.isParrying && this.player.parryTimer > 0;
    const incoming = calculateIncomingDamage(
      rawDamage,
      isParryingActive,
      false,
      this.player.stats.equippedImplants
    );

    if (incoming.parrySuccess) {
      this.emit({ type: 'sfx', sound: 'parry' });
      this.emit({ type: 'shake', amount: 3 });
      this.emit({
        type: 'floatText',
        x: this.player.pos.x,
        y: this.player.pos.y - 12,
        text: 'ПАРИРОВАНО!',
        color: '#38bdf8'
      });
      if (this.player.stats.equippedImplants.includes('kinetic_dynamo')) {
        this.player.stats.stamina = Math.min(this.player.stats.maxStamina, this.player.stats.stamina + 15);
      }
      return { damageDealt: 0, parried: true, died: false };
    }

    if (incoming.absorbed) {
      return { damageDealt: 0, parried: false, died: false };
    }

    const finalDmg = incoming.finalDamage;
    this.player.stats.hp = Math.max(0, this.player.stats.hp - finalDmg);
    this.player.invulnTimer = 0.4;
    this.emit({ type: 'sfx', sound: 'player_hurt' });
    this.emit({
      type: 'floatText',
      x: this.player.pos.x,
      y: this.player.pos.y - 12,
      text: `-${finalDmg} ${sourceName}`,
      color: '#ef4444'
    });

    let died = false;
    if (this.player.stats.hp <= 0) {
      died = true;
      this.player.isParrying = false;
      this.player.parryTimer = 0;
      this.player.isDashing = false;
      this.gameState = 'gameover';
      this.emit({ type: 'stateChange', newState: 'gameover' });
    }

    return { damageDealt: finalDmg, parried: false, died };
  }

  /**
   * Central authoritative damage handler for enemies.
   * Ensures dead enemies stop attacking, transitions to 'ko', and awards scrap and kill counters exactly once.
   */
  public applyDamageToEnemy(
    enemy: EnemyEntity,
    rawDamage: number,
    sourceElement: ElementType = 'normal',
    knockbackImpulse: number = 0,
    sourcePos?: Vector2D
  ): { damageDealt: number; killed: boolean } {
    // A dead enemy cannot take damage or award duplicate rewards!
    if (enemy.state === 'ko') {
      return { damageDealt: 0, killed: false };
    }

    const mult = getElementalDamageMultiplier(sourceElement, enemy.elementalStatus?.type);
    const finalDmg = Math.max(1, Math.round(rawDamage * mult));
    enemy.hp = Math.max(0, enemy.hp - finalDmg);
    enemy.invulnTimer = 0.12;

    if (knockbackImpulse > 0 && sourcePos) {
      const kb = calculateKnockback(sourcePos.x, sourcePos.y, enemy.pos.x, enemy.pos.y, knockbackImpulse);
      enemy.vel.x = kb.vx;
      enemy.vel.y = kb.vy;
    }

    if (enemy.hp <= 0) {
      enemy.state = 'ko';
      enemy.hp = 0;
      enemy.vel.x = 0;
      enemy.vel.y = 0;

      // Granted EXACTLY ONCE
      this.runStats.enemiesKilled++;
      const rewardScrap = enemy.type === 'warden_boss' ? 100 : (enemy.type === 'enforcer_heavy' ? 40 : 20);
      this.player.stats.scrap += rewardScrap;
      this.runStats.scrapCollected += rewardScrap;

      this.emit({ type: 'sfx', sound: enemy.type === 'warden_boss' ? 'boss_roar' : 'pickup' });
      this.emit({
        type: 'particle',
        x: enemy.pos.x,
        y: enemy.pos.y,
        color: '#f59e0b',
        count: 16,
        speed: 180
      });
      this.emit({
        type: 'floatText',
        x: enemy.pos.x,
        y: enemy.pos.y - 14,
        text: enemy.type === 'warden_boss' ? 'АРХІТЕКТОРА ЗНИЩЕНО!' : 'НЕЙТРАЛІЗОВАНО!',
        color: '#10b981'
      });

      if (enemy.type === 'warden_boss') {
        this.emit({ type: 'shake', amount: 10 });
        setTimeout(() => {
          this.gameState = 'victory';
          this.emit({ type: 'stateChange', newState: 'victory' });
        }, 1200);
      }

      return { damageDealt: finalDmg, killed: true };
    }

    return { damageDealt: finalDmg, killed: false };
  }

  public executeAction(action: PlayerActionCommand): void {
    if (this.gameState !== 'playing') return;

    if (action === 'interact') {
      this.handleInteract();
      return;
    }

    const { nextPhase, comboCount, damageMultiplier, staminaRequired } = getNextAttackPhase(
      this.player.attackPhase,
      action,
      this.player.comboTimer
    );

    if (this.player.stats.stamina < staminaRequired) {
      this.emit({
        type: 'floatText',
        x: this.player.pos.x,
        y: this.player.pos.y - 12,
        text: 'МАЛО ЕНЕРГІЇ!',
        color: '#f59e0b'
      });
      this.emit({ type: 'sfx', sound: 'player_hurt' });
      return;
    }

    // Deduct stamina
    this.player.stats.stamina = Math.max(0, this.player.stats.stamina - staminaRequired);
    this.player.attackPhase = nextPhase;
    this.player.comboCount = comboCount;
    this.player.comboTimer = 1.1;
    this.player.attackTimer = 0.22;

    const weapon = WEAPONS_CATALOG[this.player.stats.equippedWeapon];

    if (action === 'dash') {
      this.player.isDashing = true;
      this.player.dashTimer = 0.22;
      this.player.invulnTimer = 0.24;
      const dashSpeed = this.player.stats.equippedImplants.includes('overclock_core') ? 450 : 350; // px/sec

      let dx = 0;
      let dy = 0;
      if (this.player.dir === 'right') dx = 1;
      else if (this.player.dir === 'left') dx = -1;
      else if (this.player.dir === 'up') dy = -1;
      else if (this.player.dir === 'down') dy = 1;

      this.player.vel.x = dx * dashSpeed;
      this.player.vel.y = dy * dashSpeed;
      this.emit({ type: 'sfx', sound: 'dash' });
      this.emit({
        type: 'particle',
        x: this.player.pos.x,
        y: this.player.pos.y,
        color: '#06b6d4',
        count: 8,
        speed: 3
      });
      return;
    }

    if (action === 'parry') {
      if (this.player.parryCooldown > 0) return;
      this.player.isParrying = true;
      this.player.parryTimer = PARRY_WINDOW_SEC;
      this.player.parryCooldown = PARRY_COOLDOWN_SEC;
      this.player.attackTimer = PARRY_WINDOW_SEC;
      this.emit({ type: 'sfx', sound: 'swing' });
      return;
    }

    if (action === 'emp') {
      this.emit({ type: 'sfx', sound: 'shock' });
      this.emit({ type: 'shake', amount: 6 });
      this.emit({
        type: 'particle',
        x: this.player.pos.x,
        y: this.player.pos.y,
        color: '#38bdf8',
        count: 22,
        speed: 180
      });
      this.emit({
        type: 'floatText',
        x: this.player.pos.x,
        y: this.player.pos.y - 16,
        text: 'ЕМІ ШОКХВИЛЯ!',
        color: '#38bdf8'
      });

      const empRadius = this.player.stats.equippedImplants.includes('arc_conductor') ? 96 : 56;
      for (const enemy of this.enemies) {
        if (enemy.state === 'ko') continue;
        const dist = Math.hypot(enemy.pos.x - this.player.pos.x, enemy.pos.y - this.player.pos.y);
        if (dist <= empRadius) {
          this.applyDamageToEnemy(enemy, 35, 'electricity', 120, this.player.pos);
          if (enemy.state !== 'ko') {
            enemy.state = 'stunned';
            enemy.stateTimer = 2.0;
            this.emit({
              type: 'floatText',
              x: enemy.pos.x,
              y: enemy.pos.y - 10,
              text: 'СТУН!',
              color: '#fef08a'
            });
          }
        }
      }
      return;
    }

    // Light or Heavy Melee Strike
    if (action === 'light') {
      this.emit({ type: 'sfx', sound: 'swing' });
    } else {
      this.emit({ type: 'sfx', sound: 'heavy_hit' });
      this.emit({ type: 'shake', amount: 4 });
    }

    // Hitbox calculation
    let hx = this.player.pos.x;
    let hy = this.player.pos.y;
    const reach = action === 'heavy' ? 24 : 16;
    if (this.player.dir === 'right') hx += reach;
    else if (this.player.dir === 'left') hx -= reach;
    else if (this.player.dir === 'up') hy -= reach;
    else if (this.player.dir === 'down') hy += reach;

    const hitRadius = action === 'heavy' ? 22 : 15;
    const baseDamage = weapon.damage * damageMultiplier;

    // Hit Props
    for (const prop of this.props) {
      if (prop.state === 'destroyed') continue;
      const dist = Math.hypot(prop.pos.x + 8 - hx, prop.pos.y + 8 - hy);
      if (dist <= hitRadius + 8) {
        prop.hp -= baseDamage;

        if (prop.type === 'crate_scrap') {
          this.emit({ type: 'sfx', sound: 'heavy_hit' });
          this.emit({
            type: 'particle',
            x: prop.pos.x + 8,
            y: prop.pos.y + 8,
            color: '#92400e',
            count: 10,
            speed: 3
          });
          if (prop.hp <= 0) {
            prop.state = 'destroyed';
            this.player.stats.scrap += 15;
            this.runStats.scrapCollected += 15;
            this.emit({ type: 'sfx', sound: 'pickup' });
            this.emit({
              type: 'floatText',
              x: prop.pos.x,
              y: prop.pos.y,
              text: '+15 СКРАПУ',
              color: '#f59e0b'
            });
          }
        } else if (prop.type === 'barrel_oil') {
          prop.state = 'ignited';
          prop.stateTimer = 0.5;
          this.emit({ type: 'sfx', sound: 'shock' });
          this.emit({
            type: 'floatText',
            x: prop.pos.x,
            y: prop.pos.y,
            text: 'УВАГА: ДЕТОНАЦІЯ!',
            color: '#ef4444'
          });
        } else if (prop.type === 'canister_cryo') {
          prop.state = 'destroyed';
          this.emit({ type: 'sfx', sound: 'freeze' });
          this.emit({ type: 'shake', amount: 5 });
          const events: GameEvent[] = [];
          this.environmentalSystem.addHazard(
            { x: prop.pos.x + 8, y: prop.pos.y + 8 },
            46,
            'ice',
            6.0,
            this.map,
            this.props,
            this.enemies,
            events
          );
          for (const ev of events) this.emit(ev);
        } else if (prop.type === 'generator_arc') {
          this.emit({ type: 'sfx', sound: 'shock' });
          const events: GameEvent[] = [];
          this.environmentalSystem.addHazard(
            { x: prop.pos.x + 8, y: prop.pos.y + 8 },
            54,
            'electricity',
            3.5,
            this.map,
            this.props,
            this.enemies,
            events
          );
          for (const ev of events) this.emit(ev);
        } else if (prop.type === 'terminal_security') {
          if (prop.state !== 'activated' && prop.state !== 'hacked') {
            prop.state = 'activated';
            this.emit({ type: 'sfx', sound: 'terminal' });
            this.emit({
              type: 'floatText',
              x: prop.pos.x,
              y: prop.pos.y,
              text: 'ШЛЮЗ ВІДЧИНЕНО!',
              color: '#22c55e'
            });
            for (const d of this.props) {
              if (d.type === 'blast_door') d.state = 'activated';
            }
          }
        }
      }
    }

    // Hit Enemies
    let hitCount = 0;
    for (const enemy of this.enemies) {
      if (enemy.state === 'ko') continue;
      const dist = Math.hypot(enemy.pos.x - hx, enemy.pos.y - hy);
      if (dist <= hitRadius + 8) {
        hitCount++;
        const kbImpulse = action === 'heavy' ? 280 : 160;
        const { damageDealt, killed } = this.applyDamageToEnemy(
          enemy,
          baseDamage,
          weapon.element,
          kbImpulse,
          this.player.pos
        );

        if (action === 'heavy') {
          this.emit({ type: 'hitstop', duration: 0.06 });
          this.emit({ type: 'shake', amount: 4 });
          this.emit({ type: 'sfx', sound: 'heavy_hit' });
          if (!killed) {
            this.emit({
              type: 'floatText',
              x: enemy.pos.x,
              y: enemy.pos.y - 12,
              text: `-${damageDealt} КРИТ!`,
              color: '#f59e0b'
            });
          }
        } else {
          this.emit({ type: 'sfx', sound: 'heavy_hit' });
          if (!killed) {
            this.emit({
              type: 'floatText',
              x: enemy.pos.x,
              y: enemy.pos.y - 12,
              text: `-${damageDealt}`,
              color: '#f8fafc'
            });
          }
        }
      }
    }

    // Kinetic Dynamo bonus
    if (hitCount > 0 && this.player.stats.equippedImplants.includes('kinetic_dynamo')) {
      this.player.stats.stamina = Math.min(this.player.stats.maxStamina, this.player.stats.stamina + 12);
    }
  }

  public handleInteract(): void {
    const p = this.player;
    for (const prop of this.props) {
      const dist = Math.hypot(prop.pos.x + 8 - p.pos.x, prop.pos.y + 8 - p.pos.y);
      if (dist < 28) {
        if (prop.type === 'terminal_security') {
          prop.state = 'activated';
          this.emit({ type: 'sfx', sound: 'terminal' });
          this.emit({
            type: 'floatText',
            x: prop.pos.x,
            y: prop.pos.y,
            text: 'ШЛЮЗ ВІДЧИНЕНО!',
            color: '#22c55e'
          });
          for (const d of this.props) {
            if (d.type === 'blast_door') d.state = 'activated';
          }
        } else if (prop.type === 'blast_door' && prop.sectorGate && (prop.state === 'activated' || prop.state === 'hacked')) {
          this.loadSector(prop.sectorGate);
        }
      }
    }
  }

  /**
   * Main Portable Simulation Step.
   * Uses delta-time (in seconds) with calibrated velocity in pixels/second.
   */
  public update(dt: number, intent: PlayerInputIntent): void {
    if (this.gameState !== 'playing') return;

    this.gameTime += dt;
    this.runStats.timeSec += dt;

    // Process queued actions
    for (const act of intent.actions) {
      this.executeAction(act);
    }

    // Hitstop freeze check
    if (this.hitstopTimer > 0) {
      this.hitstopTimer -= dt;
      return;
    }

    // 1. Player Physics with consistent units (pixels/second)
    const baseSpeed = this.player.stats.equippedImplants.includes('overclock_core') ? 135 : 110; // px/sec

    if (!this.player.isDashing) {
      this.player.vel.x = intent.moveX * baseSpeed;
      this.player.vel.y = intent.moveY * baseSpeed;

      if (intent.moveX !== 0 || intent.moveY !== 0) {
        if (Math.abs(intent.moveX) > Math.abs(intent.moveY)) {
          this.player.dir = intent.moveX > 0 ? 'right' : 'left';
        } else {
          this.player.dir = intent.moveY > 0 ? 'down' : 'up';
        }
      }
    } else {
      this.player.dashTimer -= dt;
      if (this.player.dashTimer <= 0) {
        this.player.isDashing = false;
      }
    }

    // Integrate player movement with map collision
    const nextX = this.player.pos.x + this.player.vel.x * dt;
    if (!checkTileCollision(this.map, nextX, this.player.pos.y, 6)) {
      this.player.pos.x = nextX;
    }
    const nextY = this.player.pos.y + this.player.vel.y * dt;
    if (!checkTileCollision(this.map, this.player.pos.x, nextY, 6)) {
      this.player.pos.y = nextY;
    }

    // Automatic blast door check
    for (const prop of this.props) {
      if (prop.type === 'blast_door' && prop.sectorGate && (prop.state === 'activated' || prop.state === 'hacked')) {
        const dist = Math.hypot(prop.pos.x + 8 - this.player.pos.x, prop.pos.y + 8 - this.player.pos.y);
        if (dist < 16) {
          this.loadSector(prop.sectorGate);
          break;
        }
      }
    }

    // Stamina regen
    this.player.stats.stamina = Math.min(this.player.stats.maxStamina, this.player.stats.stamina + 20 * dt);

    // Timers
    if (this.player.invulnTimer > 0) this.player.invulnTimer -= dt;
    if (this.player.attackTimer > 0) this.player.attackTimer -= dt;
    else this.player.attackPhase = 'none';

    // Parry active window and cooldown lifecycle
    if (this.player.parryCooldown > 0) {
      this.player.parryCooldown = Math.max(0, this.player.parryCooldown - dt);
    }
    if (this.player.parryTimer > 0) {
      this.player.parryTimer = Math.max(0, this.player.parryTimer - dt);
      if (this.player.parryTimer <= 0) {
        this.player.isParrying = false;
      }
    } else {
      this.player.isParrying = false;
    }

    if (this.player.comboTimer > 0) {
      this.player.comboTimer -= dt;
    } else {
      this.player.comboCount = 0;
    }

    // Environmental tile check beneath player
    const tileX = Math.floor(this.player.pos.x / TILE_SIZE);
    const tileY = Math.floor(this.player.pos.y / TILE_SIZE);
    if (tileX >= 0 && tileX < this.map.widthInTiles && tileY >= 0 && tileY < this.map.heightInTiles) {
      const currentTile = this.map.tiles[tileY][tileX];
      if (currentTile === 'hazard_acid' && this.player.invulnTimer <= 0) {
        this.applyDamageToPlayer(8, 'КИСЛОТА', true, 'acid');
      }
    }

    // 2. Prop countdowns (e.g. ignited oil barrels detonating)
    for (const prop of this.props) {
      if (prop.state === 'ignited') {
        prop.stateTimer -= dt;
        if (prop.stateTimer <= 0) {
          prop.state = 'destroyed';
          this.emit({ type: 'sfx', sound: 'explosion' });
          this.emit({ type: 'shake', amount: 8 });
          this.emit({
            type: 'particle',
            x: prop.pos.x + 8,
            y: prop.pos.y + 8,
            color: '#f59e0b',
            count: 28,
            speed: 200
          });

          const events: GameEvent[] = [];
          this.environmentalSystem.addHazard(
            { x: prop.pos.x + 8, y: prop.pos.y + 8 },
            48,
            'fire',
            4.0,
            this.map,
            this.props,
            this.enemies,
            events,
            (enemy, dmg, elem) => this.applyDamageToEnemy(enemy, dmg, elem, 220, prop.pos)
          );
          for (const ev of events) this.emit(ev);

          // Direct explosion blast to player
          const playerDist = Math.hypot(this.player.pos.x - (prop.pos.x + 8), this.player.pos.y - (prop.pos.y + 8));
          if (playerDist <= 48 && this.player.invulnTimer <= 0) {
            this.applyDamageToPlayer(30, 'ВИБУХ', false, 'fire');
          }
        }
      }
    }

    // 3. Update Enemy AI
    const enemyEvents: GameEvent[] = [];
    this.enemyAISystem.update(this.enemies, {
      dt,
      player: this.player,
      projectiles: this.projectiles,
      events: enemyEvents,
      applyDamageToPlayer: (dmg, source, ignoreParry) => {
        const res = this.applyDamageToPlayer(dmg, source, ignoreParry);
        return res.parried;
      }
    });
    for (const ev of enemyEvents) this.emit(ev);

    // 4. Update Environmental hazards (periodic damage/status ticks)
    const hazardEvents: GameEvent[] = [];
    this.environmentalSystem.update(
      dt,
      this.player,
      this.enemies,
      hazardEvents,
      (dmg, sourceName, elem) => this.applyDamageToPlayer(dmg, sourceName, false, elem),
      (enemy, dmg, elem) => this.applyDamageToEnemy(enemy, dmg, elem)
    );
    for (const ev of hazardEvents) this.emit(ev);

    // 5. Update Projectiles
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      // Movement integration: velocity in px/sec multiplied by dt
      p.pos.x += p.vel.x * dt;
      p.pos.y += p.vel.y * dt;
      p.duration -= dt;

      if (p.owner === 'enemy') {
        const dist = Math.hypot(p.pos.x - this.player.pos.x, p.pos.y - this.player.pos.y);
        if (dist < 10 && this.player.invulnTimer <= 0) {
          const res = this.applyDamageToPlayer(p.damage, 'ЛАЗЕР', false, p.element);
          if (res.parried) {
            p.owner = 'player';
            p.vel.x *= -1.5;
            p.vel.y *= -1.5;
            p.duration = 2.0;
            continue;
          } else {
            this.projectiles.splice(i, 1);
            continue;
          }
        }
      } else if (p.owner === 'player') {
        for (const enemy of this.enemies) {
          if (enemy.state === 'ko') continue;
          const dist = Math.hypot(p.pos.x - enemy.pos.x, p.pos.y - enemy.pos.y);
          if (dist < 12 + p.radius && enemy.invulnTimer <= 0) {
            this.applyDamageToEnemy(enemy, p.damage, p.element, 180, p.pos);
            this.emit({ type: 'sfx', sound: 'heavy_hit' });
            this.projectiles.splice(i, 1);
            break;
          }
        }
      }

      if (checkTileCollision(this.map, p.pos.x, p.pos.y, p.radius) || p.duration <= 0) {
        this.projectiles.splice(i, 1);
      }
    }

    // 6. Update Particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const part = this.particles[i];
      part.x += part.vx * dt;
      part.y += part.vy * dt;
      part.life -= dt;
      if (part.life <= 0) {
        this.particles.splice(i, 1);
      }
    }

    // 7. Update Floating Combat Texts
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.y -= 14 * dt;
      ft.duration -= dt;
      ft.alpha = ft.duration / 0.9;
      if (ft.duration <= 0) {
        this.floatingTexts.splice(i, 1);
      }
    }

    // 8. Decay screen shake
    if (this.screenShake > 0) {
      this.screenShake = Math.max(0, this.screenShake - dt * 25);
    }

    // 9. Smooth camera tracking
    const targetCamX = this.player.pos.x - VIRTUAL_WIDTH / 2;
    const targetCamY = this.player.pos.y - VIRTUAL_HEIGHT / 2;
    const maxCamX = this.map.widthInTiles * TILE_SIZE - VIRTUAL_WIDTH;
    const maxCamY = this.map.heightInTiles * TILE_SIZE - VIRTUAL_HEIGHT;
    this.camera.x += (Math.max(0, Math.min(maxCamX, targetCamX)) - this.camera.x) * (1 - Math.pow(0.001, dt));
    this.camera.y += (Math.max(0, Math.min(maxCamY, targetCamY)) - this.camera.y) * (1 - Math.pow(0.001, dt));
  }
}
