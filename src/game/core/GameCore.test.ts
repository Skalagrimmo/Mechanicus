import test from 'node:test';
import assert from 'node:assert/strict';
import { GameCore } from './GameCore';

test('GameCore initializes with Sector 1 and default stats', () => {
  const core = new GameCore();
  assert.equal(core.gameState, 'title');
  assert.equal(core.currentSectorId, 1);
  assert.equal(core.player.stats.hp, 100);
  assert.equal(core.player.stats.stamina, 100);
});

test('GameCore start() sets state to playing and loads Sector 1', () => {
  const core = new GameCore();
  let stateChanged = false;
  core.subscribe((event) => {
    if (event.type === 'stateChange' && event.newState === 'playing') {
      stateChanged = true;
    }
  });

  core.start();
  assert.equal(core.gameState, 'playing');
  assert.equal(stateChanged, true);
  assert.ok(core.enemies.length > 0);
  assert.ok(core.props.length > 0);
});

test('GameCore update advances movement predictably with delta time', () => {
  const core = new GameCore();
  core.start();
  const initialX = core.player.pos.x;

  // Move right for 0.5s with dt = 0.05
  for (let i = 0; i < 10; i++) {
    core.update(0.05, { moveX: 1, moveY: 0, actions: [] });
  }

  // Player should have moved to the right
  assert.ok(core.player.pos.x > initialX);
  assert.equal(core.player.dir, 'right');
});

test('GameCore consumable restores player health', () => {
  const core = new GameCore();
  core.start();
  core.player.stats.hp = 30;

  core.useConsumable('repair_stim');
  assert.equal(core.player.stats.hp, 80);
});

test('GameCore sector transition switches map and spawns', () => {
  const core = new GameCore();
  core.start();
  core.loadSector(2);

  assert.equal(core.currentSectorId, 2);
  assert.equal(core.map.info.code, 'SEC-02-RX');
  assert.equal(core.map.info.nameUk, 'Корозійний Реактор');
});

test('parry lifecycle: active window negates damage, expired window receives ordinary damage', () => {
  const core = new GameCore();
  core.start();
  core.player.stats.equippedImplants = []; // clean test without implants

  // 1. Trigger parry
  core.executeAction('parry');
  assert.equal(core.player.isParrying, true);
  assert.ok(core.player.parryTimer > 0);

  // 2. Incoming attack within active parry window is completely negated
  const parryResult = core.applyDamageToPlayer(20, 'ТЕСТ_ВОРОГ');
  assert.equal(parryResult.parried, true);
  assert.equal(parryResult.damageDealt, 0);
  assert.equal(core.player.stats.hp, 100);

  // 3. Advance time by 0.35s to exceed the parry window (0.25s)
  core.update(0.35, { moveX: 0, moveY: 0, actions: [] });
  assert.equal(core.player.isParrying, false);
  assert.equal(core.player.parryTimer, 0);

  // 4. Attack after parry expired deals ordinary damage
  const damageResult = core.applyDamageToPlayer(20, 'ТЕСТ_ВОРОГ');
  assert.equal(damageResult.parried, false);
  assert.equal(damageResult.damageDealt, 20);
  assert.equal(core.player.stats.hp, 80);
});

test('sector transition and restart clears stuck combat and parry states', () => {
  const core = new GameCore();
  core.start();
  core.executeAction('parry');
  core.player.isDashing = true;
  core.player.dashTimer = 0.5;

  assert.equal(core.player.isParrying, true);
  assert.equal(core.player.isDashing, true);

  // Changing sector cleanses all combat state
  core.loadSector(2);
  assert.equal(core.player.isParrying, false);
  assert.equal(core.player.parryTimer, 0);
  assert.equal(core.player.isDashing, false);
  assert.equal(core.player.dashTimer, 0);
});

