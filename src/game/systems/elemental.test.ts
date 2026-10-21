import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveElementalReaction, getElementalDamageMultiplier } from './elemental';

test('oil + fire triggers explosion with high damage', () => {
  const result = resolveElementalReaction('oil', 'fire');
  assert.equal(result.triggered, true);
  assert.equal(result.effect, 'explosion');
  assert.equal(result.resultingElement, 'fire');
  assert.ok(result.damage >= 40);
});

test('water + electricity electrocutes wide radius', () => {
  const result = resolveElementalReaction('water', 'electricity');
  assert.equal(result.triggered, true);
  assert.equal(result.effect, 'electrocution');
  assert.equal(result.resultingElement, 'electricity');
  assert.ok(result.radius >= 50);
});

test('water + ice triggers freezing effect', () => {
  const result = resolveElementalReaction('ice', 'water');
  assert.equal(result.triggered, true);
  assert.equal(result.effect, 'freezing');
  assert.equal(result.resultingElement, 'ice');
});

test('elemental damage multiplier rewards strategic combos', () => {
  const multShockOnWet = getElementalDamageMultiplier('electricity', 'water');
  assert.equal(multShockOnWet, 1.75);

  const multFrozen = getElementalDamageMultiplier('normal', 'ice');
  assert.equal(multFrozen, 1.8);

  const multNormal = getElementalDamageMultiplier('normal', 'normal');
  assert.equal(multNormal, 1.0);
});
