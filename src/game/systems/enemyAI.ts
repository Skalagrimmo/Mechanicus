/**
 * 16-Bit Systemic Game Engine - Enemy AI & State Machine System
 * Decoupled AI behaviors for swarm drones, ranged sentries, heavy enforcers,
 * and the Warden boss, with elemental reactions and attack telegraphs.
 */

import { EnemyEntity, PlayerEntity, Projectile, GameEvent } from '../types';
import { calculateIncomingDamage } from './combat';

export interface EnemyUpdateContext {
  dt: number;
  player: PlayerEntity;
  projectiles: Projectile[];
  events: GameEvent[];
  onPlayerHit: (damage: number) => void;
  onBossDefeated: () => void;
}

export class EnemyAISystem {
  /**
   * Updates all active enemies according to their archetypes and state machines
   */
  public update(enemies: EnemyEntity[], ctx: EnemyUpdateContext): void {
    const { dt, player, projectiles, events, onPlayerHit, onBossDefeated } = ctx;

    for (const enemy of enemies) {
      if (enemy.state === 'ko') continue;

      // Invulnerability decay
      if (enemy.invulnTimer > 0) enemy.invulnTimer -= dt;

      // Status effect decay
      if (enemy.elementalStatus) {
        enemy.elementalStatus.duration -= dt;
        if (enemy.elementalStatus.duration <= 0) {
          enemy.elementalStatus = undefined;
        }
      }

      // Knockback damping (physics based on dt)
      enemy.pos.x += enemy.vel.x * 60 * dt;
      enemy.pos.y += enemy.vel.y * 60 * dt;
      enemy.vel.x *= Math.pow(0.15, dt);
      enemy.vel.y *= Math.pow(0.15, dt);

      // If stunned (e.g. from parry, EMP, or freeze)
      if (enemy.state === 'stunned') {
        enemy.stateTimer -= dt;
        if (enemy.stateTimer <= 0) {
          enemy.state = 'idle';
        }
        continue;
      }

      const dx = player.pos.x - enemy.pos.x;
      const dy = player.pos.y - enemy.pos.y;
      const distToPlayer = Math.hypot(dx, dy) || 1;

      // Direction tracking
      if (Math.abs(dx) > Math.abs(dy)) {
        enemy.dir = dx > 0 ? 'right' : 'left';
      } else {
        enemy.dir = dy > 0 ? 'down' : 'up';
      }

      // Speed modifier (frozen enemies move at 40% speed)
      const speedMod = enemy.elementalStatus?.type === 'ice' ? 0.4 : 1.0;
      const effectiveSpeed = enemy.speed * 60 * speedMod * dt; // Units: pixels per second

      // 1. Drone Swarmer Archetype
      if (enemy.type === 'drone_swarmer') {
        if (distToPlayer < 200) {
          enemy.pos.x += (dx / distToPlayer) * effectiveSpeed;
          enemy.pos.y += (dy / distToPlayer) * effectiveSpeed;

          // Melee attack range
          if (distToPlayer < 14 && player.invulnTimer <= 0) {
            const inc = calculateIncomingDamage(enemy.damage, player.isParrying, false, player.stats.equippedImplants);
            if (inc.parrySuccess) {
              events.push({ type: 'sfx', sound: 'parry' });
              events.push({ type: 'shake', amount: 3 });
              events.push({ type: 'floatText', x: player.pos.x, y: player.pos.y - 14, text: 'ПАРИР!', color: '#38bdf8' });
              enemy.state = 'stunned';
              enemy.stateTimer = 1.2;
            } else if (!inc.absorbed) {
              onPlayerHit(inc.finalDamage);
              events.push({ type: 'sfx', sound: 'player_hurt' });
              events.push({ type: 'shake', amount: 4 });
              events.push({ type: 'floatText', x: player.pos.x, y: player.pos.y - 12, text: `-${inc.finalDamage}`, color: '#ef4444' });
            }
          }
        }
      }

      // 2. Sentry Ranged Archetype
      else if (enemy.type === 'sentry_ranged') {
        if (distToPlayer < 220) {
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
              enemy.stateTimer = 0.5;
              events.push({ type: 'sfx', sound: 'laser' });
              const projAngle = Math.atan2(dy, dx);
              projectiles.push({
                id: Math.random(),
                pos: { x: enemy.pos.x, y: enemy.pos.y },
                vel: { x: Math.cos(projAngle) * 220 * dt, y: Math.sin(projAngle) * 220 * dt },
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
      }

      // 3. Enforcer Heavy Archetype
      else if (enemy.type === 'enforcer_heavy') {
        if (distToPlayer < 180) {
          if (enemy.state === 'idle') {
            enemy.state = 'windup';
            enemy.windupTimer = 0.9;
          } else if (enemy.state === 'windup') {
            enemy.windupTimer -= dt;
            if (enemy.windupTimer <= 0) {
              enemy.state = 'attack';
              enemy.stateTimer = 0.8;
              const angle = Math.atan2(dy, dx);
              enemy.vel.x = Math.cos(angle) * 4.2;
              enemy.vel.y = Math.sin(angle) * 4.2;
            }
          } else if (enemy.state === 'attack') {
            enemy.stateTimer -= dt;
            if (distToPlayer < 18 && player.invulnTimer <= 0) {
              const inc = calculateIncomingDamage(enemy.damage, player.isParrying, false, player.stats.equippedImplants);
              if (inc.parrySuccess) {
                events.push({ type: 'sfx', sound: 'parry' });
                events.push({ type: 'shake', amount: 4 });
                events.push({ type: 'floatText', x: player.pos.x, y: player.pos.y - 14, text: 'ПАРИР СТАЛІ!', color: '#38bdf8' });
                enemy.state = 'stunned';
                enemy.stateTimer = 1.5;
              } else if (!inc.absorbed) {
                onPlayerHit(inc.finalDamage);
                events.push({ type: 'sfx', sound: 'player_hurt' });
                events.push({ type: 'shake', amount: 6 });
                events.push({ type: 'floatText', x: player.pos.x, y: player.pos.y - 12, text: `-${inc.finalDamage}`, color: '#ef4444' });
              }
            }
            if (enemy.stateTimer <= 0) enemy.state = 'idle';
          }
        }
      }

      // 4. Boss: Warden Mechanicus Archetype
      else if (enemy.type === 'warden_boss') {
        if (enemy.state === 'idle') {
          enemy.stateTimer -= dt;
          if (enemy.stateTimer <= 0) {
            const isPhase2 = enemy.hp < enemy.maxHp * 0.5;
            const rand = Math.random();

            if (rand < 0.45 || isPhase2) {
              // Circular shockwave ring
              events.push({ type: 'sfx', sound: 'shock' });
              events.push({ type: 'shake', amount: 5 });
              const ringRays = isPhase2 ? 10 : 8;
              for (let a = 0; a < Math.PI * 2; a += (Math.PI * 2) / ringRays) {
                projectiles.push({
                  id: Math.random(),
                  pos: { x: enemy.pos.x, y: enemy.pos.y },
                  vel: { x: Math.cos(a) * 160 * dt, y: Math.sin(a) * 160 * dt },
                  radius: 4,
                  damage: 18,
                  element: 'electricity',
                  owner: 'enemy',
                  duration: 3.0
                });
              }
            } else {
              // Targeted laser burst
              events.push({ type: 'sfx', sound: 'laser' });
              const angle = Math.atan2(dy, dx);
              projectiles.push({
                id: Math.random(),
                pos: { x: enemy.pos.x, y: enemy.pos.y },
                vel: { x: Math.cos(angle) * 240 * dt, y: Math.sin(angle) * 240 * dt },
                radius: 4,
                damage: 22,
                element: 'electricity',
                owner: 'enemy',
                duration: 2.5
              });
            }

            enemy.stateTimer = isPhase2 ? 1.1 : 1.6;
          }
        }
      }
    }
  }
}
