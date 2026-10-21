/**
 * 16-Bit Systemic Game Engine - World & Sector Generator
 * Handles tilemaps, collision queries, interactive objects, and sector transitions.
 */

import { SectorInfo, WorldProp, EnemyEntity, Vector2D } from '../types';

export const TILE_SIZE = 16;

export type TileType = 
  | 'floor_metal' 
  | 'floor_concrete' 
  | 'wall_reinforced' 
  | 'wall_pipe' 
  | 'puddle_water' 
  | 'spill_oil' 
  | 'sheet_ice' 
  | 'hazard_acid';

export interface SectorMap {
  info: SectorInfo;
  widthInTiles: number;
  heightInTiles: number;
  tiles: TileType[][];
  props: WorldProp[];
  enemies: EnemyEntity[];
  playerSpawn: Vector2D;
}

export const SECTORS: Record<number, SectorInfo> = {
  1: {
    id: 1,
    code: 'SEC-01-WH',
    nameUk: 'Складальний Склад',
    descriptionUk: 'Сортувальні лінії конвеєрів та вантажні крани. Дощ шумить по металевому даху.',
    ambientTrack: 'clock_in_sort_the_rain',
    combatTrack: 'warehouse_assault',
    weather: 'acid_rain',
    width: 32,
    height: 24
  },
  2: {
    id: 2,
    code: 'SEC-02-RX',
    nameUk: 'Корозійний Реактор',
    descriptionUk: 'Камери кріо-охолодження та пробиті баки кислотного охолоджувача.',
    ambientTrack: 'corroded_machine_pulse',
    combatTrack: 'frost_and_static',
    weather: 'toxic_smog',
    width: 32,
    height: 24
  },
  3: {
    id: 3,
    code: 'SEC-03-UG',
    nameUk: 'Тіньові Тунелі',
    descriptionUk: 'Високовольтні магістралі та сенсорні сканери автономної оборони.',
    ambientTrack: 'shadowy_space',
    combatTrack: 'circuitry_chase',
    weather: 'static_haze',
    width: 34,
    height: 24
  },
  4: {
    id: 4,
    code: 'SEC-04-MC',
    nameUk: 'Серце Машини (Вівтар)',
    descriptionUk: 'Святилище Архітектора Корпусу. Гігантські маховики та священні шини живлення.',
    ambientTrack: 'concrete_hell',
    combatTrack: 'mechanicus',
    weather: 'reactor_overdrive',
    width: 36,
    height: 26
  }
};

/**
 * Procedural/Hand-crafted generator for the 4 sectors
 */
