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
