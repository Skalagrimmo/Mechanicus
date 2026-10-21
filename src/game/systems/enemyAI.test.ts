import test from 'node:test';
import assert from 'node:assert/strict';
import { EnemyAISystem } from './enemyAI';
import { EnemyEntity, PlayerEntity, Projectile, GameEvent } from '../types';

test('drone swarmer chases player and gets stunned on parry', () => {
  const ai = new EnemyAISystem();
  const drone: EnemyEntity = {
    id: 1,
    type: 'drone_swarmer',
    pos: { x: 50, y: 50 },
    vel: { x: 0, y: 0 },
    hp: 35,
    maxHp: 35,
    speed: 1.0,
    damage: 10,
    dir: 'down',
    state: 'idle',
    stateTimer: 0,
    windupTimer: 0,
    invulnTimer: 0
  };

  const player: PlayerEntity = {
    pos: { x: 55, y: 50 }, // Close enough for melee
    vel: { x: 0, y: 0 },
    dir: 'left',
    stats: {
      hp: 100,
      maxHp: 100,
      stamina: 100,
      maxStamina: 100,
      scrap: 0,
      equippedWeapon: 'wrench',
      equippedImplants: [],
      inventory: []
    },
    attackPhase: 'parry',
    attackTimer: 0.3,
    attackCooldown: 0,
    comboCount: 0,
    comboTimer: 0,
    invulnTimer: 0,
    isParrying: true,
    isDashing: false,
    dashTimer: 0
  };

  const events: GameEvent[] = [];
  let playerDamaged = false;

  ai.update([drone], {
    dt: 0.016,
    player,
    projectiles: [],
    events,
    onPlayerHit: () => { playerDamaged = true; },
    onBossDefeated: () => {}
  });

  // Since player was parrying, damage was absorbed and drone should become stunned!
  assert.equal(playerDamaged, false);
  assert.equal(drone.state, 'stunned');
  assert.ok(events.some((e) => e.type === 'sfx' && e.sound === 'parry'));
});

test('ranged sentry advances through windup to projectile spawn', () => {
  const ai = new EnemyAISystem();
  const sentry: EnemyEntity = {
    id: 2,
    type: 'sentry_ranged',
    pos: { x: 100, y: 100 },
    vel: { x: 0, y: 0 },
    hp: 45,
    maxHp: 45,
    speed: 0.5,
    damage: 15,
    dir: 'left',
    state: 'idle',
    stateTimer: 0,
    windupTimer: 0,
    invulnTimer: 0
  };

  const player: PlayerEntity = {
    pos: { x: 150, y: 100 },
    vel: { x: 0, y: 0 },
    dir: 'left',
    stats: {
      hp: 100,
      maxHp: 100,
      stamina: 100,
      maxStamina: 100,
      scrap: 0,
      equippedWeapon: 'wrench',
      equippedImplants: [],
      inventory: []
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
  };

  const projectiles: Projectile[] = [];
  const events: GameEvent[] = [];

  // Step 1: Detects player and begins windup
  ai.update([sentry], {
    dt: 0.016,
    player,
    projectiles,
    events,
    onPlayerHit: () => {},
    onBossDefeated: () => {}
  });
  assert.equal(sentry.state, 'windup');

  // Step 2: Advance through windup (0.8s)
  ai.update([sentry], {
    dt: 0.85,
    player,
    projectiles,
    events,
    onPlayerHit: () => {},
    onBossDefeated: () => {}
  });

  // Should have fired projectile!
  assert.equal(projectiles.length, 1);
  assert.equal(projectiles[0].owner, 'enemy');
  assert.ok(events.some((e) => e.type === 'sfx' && e.sound === 'laser'));
});
