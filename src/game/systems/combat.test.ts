import test from 'node:test';
import assert from 'node:assert/strict';
import { getNextAttackPhase, calculateIncomingDamage, calculateKnockback, WEAPONS_CATALOG } from './combat';

test('combo system transitions light1 -> light2 -> heavy finisher', () => {
  // Step 1: First light attack
  const step1 = getNextAttackPhase('none', 'light', 0);
  assert.equal(step1.nextPhase, 'light1');
  assert.equal(step1.comboCount, 1);
  assert.equal(step1.damageMultiplier, 1.0);

  // Step 2: Second light attack within combo timer
  const step2 = getNextAttackPhase('light1', 'light', 0.8);
  assert.equal(step2.nextPhase, 'light2');
  assert.equal(step2.comboCount, 2);
  assert.equal(step2.damageMultiplier, 1.25);

  // Step 3: Heavy Finisher finisher bonus
  const step3 = getNextAttackPhase('light2', 'heavy', 0.8);
  assert.equal(step3.nextPhase, 'heavy');
  assert.equal(step3.comboCount, 3);
  assert.equal(step3.damageMultiplier, 2.2);
});

test('parry negates all damage with parrySuccess flag', () => {
  const result = calculateIncomingDamage(30, true, false, []);
  assert.equal(result.finalDamage, 0);
  assert.equal(result.parrySuccess, true);
  assert.equal(result.absorbed, true);
});

test('ferro plating implant mitigates damage correctly', () => {
  const normalResult = calculateIncomingDamage(40, false, false, []);
  assert.equal(normalResult.finalDamage, 40);

  const armoredResult = calculateIncomingDamage(40, false, false, ['ferro_plating']);
  // 30% reduction from 40 = 28
  assert.equal(armoredResult.finalDamage, 28);
});

test('knockback vector calculates correct direction', () => {
  const kb = calculateKnockback(100, 100, 150, 100, 10);
  assert.ok(kb.vx > 9.9);
  assert.equal(Math.round(kb.vy), 0);
});

test('weapons catalog contains balanced statistics', () => {
  assert.ok(WEAPONS_CATALOG.wrench.damage > 0);
  assert.ok(WEAPONS_CATALOG.baton.damage > 0);
  assert.ok(WEAPONS_CATALOG.sledge.damage > WEAPONS_CATALOG.wrench.damage);
});
