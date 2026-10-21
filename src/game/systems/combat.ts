/**
 * 16-Bit Systemic Game Engine - Combat & Combo System
 * Pure calculation logic for combos, damage, knockback, and stamina
 */

import { AttackPhase, WeaponData, WeaponType, ImplantData } from '../types';

export const WEAPONS_CATALOG: Record<WeaponType, WeaponData> = {
  wrench: {
    id: 'wrench',
    name: 'Omni-Wrench Mk.II',
    nameUk: 'Омні-Ключ Мод.II',
    damage: 18,
    speed: 0.22,
    staminaCost: 12,
    element: 'normal',
    descriptionUk: 'Універсальний монтажний важіль інженера. Швидкий, надійний та здатний перемикати клеми терміналів.'
  },
  baton: {
    id: 'baton',
    name: 'Plasma Stun Baton',
    nameUk: 'Плазмовий Стун-Кийок',
    damage: 22,
    speed: 0.18,
    staminaCost: 16,
    element: 'electricity',
    descriptionUk: 'Спеціальний інструмент охорони. Завдає шокових розрядів, перевантажуючи сервоприводи машин.'
  },
  sledge: {
    id: 'sledge',
    name: 'Heavy Arc Sledge',
    nameUk: 'Важкий Дуговий Молот',
    damage: 42,
    speed: 0.42,
    staminaCost: 28,
    element: 'normal',
    descriptionUk: 'Промисловий гідравлічний розбивач. Нищівні удари, відкидає цілі та створює ударні хвилі.'
  }
};

export const IMPLANTS_CATALOG: Record<string, ImplantData> = {
  overclock_core: {
    id: 'overclock_core',
    name: 'Overclock Core',
    nameUk: 'Мікрочип Оверклоку',
    icon: '⚡',
    descriptionUk: '+25% швидкість атак та +30% дальність бойового ривка.',
    statBonus: { attackSpeed: 0.25, dashRange: 0.3 }
  },
  ferro_plating: {
    id: 'ferro_plating',
    name: 'Ferro Plating',
    nameUk: 'Ферро-Броньовані Пластини',
    icon: '🛡️',
    descriptionUk: '-30% отримуваного фізичного та кислотного ураження.',
    statBonus: { defensePct: 0.30 }
  },
  kinetic_dynamo: {
    id: 'kinetic_dynamo',
    name: 'Kinetic Dynamo',
    nameUk: 'Кінетичне Динамо',
    icon: '🔋',
    descriptionUk: 'Відновлює 15 енергії за кожен успішний парир або завершальний комбо-удар.',
    statBonus: { staminaRegen: 15 }
  },
  cryo_emitter: {
    id: 'cryo_emitter',
    name: 'Cryo Emitter',
    nameUk: 'Кріо-Випромінювач',
    icon: '❄️',
    descriptionUk: 'Усі важкі атаки насичуються льодом і заморожують ворогів.',
    statBonus: { freezeChance: 0.4 }
  }
};

/**
 * Evaluates the next attack phase based on input and combo timing
 */
export function getNextAttackPhase(
  currentPhase: AttackPhase,
  inputAction: 'light' | 'heavy' | 'dash' | 'parry' | 'emp',
  comboTimer: number
): {
  nextPhase: AttackPhase;
  comboCount: number;
  damageMultiplier: number;
  staminaRequired: number;
} {
  if (inputAction === 'dash') {
    return {
      nextPhase: 'dash',
      comboCount: 0,
      damageMultiplier: 0,
      staminaRequired: 18
    };
  }

  if (inputAction === 'parry') {
    return {
      nextPhase: 'parry',
      comboCount: 0,
      damageMultiplier: 0,
      staminaRequired: 10
    };
  }

  if (inputAction === 'emp') {
    return {
      nextPhase: 'emp',
      comboCount: 0,
      damageMultiplier: 1.5,
      staminaRequired: 35
    };
  }

  const isComboActive = comboTimer > 0;

  if (inputAction === 'light') {
    if (isComboActive && currentPhase === 'light1') {
      return {
        nextPhase: 'light2',
        comboCount: 2,
        damageMultiplier: 1.25,
        staminaRequired: 12
      };
    }
    return {
      nextPhase: 'light1',
      comboCount: 1,
      damageMultiplier: 1.0,
      staminaRequired: 10
    };
  }

  if (inputAction === 'heavy') {
    if (isComboActive && (currentPhase === 'light1' || currentPhase === 'light2')) {
      // Finisher combo!
      return {
        nextPhase: 'heavy',
        comboCount: 3,
        damageMultiplier: 2.2, // Huge finisher bonus!
        staminaRequired: 22
      };
    }
    // Raw heavy attack
    return {
      nextPhase: 'heavy',
      comboCount: 1,
      damageMultiplier: 1.5,
      staminaRequired: 20
    };
  }

  return {
    nextPhase: 'none',
    comboCount: 0,
    damageMultiplier: 0,
    staminaRequired: 0
  };
}

/**
 * Calculates net incoming damage taking into account parry, i-frames and implants
 */
export function calculateIncomingDamage(
  rawDamage: number,
  isParrying: boolean,
  isInvulnerable: boolean,
  equippedImplants: string[]
): {
  finalDamage: number;
  parrySuccess: boolean;
  absorbed: boolean;
} {
  if (isInvulnerable) {
    return { finalDamage: 0, parrySuccess: false, absorbed: true };
  }

  if (isParrying) {
    // Perfect parry negates all damage and repels attacker
    return { finalDamage: 0, parrySuccess: true, absorbed: true };
  }

  let damage = rawDamage;

  if (equippedImplants.includes('ferro_plating')) {
    const defenseBonus = IMPLANTS_CATALOG.ferro_plating.statBonus.defensePct || 0;
    damage = damage * (1 - defenseBonus);
  }

  return {
    finalDamage: Math.max(1, Math.round(damage)),
    parrySuccess: false,
    absorbed: false
  };
}

/**
 * Calculates knockback velocity vector from attack source to target
 */
export function calculateKnockback(
  sourceX: number,
  sourceY: number,
  targetX: number,
  targetY: number,
  impulse: number
): { vx: number; vy: number } {
  const dx = targetX - sourceX;
  const dy = targetY - sourceY;
  const dist = Math.hypot(dx, dy) || 1;
  return {
    vx: (dx / dist) * impulse,
    vy: (dy / dist) * impulse
  };
}
