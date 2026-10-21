/**
 * 16-Bit Systemic Game Engine - Elemental Reaction Matrix
 * Pure logic for environmental reactions and elemental combinations
 */

import { ElementType } from '../types';

export interface ReactionResult {
  triggered: boolean;
  resultingElement: ElementType;
  effect: 'explosion' | 'electrocution' | 'freezing' | 'corrosion' | 'steam_burst' | 'none';
  damage: number;
  radius: number;
  statusEffect?: {
    type: ElementType;
    duration: number;
  };
  messageUk?: string;
}

/**
 * Calculates outcome when two elements or an element and an environment interact.
 */
export function resolveElementalReaction(
  source: ElementType,
  target: ElementType
): ReactionResult {
  // Oil + Fire => High-yield explosion
  if ((source === 'oil' && target === 'fire') || (source === 'fire' && target === 'oil')) {
    return {
      triggered: true,
      resultingElement: 'fire',
      effect: 'explosion',
      damage: 45,
      radius: 48,
      statusEffect: { type: 'fire', duration: 4.0 },
      messageUk: 'ДЕФЛАГРАЦІЯ НАФТИ!'
    };
  }

  // Oil + Electricity => Secondary detonation
  if ((source === 'oil' && target === 'electricity') || (source === 'electricity' && target === 'oil')) {
    return {
      triggered: true,
      resultingElement: 'fire',
      effect: 'explosion',
      damage: 35,
      radius: 40,
      statusEffect: { type: 'fire', duration: 3.0 },
      messageUk: 'ЕЛЕКТРО-СПАЛАХ!'
    };
  }

  // Water + Electricity => Electrocution shockwave
  if ((source === 'water' && target === 'electricity') || (source === 'electricity' && target === 'water')) {
    return {
      triggered: true,
      resultingElement: 'electricity',
      effect: 'electrocution',
      damage: 28,
      radius: 56,
      statusEffect: { type: 'electricity', duration: 3.5 },
      messageUk: 'СТРУМ ПО ВОДІ!'
    };
  }

  // Water + Ice => Solid Ice patch
  if ((source === 'water' && target === 'ice') || (source === 'ice' && target === 'water')) {
    return {
      triggered: true,
      resultingElement: 'ice',
      effect: 'freezing',
      damage: 15,
      radius: 36,
      statusEffect: { type: 'ice', duration: 5.0 },
      messageUk: 'ГЛИБОКА ЗАМОРОЗКА!'
    };
  }

  // Fire + Ice => Steam burst (obscures vision, cancels burning/freezing)
  if ((source === 'fire' && target === 'ice') || (source === 'ice' && target === 'fire')) {
    return {
      triggered: true,
      resultingElement: 'water',
      effect: 'steam_burst',
      damage: 10,
      radius: 32,
      messageUk: 'ТЕРМО-ВИПАРОВУВАННЯ!'
    };
  }

  // Acid + Normal/Water => Corrosive aerosol
  if (source === 'acid' || target === 'acid') {
    return {
      triggered: true,
      resultingElement: 'acid',
      effect: 'corrosion',
      damage: 20,
      radius: 30,
      statusEffect: { type: 'acid', duration: 4.0 },
      messageUk: "КИСЛОТНИЙ РОЗ'ЇД!"
    };
  }

  // Default: no reaction
  return {
    triggered: false,
    resultingElement: source !== 'normal' ? source : target,
    effect: 'none',
    damage: 0,
    radius: 0
  };
}

/**
 * Elemental damage multiplier based on receiver's current state
 */
export function getElementalDamageMultiplier(attackElement: ElementType, receiverElement?: ElementType): number {
  if (!receiverElement || receiverElement === 'normal') return 1.0;

  // Water conducts electricity with 1.75x bonus damage
  if (attackElement === 'electricity' && receiverElement === 'water') {
    return 1.75;
  }

  // Frozen enemies take 2.0x damage from Heavy / blunt impacts
  if (receiverElement === 'ice') {
    return 1.8;
  }

  // Oil takes 2.2x damage from Fire
  if (attackElement === 'fire' && receiverElement === 'oil') {
    return 2.2;
  }

  // Acid makes metallic armor brittle (1.4x)
  if (receiverElement === 'acid') {
    return 1.4;
  }

  return 1.0;
}
