/**
 * 16-Bit Systemic Game Engine - Environmental & Hazard System
 * Integrates elemental reactions, tile conversions, prop chain reactions,
 * and entity hazard tick effects into the authoritative simulation.
 */

import { ElementType, EnvironmentalHazard, EnemyEntity, PlayerEntity, WorldProp, GameEvent } from '../types';
import { SectorMap, TILE_SIZE, TileType } from '../engine/world';
import { resolveElementalReaction, getElementalDamageMultiplier } from './elemental';

export interface HazardTickResult {
  playerDamage: number;
  playerStunned: boolean;
  playerStatus?: { type: ElementType; duration: number };
  events: GameEvent[];
}

export class EnvironmentalSystem {
  private hazards: EnvironmentalHazard[] = [];
  private hazardTickTimer: number = 0;
  private readonly TICK_INTERVAL = 0.4; // Apply periodic environmental hazard ticks every 400ms

  constructor(initialHazards: EnvironmentalHazard[] = []) {
    this.hazards = [...initialHazards];
  }

  public getHazards(): EnvironmentalHazard[] {
    return this.hazards;
  }

  public clear(): void {
    this.hazards = [];
    this.hazardTickTimer = 0;
  }

  /**
   * Spawns an environmental hazard and immediately resolves reactions with overlapping hazards, tiles, and props.
   */
  public addHazard(
    pos: { x: number; y: number },
    radius: number,
    element: ElementType,
    duration: number,
    map: SectorMap,
    props: WorldProp[],
    enemies: EnemyEntity[],
    events: GameEvent[],
    onDamageEnemy?: (enemy: EnemyEntity, damage: number, element: ElementType) => void
  ): EnvironmentalHazard {
    const newHazard: EnvironmentalHazard = {
      id: Math.random(),
      pos: { ...pos },
      radius,
      element,
      duration
    };

    // 1. Resolve reactions with map tiles underneath hazard
    this.resolveTileReactions(newHazard, map, events);

    // 2. Resolve reactions with overlapping existing hazards
    this.resolveOverlappingHazards(newHazard, events);

    // 3. Resolve reactions with interactive props
    this.resolvePropReactions(newHazard, props, events);

    // 4. Apply immediate impact to enemies in radius
    this.applyInstantEnemyEffects(newHazard, enemies, events, onDamageEnemy);

    this.hazards.push(newHazard);
    return newHazard;
  }

  /**
   * Transforms map tiles based on elemental contact (e.g. water + electricity, water + ice -> ice tile)
   */
  private resolveTileReactions(hazard: EnvironmentalHazard, map: SectorMap, events: GameEvent[]): void {
    const minTX = Math.max(0, Math.floor((hazard.pos.x - hazard.radius) / TILE_SIZE));
    const maxTX = Math.min(map.widthInTiles - 1, Math.floor((hazard.pos.x + hazard.radius) / TILE_SIZE));
    const minTY = Math.max(0, Math.floor((hazard.pos.y - hazard.radius) / TILE_SIZE));
    const maxTY = Math.min(map.heightInTiles - 1, Math.floor((hazard.pos.y + hazard.radius) / TILE_SIZE));

    for (let ty = minTY; ty <= maxTY; ty++) {
      for (let tx = minTX; tx <= maxTX; tx++) {
        const tile = map.tiles[ty][tx];
        const tileCenterX = tx * TILE_SIZE + TILE_SIZE / 2;
        const tileCenterY = ty * TILE_SIZE + TILE_SIZE / 2;
        const dist = Math.hypot(tileCenterX - hazard.pos.x, tileCenterY - hazard.pos.y);

        if (dist <= hazard.radius) {
          // Water tile reactions
          if (tile === 'puddle_water') {
            if (hazard.element === 'electricity') {
              const reaction = resolveElementalReaction('water', 'electricity');
              events.push({ type: 'sfx', sound: 'shock' });
              events.push({ type: 'shake', amount: 3 });
              events.push({
                type: 'particle',
                x: tileCenterX,
                y: tileCenterY,
                color: '#38bdf8',
                count: 10,
                speed: 3
              });
              events.push({
                type: 'floatText',
                x: tileCenterX,
                y: tileCenterY - 10,
                text: reaction.messageUk || 'СТРУМ!',
                color: '#38bdf8'
              });
            } else if (hazard.element === 'ice') {
              // Water freezes into solid ice sheet!
              map.tiles[ty][tx] = 'sheet_ice';
              const reaction = resolveElementalReaction('water', 'ice');
              events.push({ type: 'sfx', sound: 'freeze' });
              events.push({
                type: 'particle',
                x: tileCenterX,
                y: tileCenterY,
                color: '#a5f3fc',
                count: 8,
                speed: 2
              });
              events.push({
                type: 'floatText',
                x: tileCenterX,
                y: tileCenterY - 10,
                text: reaction.messageUk || 'КРИГА!',
                color: '#67e8f9'
              });
            }
          }

          // Oil spill reactions
          if (tile === 'spill_oil') {
            if (hazard.element === 'fire' || hazard.element === 'electricity') {
              // Oil ignites and burns out
              map.tiles[ty][tx] = 'floor_concrete';
              const reaction = resolveElementalReaction('oil', hazard.element);
              events.push({ type: 'sfx', sound: 'explosion' });
              events.push({ type: 'shake', amount: 5 });
              events.push({
                type: 'particle',
                x: tileCenterX,
                y: tileCenterY,
                color: '#f97316',
                count: 16,
                speed: 4
              });
              events.push({
                type: 'floatText',
                x: tileCenterX,
                y: tileCenterY - 12,
                text: reaction.messageUk || 'ВИБУХ НАФТИ!',
                color: '#ef4444'
              });
            }
          }
        }
      }
    }
  }

