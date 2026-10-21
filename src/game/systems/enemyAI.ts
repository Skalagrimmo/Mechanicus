/**
 * 16-Bit Systemic Game Engine - Enemy AI & State Machine System
 * Decoupled AI behaviors for swarm drones, ranged sentries, heavy enforcers,
 * and the Warden boss, with elemental reactions and attack telegraphs.
 * All velocities are in pixels per second, and positions integrate velocity * dt.
 */

import { EnemyEntity, PlayerEntity, Projectile, GameEvent } from '../types';

export interface EnemyUpdateContext {
  dt: number;
  player: PlayerEntity;
  projectiles: Projectile[];
  events: GameEvent[];
  applyDamageToPlayer: (rawDamage: number, sourceName: string, ignoreParry?: boolean) => boolean;
}

export class EnemyAISystem {
  /**
   * Updates all active enemies according to their archetypes and state machines
   */
  public update(enemies: EnemyEntity[], ctx: EnemyUpdateContext): void {
    const { dt, player, projectiles, events, applyDamageToPlayer } = ctx;

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

      // Knockback / velocity integration with smooth exponential friction
      enemy.pos.x += enemy.vel.x * dt;
      enemy.pos.y += enemy.vel.y * dt;
      const friction = Math.exp(-6.0 * dt);
      enemy.vel.x *= friction;
      enemy.vel.y *= friction;

      // Stunned check (from parry, EMP, freeze, or shock)
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
      // Base speed scaled to pixels per second (e.g. speed 1.1 -> ~72 px/sec)
      const speedPxPerSec = (enemy.speed * 65) * speedMod;

      // 1. Drone Swarmer Archetype (aggressive chaser)
      if (enemy.type === 'drone_swarmer') {
        if (distToPlayer < 200) {
          enemy.pos.x += (dx / distToPlayer) * speedPxPerSec * dt;
          enemy.pos.y += (dy / distToPlayer) * speedPxPerSec * dt;

          // Melee attack range check
          if (distToPlayer < 14) {
            const isParryingActive = player.isParrying && player.parryTimer > 0;
            if (isParryingActive) {
              // Perfect parry deflects enemy and stuns it!
              enemy.state = 'stunned';
              enemy.stateTimer = 1.2;
              events.push({ type: 'sfx', sound: 'parry' });
              applyDamageToPlayer(enemy.damage, 'ДРОН'); // Will trigger parry inside applyDamageToPlayer
            } else if (player.invulnTimer <= 0) {
              applyDamageToPlayer(enemy.damage, 'ДРОН');
            }
          }
        }
      }

      // 2. Sentry Ranged Archetype (kiter with laser telegraph)
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
              // Fire laser projectile with persistent speed in px/s
              enemy.state = 'attack';
              enemy.stateTimer = 0.5;
              events.push({ type: 'sfx', sound: 'laser' });
              const projAngle = Math.atan2(dy, dx);
              const laserSpeed = 220; // px/sec
              projectiles.push({
                id: Math.random(),
                pos: { x: enemy.pos.x, y: enemy.pos.y },
                vel: { x: Math.cos(projAngle) * laserSpeed, y: Math.sin(projAngle) * laserSpeed },
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

      // 3. Enforcer Heavy Archetype (heavy charger with shield)
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
              const rushSpeed = 250; // px/sec
              enemy.vel.x = Math.cos(angle) * rushSpeed;
              enemy.vel.y = Math.sin(angle) * rushSpeed;
            }
          } else if (enemy.state === 'attack') {
            enemy.stateTimer -= dt;
            if (distToPlayer < 18) {
              const isParryingActive = player.isParrying && player.parryTimer > 0;
              if (isParryingActive) {
                enemy.state = 'stunned';
                enemy.stateTimer = 1.5;
                events.push({ type: 'sfx', sound: 'parry' });
                applyDamageToPlayer(enemy.damage, 'СИЛОВИК');
              } else if (player.invulnTimer <= 0) {
                applyDamageToPlayer(enemy.damage, 'СИЛОВИК');
              }
            }
            if (enemy.stateTimer <= 0) enemy.state = 'idle';
          }
        }
      }

      // 4. Boss: Warden Mechanicus Archetype (multi-phase titan)
      else if (enemy.type === 'warden_boss') {
        if (enemy.state === 'idle') {
          enemy.stateTimer -= dt;
          if (enemy.stateTimer <= 0) {
            const isPhase2 = enemy.hp < enemy.maxHp * 0.5;
            const rand = Math.random();

            if (rand < 0.45 || isPhase2) {
              // Circular shockwave ring with velocities in px/sec
              events.push({ type: 'sfx', sound: 'shock' });
              events.push({ type: 'shake', amount: 5 });
              const ringRays = isPhase2 ? 10 : 8;
              const ringSpeed = 160; // px/sec
              for (let a = 0; a < Math.PI * 2; a += (Math.PI * 2) / ringRays) {
                projectiles.push({
                  id: Math.random(),
                  pos: { x: enemy.pos.x, y: enemy.pos.y },
                  vel: { x: Math.cos(a) * ringSpeed, y: Math.sin(a) * ringSpeed },
                  radius: 4,
                  damage: 18,
                  element: 'electricity',
                  owner: 'enemy',
                  duration: 3.0
                });
              }
            } else {
              // Targeted laser burst with velocity in px/sec
              events.push({ type: 'sfx', sound: 'laser' });
              const angle = Math.atan2(dy, dx);
              const bossLaserSpeed = 240; // px/sec
              projectiles.push({
                id: Math.random(),
                pos: { x: enemy.pos.x, y: enemy.pos.y },
                vel: { x: Math.cos(angle) * bossLaserSpeed, y: Math.sin(angle) * bossLaserSpeed },
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