test('step-size independence: player movement distance is identical across different step sizes', () => {
  const coreSmallSteps = new GameCore();
  coreSmallSteps.start();
  const startX1 = coreSmallSteps.player.pos.x;

  // 50 steps of 0.01s = 0.50s total
  for (let i = 0; i < 50; i++) {
    coreSmallSteps.update(0.01, { moveX: 1, moveY: 0, actions: [] });
  }
  const displacement1 = coreSmallSteps.player.pos.x - startX1;

  const coreLargeSteps = new GameCore();
  coreLargeSteps.start();
  const startX2 = coreLargeSteps.player.pos.x;

  // 10 steps of 0.05s = 0.50s total
  for (let i = 0; i < 10; i++) {
    coreLargeSteps.update(0.05, { moveX: 1, moveY: 0, actions: [] });
  }
  const displacement2 = coreLargeSteps.player.pos.x - startX2;

  // Displacements must match within floating point precision
  assert.ok(Math.abs(displacement1 - displacement2) < 0.001, `Displacement difference: ${Math.abs(displacement1 - displacement2)}`);
});

test('step-size independence: projectile travel distance is consistent with pixels per second', () => {
  const coreA = new GameCore();
  coreA.start();
  coreA.projectiles = [{
    id: 1,
    pos: { x: 50, y: 50 },
    vel: { x: 200, y: 0 }, // 200 px/sec
    radius: 3,
    damage: 10,
    element: 'normal',
    owner: 'enemy',
    duration: 5.0
  }];

  // 50 steps of 0.01s (0.5s total): 200 px/s * 0.5s = 100px travel
  for (let i = 0; i < 50; i++) {
    coreA.update(0.01, { moveX: 0, moveY: 0, actions: [] });
  }
  assert.ok(Math.abs(coreA.projectiles[0].pos.x - 150) < 0.01, `Expected 150, got ${coreA.projectiles[0].pos.x}`);

  const coreB = new GameCore();
  coreB.start();
  coreB.projectiles = [{
    id: 2,
    pos: { x: 50, y: 50 },
    vel: { x: 200, y: 0 }, // 200 px/sec
    radius: 3,
    damage: 10,
    element: 'normal',
    owner: 'enemy',
    duration: 5.0
  }];

  // 10 steps of 0.05s (0.5s total)
  for (let i = 0; i < 10; i++) {
    coreB.update(0.05, { moveX: 0, moveY: 0, actions: [] });
  }
  assert.ok(Math.abs(coreB.projectiles[0].pos.x - 150) < 0.01, `Expected 150, got ${coreB.projectiles[0].pos.x}`);
});

test('lethal damage to player reliably triggers gameover', () => {
  const core = new GameCore();
  core.start();
  core.player.stats.equippedImplants = [];
  core.player.stats.hp = 15;

  const result = core.applyDamageToPlayer(20, 'ЛЕЖАЧА_КИСЛОТА', true);
  assert.equal(result.died, true);
  assert.equal(core.player.stats.hp, 0);
  assert.equal(core.gameState, 'gameover');
});

test('enemy death is consistent across damage sources and prevents duplicate rewards', () => {
  const core = new GameCore();
  core.start();
  const initialKills = core.runStats.enemiesKilled;
  const initialScrap = core.player.stats.scrap;

  const testDrone = core.enemies.find((e) => e.type === 'drone_swarmer')!;
  assert.ok(testDrone);
  testDrone.hp = 20;

  // 1. Deliver lethal damage
  const firstHit = core.applyDamageToEnemy(testDrone, 25, 'normal');
  assert.equal(firstHit.killed, true);
  assert.equal(testDrone.state, 'ko');
  assert.equal(testDrone.hp, 0);
  assert.equal(core.runStats.enemiesKilled, initialKills + 1);
  assert.equal(core.player.stats.scrap, initialScrap + 20);

  // 2. Deliver further damage to the KO enemy - must NOT give duplicate rewards or damage
  const secondHit = core.applyDamageToEnemy(testDrone, 50, 'fire');
  assert.equal(secondHit.killed, false);
  assert.equal(secondHit.damageDealt, 0);
  assert.equal(core.runStats.enemiesKilled, initialKills + 1);
  assert.equal(core.player.stats.scrap, initialScrap + 20);
});