  /**
   * Resolves interaction between overlapping hazards (e.g. fire hazard touching oil hazard)
   */
  private resolveOverlappingHazards(newHazard: EnvironmentalHazard, events: GameEvent[]): void {
    for (const existing of this.hazards) {
      const dist = Math.hypot(existing.pos.x - newHazard.pos.x, existing.pos.y - newHazard.pos.y);
      if (dist < existing.radius + newHazard.radius) {
        const reaction = resolveElementalReaction(newHazard.element, existing.element);
        if (reaction.triggered) {
          if (reaction.effect === 'explosion') {
            events.push({ type: 'sfx', sound: 'explosion' });
            events.push({ type: 'shake', amount: 6 });
            events.push({
              type: 'particle',
              x: (existing.pos.x + newHazard.pos.x) / 2,
              y: (existing.pos.y + newHazard.pos.y) / 2,
              color: '#f59e0b',
              count: 20,
              speed: 4.5
            });
          } else if (reaction.effect === 'steam_burst') {
            events.push({ type: 'sfx', sound: 'swing' });
            events.push({
              type: 'particle',
              x: (existing.pos.x + newHazard.pos.x) / 2,
              y: (existing.pos.y + newHazard.pos.y) / 2,
              color: '#cbd5e1',
              count: 14,
              speed: 2
            });
          }
          if (reaction.messageUk) {
            events.push({
              type: 'floatText',
              x: (existing.pos.x + newHazard.pos.x) / 2,
              y: (existing.pos.y + newHazard.pos.y) / 2 - 14,
              text: reaction.messageUk,
              color: '#fef08a'
            });
          }
        }
      }
    }
  }

  /**
   * Triggers props affected by elemental hazards
   */
  private resolvePropReactions(hazard: EnvironmentalHazard, props: WorldProp[], events: GameEvent[]): void {
    for (const prop of props) {
      if (prop.state === 'destroyed') continue;
      const propCenterX = prop.pos.x + 8;
      const propCenterY = prop.pos.y + 8;
      const dist = Math.hypot(propCenterX - hazard.pos.x, propCenterY - hazard.pos.y);

      if (dist <= hazard.radius + 8) {
        if (prop.type === 'barrel_oil' && (hazard.element === 'fire' || hazard.element === 'electricity')) {
          if (prop.state !== 'ignited') {
            prop.state = 'ignited';
            prop.stateTimer = 0.4;
            events.push({ type: 'sfx', sound: 'shock' });
            events.push({
              type: 'floatText',
              x: propCenterX,
              y: propCenterY - 12,
              text: 'УВАГА: ДЕТОНАЦІЯ!',
              color: '#ef4444'
            });
          }
        }
      }
    }
  }

  /**
   * Applies immediate elemental statuses to enemies when hazard appears
   */
  /**
   * Applies immediate elemental statuses to enemies when hazard appears
   */
  private applyInstantEnemyEffects(
    hazard: EnvironmentalHazard,
    enemies: EnemyEntity[],
    events: GameEvent[],
    onDamageEnemy?: (enemy: EnemyEntity, damage: number, element: ElementType) => void
  ): void {
    for (const enemy of enemies) {
      if (enemy.state === 'ko') continue;
      const dist = Math.hypot(enemy.pos.x - hazard.pos.x, enemy.pos.y - hazard.pos.y);
      if (dist <= hazard.radius + 6) {
        if (hazard.element === 'electricity') {
          const mult = getElementalDamageMultiplier('electricity', enemy.elementalStatus?.type);
          const dmg = Math.round(20 * mult);
          if (onDamageEnemy) {
            onDamageEnemy(enemy, dmg, 'electricity');
          } else {
            enemy.hp = Math.max(0, enemy.hp - dmg);
            if (enemy.hp <= 0) enemy.state = 'ko';
          }
          if (enemy.state !== 'ko') {
            enemy.state = 'stunned';
            enemy.stateTimer = 1.8;
            enemy.elementalStatus = { type: 'electricity', duration: 3.0 };
          }
          events.push({
            type: 'floatText',
            x: enemy.pos.x,
            y: enemy.pos.y - 12,
            text: `-${dmg} ШОК!`,
            color: '#38bdf8'
          });
        } else if (hazard.element === 'ice') {
          enemy.elementalStatus = { type: 'ice', duration: 4.0 };
          enemy.state = 'stunned';
          enemy.stateTimer = 2.5;
          events.push({
            type: 'floatText',
            x: enemy.pos.x,
            y: enemy.pos.y - 12,
            text: 'ЗАМОРОЖЕНО!',
            color: '#67e8f9'
          });
        } else if (hazard.element === 'fire') {
          const dmg = 25;
          if (onDamageEnemy) {
            onDamageEnemy(enemy, dmg, 'fire');
          } else {
            enemy.hp = Math.max(0, enemy.hp - dmg);
            if (enemy.hp <= 0) enemy.state = 'ko';
          }
          if (enemy.state !== 'ko') {
            enemy.elementalStatus = { type: 'fire', duration: 3.5 };
          }
          events.push({
            type: 'floatText',
            x: enemy.pos.x,
            y: enemy.pos.y - 12,
            text: `-${dmg} ВОГОНЬ!`,
            color: '#f97316'
          });
        }
      }
    }
  }