export function generateSectorMap(sectorId: number): SectorMap {
  const info = SECTORS[sectorId] || SECTORS[1];
  const w = info.width;
  const h = info.height;

  // Initialize with concrete floor
  const tiles: TileType[][] = Array.from({ length: h }, () => 
    Array.from({ length: w }, () => 'floor_concrete' as TileType)
  );

  // Outer walls
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (x === 0 || x === w - 1 || y === 0 || y === h - 1) {
        tiles[y][x] = 'wall_reinforced';
      }
    }
  }

  const props: WorldProp[] = [];
  const enemies: EnemyEntity[] = [];
  let playerSpawn: Vector2D = { x: 48, y: 192 };
  let propIdCounter = 1;
  let enemyIdCounter = 1;

  if (sectorId === 1) {
    // Sector 1: Warehouse
    // Some internal barrier walls forming warehouse aisles
    for (let y = 4; y < 12; y++) {
      tiles[y][10] = 'wall_pipe';
      tiles[y][20] = 'wall_pipe';
    }
    for (let y = 14; y < 20; y++) {
      tiles[y][14] = 'wall_pipe';
    }

    // Puddle of water near electrical wire
    for (let py = 6; py < 10; py++) {
      for (let px = 4; px < 8; px++) {
        tiles[py][px] = 'puddle_water';
      }
    }

    // Oil spill near barrels
    for (let py = 15; py < 18; py++) {
      for (let px = 18; px < 22; px++) {
        tiles[py][px] = 'spill_oil';
      }
    }

    // Props
    props.push({
      id: propIdCounter++,
      type: 'generator_arc',
      pos: { x: 5 * TILE_SIZE, y: 5 * TILE_SIZE },
      hp: 50,
      maxHp: 50,
      state: 'normal',
      stateTimer: 0,
      interactionPrompt: 'Ударте для електро-імпульсу по воді!'
    });

    props.push({
      id: propIdCounter++,
      type: 'barrel_oil',
      pos: { x: 19 * TILE_SIZE, y: 16 * TILE_SIZE },
      hp: 20,
      maxHp: 20,
      state: 'normal',
      stateTimer: 0,
      interactionPrompt: 'Бочка з паливом (вибухонебезпечно)'
    });

    props.push({
      id: propIdCounter++,
      type: 'barrel_oil',
      pos: { x: 21 * TILE_SIZE, y: 16 * TILE_SIZE },
      hp: 20,
      maxHp: 20,
      state: 'normal',
      stateTimer: 0
    });

    props.push({
      id: propIdCounter++,
      type: 'crate_scrap',
      pos: { x: 12 * TILE_SIZE, y: 8 * TILE_SIZE },
      hp: 15,
      maxHp: 15,
      state: 'normal',
      stateTimer: 0,
      interactionPrompt: 'Ящик з деталями'
    });

    props.push({
      id: propIdCounter++,
      type: 'terminal_security',
      pos: { x: 28 * TILE_SIZE, y: 5 * TILE_SIZE },
      hp: 100,
      maxHp: 100,
      state: 'normal',
      stateTimer: 0,
      interactionPrompt: '[E / Кнопка Y] Зламати термінал дверей'
    });

    props.push({
      id: propIdCounter++,
      type: 'blast_door',
      pos: { x: 30 * TILE_SIZE, y: 12 * TILE_SIZE },
      hp: 999,
      maxHp: 999,
      state: 'normal',
      stateTimer: 0,
      interactionPrompt: 'Шлюз до Сектора 02 (Заблоковано)',
      sectorGate: 2
    });

    // Enemies
    enemies.push({
      id: enemyIdCounter++,
      type: 'drone_swarmer',
      pos: { x: 16 * TILE_SIZE, y: 8 * TILE_SIZE },
      vel: { x: 0, y: 0 },
      hp: 35,
      maxHp: 35,
      speed: 1.1,
      damage: 10,
      dir: 'down',
      state: 'idle',
      stateTimer: 0,
      windupTimer: 0,
      invulnTimer: 0
    });

    enemies.push({
      id: enemyIdCounter++,
      type: 'drone_swarmer',
      pos: { x: 22 * TILE_SIZE, y: 17 * TILE_SIZE },
      vel: { x: 0, y: 0 },
      hp: 35,
      maxHp: 35,
      speed: 1.1,
      damage: 10,
      dir: 'left',
      state: 'idle',
      stateTimer: 0,
      windupTimer: 0,
      invulnTimer: 0
    });

    enemies.push({
      id: enemyIdCounter++,
      type: 'sentry_ranged',
      pos: { x: 26 * TILE_SIZE, y: 8 * TILE_SIZE },
      vel: { x: 0, y: 0 },
      hp: 45,
      maxHp: 45,
      speed: 0.6,
      damage: 14,
      dir: 'left',
      state: 'idle',
      stateTimer: 0,
      windupTimer: 0,
      invulnTimer: 0
    });
  } else if (sectorId === 2) {
    // Sector 2: Corrosion Sump & Cryo Conduit
    playerSpawn = { x: 48, y: 192 };

    // Hazard acid pools
    for (let py = 5; py < 10; py++) {
      for (let px = 8; px < 13; px++) {
        tiles[py][px] = 'hazard_acid';
      }
    }

    // Water puddle
    for (let py = 12; py < 17; py++) {
      for (let px = 18; px < 24; px++) {
        tiles[py][px] = 'puddle_water';
      }
    }

    // Cryo canisters
    props.push({
      id: propIdCounter++,
      type: 'canister_cryo',
      pos: { x: 17 * TILE_SIZE, y: 14 * TILE_SIZE },
      hp: 20,
      maxHp: 20,
      state: 'normal',
      stateTimer: 0,
      interactionPrompt: 'Кріо-каністра (вибухає льодом)'
    });

    props.push({
      id: propIdCounter++,
      type: 'generator_arc',
      pos: { x: 24 * TILE_SIZE, y: 15 * TILE_SIZE },
      hp: 60,
      maxHp: 60,
      state: 'normal',
      stateTimer: 0
    });

    props.push({
      id: propIdCounter++,
      type: 'crate_scrap',
      pos: { x: 6 * TILE_SIZE, y: 18 * TILE_SIZE },
      hp: 15,
      maxHp: 15,
      state: 'normal',
      stateTimer: 0
    });

    props.push({
      id: propIdCounter++,
      type: 'terminal_security',
      pos: { x: 27 * TILE_SIZE, y: 6 * TILE_SIZE },
      hp: 100,
      maxHp: 100,
      state: 'normal',
      stateTimer: 0,
      interactionPrompt: '[E] Зламати захист реактора'
    });

    props.push({
      id: propIdCounter++,
      type: 'blast_door',
      pos: { x: 30 * TILE_SIZE, y: 12 * TILE_SIZE },
      hp: 999,
      maxHp: 999,
      state: 'normal',
      stateTimer: 0,
      interactionPrompt: 'Шлюз до Сектора 03 (Заблоковано)',
      sectorGate: 3
    });

    // Enforcer heavy & drones
    enemies.push({
      id: enemyIdCounter++,
      type: 'enforcer_heavy',
      pos: { x: 18 * TILE_SIZE, y: 8 * TILE_SIZE },
      vel: { x: 0, y: 0 },
      hp: 90,
      maxHp: 90,
      speed: 0.7,
      damage: 24,
      dir: 'down',
      state: 'idle',
      stateTimer: 0,
      windupTimer: 0,
      invulnTimer: 0
    });

    enemies.push({
      id: enemyIdCounter++,
      type: 'sentry_ranged',
      pos: { x: 22 * TILE_SIZE, y: 18 * TILE_SIZE },
      vel: { x: 0, y: 0 },
      hp: 45,
      maxHp: 45,
      speed: 0.6,
      damage: 14,
      dir: 'up',
      state: 'idle',
      stateTimer: 0,
      windupTimer: 0,
      invulnTimer: 0
    });
  } else if (sectorId === 3) {
    // Sector 3: Shadow Datahub
    playerSpawn = { x: 48, y: 192 };

    // Complex walkway grid
    for (let y = 4; y < 20; y++) {
      if (y !== 12) {
        tiles[y][12] = 'wall_reinforced';
        tiles[y][22] = 'wall_reinforced';
      }
    }

    props.push({
      id: propIdCounter++,
      type: 'barrel_oil',
      pos: { x: 16 * TILE_SIZE, y: 7 * TILE_SIZE },
      hp: 20,
      maxHp: 20,
      state: 'normal',
      stateTimer: 0
    });

    props.push({
      id: propIdCounter++,
      type: 'canister_cryo',
      pos: { x: 18 * TILE_SIZE, y: 16 * TILE_SIZE },
      hp: 20,
      maxHp: 20,
      state: 'normal',
      stateTimer: 0
    });

    props.push({
      id: propIdCounter++,
      type: 'terminal_security',
      pos: { x: 28 * TILE_SIZE, y: 6 * TILE_SIZE },
      hp: 100,
      maxHp: 100,
      state: 'normal',
      stateTimer: 0,
      interactionPrompt: '[E] Авторизувати доступ до Серця Машини'
    });

    props.push({
      id: propIdCounter++,
      type: 'blast_door',
      pos: { x: 32 * TILE_SIZE, y: 12 * TILE_SIZE },
      hp: 999,
      maxHp: 999,
      state: 'normal',
      stateTimer: 0,
      interactionPrompt: 'Вхід до Санктуарію Архітектора',
      sectorGate: 4
    });

    enemies.push({
      id: enemyIdCounter++,
      type: 'drone_swarmer',
      pos: { x: 16 * TILE_SIZE, y: 12 * TILE_SIZE },
      vel: { x: 0, y: 0 },
      hp: 40,
      maxHp: 40,
      speed: 1.2,
      damage: 12,
      dir: 'left',
      state: 'idle',
      stateTimer: 0,
      windupTimer: 0,
      invulnTimer: 0
    });

    enemies.push({
      id: enemyIdCounter++,
      type: 'enforcer_heavy',
      pos: { x: 26 * TILE_SIZE, y: 12 * TILE_SIZE },
      vel: { x: 0, y: 0 },
      hp: 110,
      maxHp: 110,
      speed: 0.75,
      damage: 26,
      dir: 'left',
      state: 'idle',
      stateTimer: 0,
      windupTimer: 0,
      invulnTimer: 0
    });

    enemies.push({
      id: enemyIdCounter++,
      type: 'sentry_ranged',
      pos: { x: 26 * TILE_SIZE, y: 18 * TILE_SIZE },
      vel: { x: 0, y: 0 },
      hp: 50,
      maxHp: 50,
      speed: 0.6,
      damage: 16,
      dir: 'up',
      state: 'idle',
      stateTimer: 0,
      windupTimer: 0,
      invulnTimer: 0
    });
  } else if (sectorId === 4) {
    // Sector 4: Mechanicus Core - The Boss Sanctuary
    playerSpawn = { x: 64, y: 200 };

    // Circular arena layout with conduits and water ring
    for (let y = 6; y < 20; y++) {
      tiles[y][8] = 'puddle_water';
      tiles[y][27] = 'puddle_water';
    }

    // Arc generators for environmental lightning
    props.push({
      id: propIdCounter++,
      type: 'generator_arc',
      pos: { x: 8 * TILE_SIZE, y: 7 * TILE_SIZE },
      hp: 120,
      maxHp: 120,
      state: 'normal',
      stateTimer: 0
    });

    props.push({
      id: propIdCounter++,
      type: 'generator_arc',
      pos: { x: 27 * TILE_SIZE, y: 7 * TILE_SIZE },
      hp: 120,
      maxHp: 120,
      state: 'normal',
      stateTimer: 0
    });

    props.push({
      id: propIdCounter++,
      type: 'barrel_oil',
      pos: { x: 12 * TILE_SIZE, y: 18 * TILE_SIZE },
      hp: 20,
      maxHp: 20,
      state: 'normal',
      stateTimer: 0
    });

    props.push({
      id: propIdCounter++,
      type: 'canister_cryo',
      pos: { x: 23 * TILE_SIZE, y: 18 * TILE_SIZE },
      hp: 20,
      maxHp: 20,
      state: 'normal',
      stateTimer: 0
    });

    // The BOSS: Warden Mechanicus!
    enemies.push({
      id: enemyIdCounter++,
      type: 'warden_boss',
      pos: { x: 18 * TILE_SIZE, y: 11 * TILE_SIZE },
      vel: { x: 0, y: 0 },
      hp: 360,
      maxHp: 360,
      speed: 0.8,
      damage: 28,
      dir: 'down',
      state: 'idle',
      stateTimer: 0,
      windupTimer: 0,
      invulnTimer: 0
    });
  }

  return {
    info,
    widthInTiles: w,
    heightInTiles: h,
    tiles,
    props,
    enemies,
    playerSpawn
  };
}

