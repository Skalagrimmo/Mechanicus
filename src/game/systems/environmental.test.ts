import test from 'node:test';
import assert from 'node:assert/strict';
import { EnvironmentalSystem } from './environmental';
import { generateSectorMap } from '../engine/world';
import { GameEvent, EnemyEntity, PlayerEntity } from '../types';

test('environmental system converts water puddle to ice when ice hazard is added', () => {
  const map = generateSectorMap(1);
  const system = new EnvironmentalSystem([]);
  const events: GameEvent[] = [];

  // Puddle at (5 * 16, 7 * 16) = (80, 112) in Sector 1
  assert.equal(map.tiles[7][5], 'puddle_water');

  system.addHazard({ x: 80, y: 112 }, 24, 'ice', 4.0, map, [], [], events);

  // The puddle tile should now be transformed to sheet_ice!
  assert.equal(map.tiles[7][5], 'sheet_ice');
  assert.ok(events.some((e) => e.type === 'floatText' && e.text.includes('ЗАМОРОЗКА')));
});

test('environmental system triggers electric shockwave across water puddle', () => {
  const map = generateSectorMap(1);
  const system = new EnvironmentalSystem([]);
  const events: GameEvent[] = [];

  system.addHazard({ x: 80, y: 112 }, 32, 'electricity', 3.0, map, [], [], events);

  // Events should contain shock SFX and float text
  assert.ok(events.some((e) => e.type === 'sfx' && e.sound === 'shock'));
  assert.ok(events.some((e) => e.type === 'floatText' && e.text.includes('СТРУМ')));
});

test('hazard duration expires over time', () => {
  const map = generateSectorMap(1);
  const system = new EnvironmentalSystem([]);
  const events: GameEvent[] = [];

  const dummyPlayer: PlayerEntity = {
    pos: { x: 0, y: 0 },
    vel: { x: 0, y: 0 },
    dir: 'down',
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

  system.addHazard({ x: 100, y: 100 }, 20, 'fire', 1.0, map, [], [], events);
  assert.equal(system.getHazards().length, 1);

  // Advance by 0.6s
  system.update(0.6, dummyPlayer, [], events);
  assert.equal(system.getHazards().length, 1);

  // Advance by another 0.6s -> total 1.2s > 1.0s
  system.update(0.6, dummyPlayer, [], events);
  assert.equal(system.getHazards().length, 0);
});
