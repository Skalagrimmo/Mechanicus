/**
 * 16-Bit Systemic Game Engine - Type Definitions
 */

export type GameState = 'title' | 'playing' | 'paused' | 'gameover' | 'victory';

export type ElementType = 'normal' | 'water' | 'electricity' | 'fire' | 'oil' | 'ice' | 'acid';

export type Direction = 'up' | 'down' | 'left' | 'right';

export interface Vector2D {
  x: number;
  y: number;
}

export interface PlayerStats {
  hp: number;
  maxHp: number;
  stamina: number;
  maxStamina: number;
  scrap: number;
  equippedWeapon: WeaponType;
  equippedImplants: string[]; // implant IDs
  inventory: InventoryItem[];
}

export type WeaponType = 'wrench' | 'baton' | 'sledge';

export interface WeaponData {
  id: WeaponType;
  name: string;
  nameUk: string;
  damage: number;
  speed: number; // attack duration in sec
  staminaCost: number;
  element: ElementType;
  descriptionUk: string;
}

export interface ImplantData {
  id: string;
  name: string;
  nameUk: string;
  icon: string;
  descriptionUk: string;
  statBonus: {
    attackSpeed?: number;
    defensePct?: number;
    staminaRegen?: number;
    dashRange?: number;
    freezeChance?: number;
    chainLightning?: boolean;
  };
}

export interface InventoryItem {
  id: string;
  nameUk: string;
  count: number;
  type: 'consumable' | 'keycard' | 'lore';
  descriptionUk: string;
}

export type AttackPhase = 'none' | 'light1' | 'light2' | 'heavy' | 'dash' | 'parry' | 'emp';

export interface PlayerEntity {
  pos: Vector2D;
  vel: Vector2D;
  dir: Direction;
  stats: PlayerStats;
  attackPhase: AttackPhase;
  attackTimer: number;
  attackCooldown: number;
  comboCount: number;
  comboTimer: number;
  invulnTimer: number;
  isParrying: boolean;
  parryTimer: number;
  parryCooldown: number;
  isDashing: boolean;
  dashTimer: number;
  elementalStatus?: {
    type: ElementType;
    duration: number;
  };
}

export type EnemyType = 'drone_swarmer' | 'sentry_ranged' | 'enforcer_heavy' | 'warden_boss';

export interface EnemyEntity {
  id: number;
  type: EnemyType;
  pos: Vector2D;
  vel: Vector2D;
  hp: number;
  maxHp: number;
  speed: number;
  damage: number;
  dir: Direction;
  state: 'idle' | 'chase' | 'windup' | 'attack' | 'stunned' | 'ko';
  stateTimer: number;
  windupTimer: number;
  telegraphPos?: Vector2D;
  invulnTimer: number;
  elementalStatus?: {
    type: ElementType;
    duration: number;
  };
}

export type PropType = 
  | 'barrel_oil' 
  | 'canister_cryo' 
  | 'generator_arc' 
  | 'terminal_security' 
  | 'blast_door' 
  | 'turret' 
  | 'crate_scrap' 
  | 'conduit_wire';

export interface WorldProp {
  id: number;
  type: PropType;
  pos: Vector2D;
  hp: number;
  maxHp: number;
  state: 'normal' | 'ignited' | 'electrified' | 'frozen' | 'destroyed' | 'activated' | 'hacked';
  stateTimer: number;
  interactionPrompt?: string;
  sectorGate?: number; // target sector if gate
}

export interface Projectile {
  id: number;
  pos: Vector2D;
  vel: Vector2D;
  radius: number;
  damage: number;
  element: ElementType;
  owner: 'player' | 'enemy';
  duration: number;
}

export interface EnvironmentalHazard {
  id: number;
  pos: Vector2D;
  radius: number;
  element: ElementType;
  duration: number; // <= 0 for permanent until reacted
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

export interface FloatingText {
  id: number;
  x: number;
  y: number;
  text: string;
  color: string;
  duration: number;
  alpha: number;
}

export interface SectorInfo {
  id: number;
  code: string;
  nameUk: string;
  descriptionUk: string;
  ambientTrack: AudioTrackKey;
  combatTrack: AudioTrackKey;
  weather: 'acid_rain' | 'static_haze' | 'toxic_smog' | 'reactor_overdrive';
  width: number;
  height: number;
}

export type AudioTrackKey = 
  | 'frost_and_static'
  | 'concrete_hell'
  | 'clock_in_sort_the_rain'
  | 'mechanicus'
  | 'warehouse_assault'
  | 'shadowy_space'
  | 'corroded_machine_pulse'
  | 'circuitry_chase';

export interface TrackMetadata {
  key: AudioTrackKey;
  title: string;
  filename: string;
  vibeUk: string;
  duration: string;
  role: 'ambient' | 'combat' | 'boss' | 'chase';
}

export type SfxType = 
  | 'swing' 
  | 'heavy_hit' 
  | 'parry' 
  | 'dash' 
  | 'explosion' 
  | 'shock' 
  | 'freeze' 
  | 'laser' 
  | 'pickup' 
  | 'terminal' 
  | 'player_hurt'
  | 'boss_roar';

export type GameEvent =
  | { type: 'sfx'; sound: SfxType }
  | { type: 'track'; trackKey: AudioTrackKey }
  | { type: 'shake'; amount: number }
  | { type: 'hitstop'; duration: number }
  | { type: 'particle'; x: number; y: number; color: string; count?: number; speed?: number; size?: number }
  | { type: 'floatText'; x: number; y: number; text: string; color?: string }
  | { type: 'sectorChange'; sectorId: number; nameUk: string }
  | { type: 'stateChange'; newState: GameState }
  | { type: 'objectiveChange'; textUk: string };

export type GameEventListener = (event: GameEvent) => void;

export type PlayerActionCommand = 'light' | 'heavy' | 'dash' | 'parry' | 'emp' | 'interact';

export interface PlayerInputIntent {
  moveX: number;
  moveY: number;
  actions: PlayerActionCommand[];
}
