import test from 'node:test';
import assert from 'node:assert/strict';
import { generateSectorMap, checkTileCollision, SECTORS } from './world';

test('all 4 sectors generate valid maps and boundaries', () => {
  for (let s = 1; s <= 4; s++) {
    const map = generateSectorMap(s);
    assert.equal(map.info.id, s);
    assert.ok(map.widthInTiles > 0);
    assert.ok(map.heightInTiles > 0);
    assert.ok(map.enemies.length > 0);

    // Verify outer boundary tiles are walls
    for (let x = 0; x < map.widthInTiles; x++) {
      assert.equal(map.tiles[0][x], 'wall_reinforced');
      assert.equal(map.tiles[map.heightInTiles - 1][x], 'wall_reinforced');
    }
  }
});

test('checkTileCollision detects outer boundaries and walls', () => {
  const map = generateSectorMap(1);

  // Position (0, 0) is a reinforced wall tile
  assert.equal(checkTileCollision(map, 8, 8, 6), true);

  // Center of open floor should have no collision
  assert.equal(checkTileCollision(map, map.playerSpawn.x, map.playerSpawn.y, 6), false);

  // Off map position should collide
  assert.equal(checkTileCollision(map, -10, -10, 6), true);
});

test('Sector 4 contains the Warden boss entity', () => {
  const map = generateSectorMap(4);
  const boss = map.enemies.find((e) => e.type === 'warden_boss');
  assert.ok(boss !== undefined);
  assert.ok(boss!.hp >= 300);
});