  /**
   * Ticks down hazard durations and applies periodic damage/status to player and enemies inside hazards.
   */
  public update(
    dt: number,
    player: PlayerEntity,
    enemies: EnemyEntity[],
    events: GameEvent[],
    onDamagePlayer?: (damage: number, sourceName: string, element?: ElementType) => void,
    onDamageEnemy?: (enemy: EnemyEntity, damage: number, element: ElementType) => void
  ): void {
    // 1. Decrement and remove expired hazards
    for (let i = this.hazards.length - 1; i >= 0; i--) {
      this.hazards[i].duration -= dt;
      if (this.hazards[i].duration <= 0) {
        this.hazards.splice(i, 1);
      }
    }

    // 2. Periodic tick for ongoing hazard zones (fire burns, acid corrodes, etc.)
    this.hazardTickTimer += dt;
    if (this.hazardTickTimer >= this.TICK_INTERVAL) {
      this.hazardTickTimer = 0;

      for (const h of this.hazards) {
        // Check player
        const playerDist = Math.hypot(player.pos.x - h.pos.x, player.pos.y - h.pos.y);
        if (playerDist <= h.radius && player.invulnTimer <= 0) {
          if (h.element === 'fire') {
            const dmg = 6;
            if (onDamagePlayer) {
              onDamagePlayer(dmg, 'ВОГОНЬ', 'fire');
            } else {
              player.stats.hp = Math.max(0, player.stats.hp - dmg);
              player.invulnTimer = 0.35;
              events.push({ type: 'sfx', sound: 'player_hurt' });
              events.push({
                type: 'floatText',
                x: player.pos.x,
                y: player.pos.y - 12,
                text: '-6 ВОГОНЬ',
                color: '#f97316'
              });
            }
          } else if (h.element === 'electricity') {
            const dmg = 8;
            if (onDamagePlayer) {
              onDamagePlayer(dmg, 'СТРУМ', 'electricity');
            } else {
              player.stats.hp = Math.max(0, player.stats.hp - dmg);
              player.invulnTimer = 0.4;
              events.push({ type: 'sfx', sound: 'shock' });
              events.push({
                type: 'floatText',
                x: player.pos.x,
                y: player.pos.y - 12,
                text: '-8 СТРУМ',
                color: '#38bdf8'
              });
            }
          }
        }

        // Check enemies
        for (const enemy of enemies) {
          if (enemy.state === 'ko') continue;
          const dist = Math.hypot(enemy.pos.x - h.pos.x, enemy.pos.y - h.pos.y);
          if (dist <= h.radius) {
            if (h.element === 'fire') {
              const dmg = 8;
              if (onDamageEnemy) {
                onDamageEnemy(enemy, dmg, 'fire');
              } else {
                enemy.hp = Math.max(0, enemy.hp - dmg);
                if (enemy.hp <= 0) enemy.state = 'ko';
                events.push({
                  type: 'floatText',
                  x: enemy.pos.x,
                  y: enemy.pos.y - 10,
                  text: '-8 ВОГОНЬ',
                  color: '#f97316'
                });
              }
            } else if (h.element === 'electricity') {
              const dmg = 10;
              if (onDamageEnemy) {
                onDamageEnemy(enemy, dmg, 'electricity');
              } else {
                enemy.hp = Math.max(0, enemy.hp - dmg);
                if (enemy.hp <= 0) enemy.state = 'ko';
                events.push({
                  type: 'floatText',
                  x: enemy.pos.x,
                  y: enemy.pos.y - 10,
                  text: '-10 СТРУМ',
                  color: '#38bdf8'
                });
              }
            }
          }
        }
      }
    }
  }
}