/**
 * Checks collision with walls or impassable tiles
 */
export function checkTileCollision(
  map: SectorMap,
  x: number,
  y: number,
  radius: number = 7
): boolean {
  const minTileX = Math.floor((x - radius) / TILE_SIZE);
  const maxTileX = Math.floor((x + radius) / TILE_SIZE);
  const minTileY = Math.floor((y - radius) / TILE_SIZE);
  const maxTileY = Math.floor((y + radius) / TILE_SIZE);

  for (let ty = minTileY; ty <= maxTileY; ty++) {
    for (let tx = minTileX; tx <= maxTileX; tx++) {
      if (ty < 0 || ty >= map.heightInTiles || tx < 0 || tx >= map.widthInTiles) {
        return true; // Outside bounds
      }
      const tile = map.tiles[ty][tx];
      if (tile === 'wall_reinforced' || tile === 'wall_pipe') {
        return true;
      }
    }
  }

  // Also check locked blast doors
  for (const prop of map.props) {
    if (prop.type === 'blast_door' && prop.state !== 'activated' && prop.state !== 'hacked') {
      const dist = Math.hypot(prop.pos.x + 8 - x, prop.pos.y + 8 - y);
      if (dist < radius + 10) {
        return true;
      }
    }
  }

  return false;
}
