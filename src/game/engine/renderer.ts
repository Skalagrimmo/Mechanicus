/**
 * 16-Bit Systemic Game Engine - Pixel Canvas Renderer
 * Renders native 384x216 pixel canvas with tile patterns, animated sprites,
 * dynamic particles, lighting, elemental hazards, and combat hit flashes.
 */

import { SectorMap, TILE_SIZE } from './world';
import { PlayerEntity, EnemyEntity, WorldProp, Projectile, EnvironmentalHazard, Particle, FloatingText } from '../types';

export const VIRTUAL_WIDTH = 384;
export const VIRTUAL_HEIGHT = 216;

export interface RenderState {
  map: SectorMap;
  player: PlayerEntity;
  enemies: EnemyEntity[];
  props: WorldProp[];
  projectiles: Projectile[];
  hazards: EnvironmentalHazard[];
  particles: Particle[];
  floatingTexts: FloatingText[];
  cameraX: number;
  cameraY: number;
  screenShake: number;
  weatherTimer: number;
  hitstopTimer: number;
  showCRT: boolean;
  gameTime: number;
}

export class PixelRenderer {
  private offscreenCanvas: HTMLCanvasElement;
  private offscreenCtx: CanvasRenderingContext2D;
  private lightCanvas: HTMLCanvasElement;
  private lightCtx: CanvasRenderingContext2D;

  constructor() {
    this.offscreenCanvas = document.createElement('canvas');
    this.offscreenCanvas.width = VIRTUAL_WIDTH;
    this.offscreenCanvas.height = VIRTUAL_HEIGHT;
    this.offscreenCtx = this.offscreenCanvas.getContext('2d', { alpha: false })!;
    this.offscreenCtx.imageSmoothingEnabled = false;

    this.lightCanvas = document.createElement('canvas');
    this.lightCanvas.width = VIRTUAL_WIDTH;
    this.lightCanvas.height = VIRTUAL_HEIGHT;
    this.lightCtx = this.lightCanvas.getContext('2d')!;
  }

  public render(targetCtx: CanvasRenderingContext2D, targetWidth: number, targetHeight: number, state: RenderState) {
    const ctx = this.offscreenCtx;
    ctx.imageSmoothingEnabled = false;

    // Camera with screen shake
    let shakeX = 0;
    let shakeY = 0;
    if (state.screenShake > 0) {
      shakeX = (Math.random() - 0.5) * state.screenShake * 6;
      shakeY = (Math.random() - 0.5) * state.screenShake * 6;
    }

    const camX = Math.round(state.cameraX + shakeX);
    const camY = Math.round(state.cameraY + shakeY);

    // 1. Clear background
    ctx.fillStyle = '#0a0d14';
    ctx.fillRect(0, 0, VIRTUAL_WIDTH, VIRTUAL_HEIGHT);

    // 2. Render Tiles
    this.renderTiles(ctx, state.map, camX, camY, state.gameTime);

    // 3. Render Environmental Hazards
    this.renderHazards(ctx, state.hazards, camX, camY, state.gameTime);

    // 4. Render Props
    this.renderProps(ctx, state.props, camX, camY, state.gameTime);

    // 5. Render Projectiles
    this.renderProjectiles(ctx, state.projectiles, camX, camY);

    // 6. Render Enemies
    this.renderEnemies(ctx, state.enemies, camX, camY, state.gameTime);

    // 7. Render Player
    this.renderPlayer(ctx, state.player, camX, camY, state.gameTime);

    // 8. Render Particles
    this.renderParticles(ctx, state.particles, camX, camY);

    // 9. Render Weather & Atmospheric Effects
    this.renderWeather(ctx, state.map.info.weather, state.weatherTimer, state.gameTime);

    // 10. Render 2D Dynamic Lighting Mask
    this.renderLighting(ctx, state, camX, camY);

    // 11. Render In-World Floating Combat Texts
    this.renderFloatingTexts(ctx, state.floatingTexts, camX, camY);

    // 12. Blit pixel buffer to target canvas scaled cleanly
    targetCtx.imageSmoothingEnabled = false;
    targetCtx.fillStyle = '#05070a';
    targetCtx.fillRect(0, 0, targetWidth, targetHeight);

    // Calculate integer or uniform aspect ratio scale
    const scale = Math.min(targetWidth / VIRTUAL_WIDTH, targetHeight / VIRTUAL_HEIGHT);
    const destW = Math.round(VIRTUAL_WIDTH * scale);
    const destH = Math.round(VIRTUAL_HEIGHT * scale);
    const destX = Math.round((targetWidth - destW) / 2);
    const destY = Math.round((targetHeight - destH) / 2);

    targetCtx.drawImage(
      this.offscreenCanvas,
      0, 0, VIRTUAL_WIDTH, VIRTUAL_HEIGHT,
      destX, destY, destW, destH
    );
  }

  private renderTiles(ctx: CanvasRenderingContext2D, map: SectorMap, camX: number, camY: number, time: number) {
    const minX = Math.max(0, Math.floor(camX / TILE_SIZE));
    const maxX = Math.min(map.widthInTiles - 1, Math.ceil((camX + VIRTUAL_WIDTH) / TILE_SIZE));
    const minY = Math.max(0, Math.floor(camY / TILE_SIZE));
    const maxY = Math.min(map.heightInTiles - 1, Math.ceil((camY + VIRTUAL_HEIGHT) / TILE_SIZE));

    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const tile = map.tiles[y][x];
        const screenX = x * TILE_SIZE - camX;
        const screenY = y * TILE_SIZE - camY;

        switch (tile) {
          case 'floor_concrete':
            ctx.fillStyle = '#1e2430';
            ctx.fillRect(screenX, screenY, TILE_SIZE, TILE_SIZE);
            ctx.fillStyle = '#171c26';
            ctx.fillRect(screenX + 1, screenY + 1, TILE_SIZE - 2, TILE_SIZE - 2);
            ctx.fillStyle = '#283040';
            ctx.fillRect(screenX + 2, screenY + 2, 2, 2);
            break;

          case 'floor_metal':
            ctx.fillStyle = '#2a3342';
            ctx.fillRect(screenX, screenY, TILE_SIZE, TILE_SIZE);
            ctx.fillStyle = '#333f52';
            ctx.fillRect(screenX + 2, screenY + 2, 4, 4);
            ctx.fillRect(screenX + 10, screenY + 10, 4, 4);
            break;

          case 'wall_reinforced':
            ctx.fillStyle = '#0f141c';
            ctx.fillRect(screenX, screenY, TILE_SIZE, TILE_SIZE);
            ctx.fillStyle = '#3b4759';
            ctx.fillRect(screenX + 1, screenY + 1, TILE_SIZE - 2, 4);
            ctx.fillStyle = '#222a36';
            ctx.fillRect(screenX + 1, screenY + 5, TILE_SIZE - 2, TILE_SIZE - 6);
            // Hazard yellow/black stripe
            if ((x + y) % 3 === 0) {
              ctx.fillStyle = '#d97706';
              ctx.fillRect(screenX + 3, screenY + 7, 3, 5);
            }
            break;

          case 'wall_pipe':
            ctx.fillStyle = '#121822';
            ctx.fillRect(screenX, screenY, TILE_SIZE, TILE_SIZE);
            ctx.fillStyle = '#0284c7';
            ctx.fillRect(screenX + 3, screenY + 2, TILE_SIZE - 6, TILE_SIZE - 4);
            ctx.fillStyle = '#38bdf8';
            ctx.fillRect(screenX + 5, screenY + 3, 2, TILE_SIZE - 6);
            break;

          case 'puddle_water': {
            ctx.fillStyle = '#152636';
            ctx.fillRect(screenX, screenY, TILE_SIZE, TILE_SIZE);
            const shimmer = Math.sin(time * 3 + x + y) * 0.5 + 0.5;
            ctx.fillStyle = shimmer > 0.6 ? '#38bdf8' : '#0284c7';
            ctx.fillRect(screenX + 3, screenY + 5, 8, 3);
            ctx.fillRect(screenX + 6, screenY + 10, 6, 2);
            break;
          }

          case 'spill_oil': {
            ctx.fillStyle = '#11141a';
            ctx.fillRect(screenX, screenY, TILE_SIZE, TILE_SIZE);
            // Rainbow sheen
            const hue = Math.floor((time * 40 + x * 20 + y * 20) % 360);
            ctx.fillStyle = `hsl(${hue}, 60%, 25%)`;
            ctx.fillRect(screenX + 2, screenY + 2, TILE_SIZE - 4, TILE_SIZE - 4);
            break;
          }

          case 'sheet_ice':
            ctx.fillStyle = '#67e8f9';
            ctx.fillRect(screenX, screenY, TILE_SIZE, TILE_SIZE);
            ctx.fillStyle = '#cffafe';
            ctx.fillRect(screenX + 2, screenY + 3, 4, 2);
            ctx.fillRect(screenX + 8, screenY + 9, 5, 2);
            break;

          case 'hazard_acid': {
            const bubble = Math.sin(time * 5 + x * 3) > 0.7;
            ctx.fillStyle = '#14532d';
            ctx.fillRect(screenX, screenY, TILE_SIZE, TILE_SIZE);
            ctx.fillStyle = '#22c55e';
            ctx.fillRect(screenX + 3, screenY + 3, 6, 4);
            if (bubble) {
              ctx.fillStyle = '#86efac';
              ctx.fillRect(screenX + 7, screenY + 6, 2, 2);
            }
            break;
          }
        }
      }
    }
  }

  private renderHazards(ctx: CanvasRenderingContext2D, hazards: EnvironmentalHazard[], camX: number, camY: number, time: number) {
    for (const h of hazards) {
      const sx = h.pos.x - camX;
      const sy = h.pos.y - camY;
      ctx.beginPath();
      ctx.arc(sx, sy, h.radius, 0, Math.PI * 2);

      if (h.element === 'fire') {
        const alpha = 0.4 + Math.sin(time * 12) * 0.15;
        ctx.fillStyle = `rgba(239, 68, 68, ${alpha})`;
        ctx.fill();
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 1;
        ctx.stroke();
      } else if (h.element === 'electricity') {
        const alpha = 0.5 + Math.sin(time * 20) * 0.2;
        ctx.fillStyle = `rgba(56, 189, 248, ${alpha})`;
        ctx.fill();
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      } else if (h.element === 'ice') {
        ctx.fillStyle = 'rgba(165, 243, 252, 0.45)';
        ctx.fill();
      }
    }
  }

  private renderProps(ctx: CanvasRenderingContext2D, props: WorldProp[], camX: number, camY: number, time: number) {
    for (const p of props) {
      if (p.state === 'destroyed') continue;
      const sx = Math.round(p.pos.x - camX);
      const sy = Math.round(p.pos.y - camY);

      switch (p.type) {
        case 'barrel_oil': {
          const isIgnited = p.state === 'ignited';
          ctx.fillStyle = isIgnited ? '#ef4444' : '#b45309';
          ctx.fillRect(sx + 2, sy + 1, 12, 14);
          ctx.fillStyle = '#78350f';
          ctx.fillRect(sx + 1, sy + 3, 14, 2);
          ctx.fillRect(sx + 1, sy + 11, 14, 2);
          ctx.fillStyle = isIgnited ? '#fef08a' : '#f59e0b';
          // Flame or biohazard symbol
          ctx.fillRect(sx + 6, sy + 6, 4, 4);
          break;
        }

        case 'canister_cryo':
          ctx.fillStyle = '#0284c7';
          ctx.fillRect(sx + 2, sy + 2, 12, 12);
          ctx.fillStyle = '#e0f2fe';
          ctx.fillRect(sx + 4, sy + 4, 8, 8);
          ctx.fillStyle = '#38bdf8';
          ctx.fillRect(sx + 6, sy + 6, 4, 4);
          break;

        case 'generator_arc': {
          ctx.fillStyle = '#1e293b';
          ctx.fillRect(sx + 1, sy + 1, 14, 14);
          ctx.fillStyle = '#0ea5e9';
          ctx.fillRect(sx + 3, sy + 3, 10, 10);
          // Sparking core
          const spark = Math.sin(time * 15 + p.id) > 0.3;
          ctx.fillStyle = spark ? '#fef08a' : '#38bdf8';
          ctx.fillRect(sx + 6, sy + 6, 4, 4);
          break;
        }

        case 'crate_scrap':
          ctx.fillStyle = '#78350f';
          ctx.fillRect(sx + 1, sy + 1, 14, 14);
          ctx.fillStyle = '#92400e';
          ctx.fillRect(sx + 2, sy + 2, 12, 12);
          ctx.fillStyle = '#451a03';
          ctx.fillRect(sx + 1, sy + 1, 14, 2);
          ctx.fillRect(sx + 7, sy + 1, 2, 14);
          break;

        case 'terminal_security': {
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(sx + 2, sy + 1, 12, 14);
          const isHacked = p.state === 'hacked' || p.state === 'activated';
          ctx.fillStyle = isHacked ? '#22c55e' : '#ef4444';
          ctx.fillRect(sx + 4, sy + 3, 8, 6);
          // Screen flicker
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(sx + 5, sy + 4, 2, 2);
          break;
        }

        case 'blast_door': {
          const isOpen = p.state === 'activated' || p.state === 'hacked';
          if (isOpen) {
            ctx.fillStyle = '#15803d';
            ctx.fillRect(sx + 1, sy + 1, 14, 3);
            ctx.fillRect(sx + 1, sy + 12, 14, 3);
          } else {
            ctx.fillStyle = '#334155';
            ctx.fillRect(sx, sy, 16, 16);
            ctx.fillStyle = '#ef4444';
            ctx.fillRect(sx + 4, sy + 6, 8, 4);
            // Caution stripes
            ctx.fillStyle = '#f59e0b';
            ctx.fillRect(sx + 2, sy + 2, 3, 3);
            ctx.fillRect(sx + 11, sy + 2, 3, 3);
          }
          break;
        }
      }
    }
  }

  private renderProjectiles(ctx: CanvasRenderingContext2D, projectiles: Projectile[], camX: number, camY: number) {
    for (const proj of projectiles) {
      const sx = Math.round(proj.pos.x - camX);
      const sy = Math.round(proj.pos.y - camY);

      if (proj.owner === 'player') {
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(sx - 2, sy - 2, 5, 5);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(sx - 1, sy - 1, 3, 3);
      } else {
        // Red laser projectile
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(sx - 2, sy - 2, 5, 5);
        ctx.fillStyle = '#fef08a';
        ctx.fillRect(sx - 1, sy - 1, 3, 3);
      }
    }
  }

  private renderEnemies(ctx: CanvasRenderingContext2D, enemies: EnemyEntity[], camX: number, camY: number, time: number) {
    for (const e of enemies) {
      if (e.state === 'ko') {
        // KO dissolve effect
        const sx = Math.round(e.pos.x - camX);
        const sy = Math.round(e.pos.y - camY);
        ctx.fillStyle = '#475569';
        ctx.fillRect(sx - 6, sy - 2, 12, 4);
        continue;
      }

      const sx = Math.round(e.pos.x - camX);
      const sy = Math.round(e.pos.y - camY);

      // Hit flash
      const isHit = e.invulnTimer > 0;

      // Telegraph sightline for ranged sentry
      if (e.type === 'sentry_ranged' && e.state === 'windup' && e.telegraphPos) {
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.6)';
        ctx.setLineDash([3, 3]);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(e.telegraphPos.x - camX, e.telegraphPos.y - camY);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Windup ground ring for heavy enforcer
      if (e.type === 'enforcer_heavy' && e.state === 'windup') {
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(sx, sy, 22, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Enemy Health Bar
      const hpPct = Math.max(0, e.hp / e.maxHp);
      const barW = e.type === 'warden_boss' ? 36 : 16;
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(sx - barW / 2, sy - (e.type === 'warden_boss' ? 24 : 14), barW, 3);
      ctx.fillStyle = e.type === 'warden_boss' ? '#dc2626' : '#ef4444';
      ctx.fillRect(sx - barW / 2, sy - (e.type === 'warden_boss' ? 24 : 14), barW * hpPct, 3);

      switch (e.type) {
        case 'drone_swarmer': {
          const hoverY = Math.sin(time * 8 + e.id) * 2;
          ctx.fillStyle = isHit ? '#ffffff' : '#64748b';
          ctx.fillRect(sx - 6, sy - 6 + hoverY, 12, 12);
          // Red optic eye
          ctx.fillStyle = '#ef4444';
          ctx.fillRect(sx - 2, sy - 2 + hoverY, 4, 4);
          // Rotating buzz blades
          const bladeAngle = time * 18;
          const bx = Math.cos(bladeAngle) * 8;
          const by = Math.sin(bladeAngle) * 8;
          ctx.fillStyle = '#94a3b8';
          ctx.fillRect(sx + bx - 1, sy + hoverY + by - 1, 3, 3);
          ctx.fillRect(sx - bx - 1, sy + hoverY - by - 1, 3, 3);
          break;
        }

        case 'sentry_ranged':
          ctx.fillStyle = isHit ? '#ffffff' : '#334155';
          ctx.fillRect(sx - 7, sy - 4, 14, 12);
          ctx.fillStyle = '#0284c7';
          ctx.fillRect(sx - 3, sy - 6, 6, 4); // Turret cap
          // Laser eye
          ctx.fillStyle = e.state === 'windup' ? '#facc15' : '#ef4444';
          ctx.fillRect(sx - 2, sy - 2, 4, 4);
          break;

        case 'enforcer_heavy':
          ctx.fillStyle = isHit ? '#ffffff' : '#1e293b';
          ctx.fillRect(sx - 9, sy - 10, 18, 18);
          // Heavy Shield plate
          ctx.fillStyle = '#f59e0b';
          ctx.fillRect(sx - 10, sy - 2, 20, 6);
          // Visor slit
          ctx.fillStyle = '#ef4444';
          ctx.fillRect(sx - 5, sy - 7, 10, 2);
          break;

        case 'warden_boss': {
          // Boss: The Mechanicus Warden (32x32 mechanical titan)
          const gearPulse = Math.sin(time * 6) * 2;
          ctx.fillStyle = isHit ? '#ffffff' : '#0f172a';
          ctx.fillRect(sx - 16, sy - 16, 32, 32);
          // Armor plating
          ctx.fillStyle = '#475569';
          ctx.fillRect(sx - 14, sy - 14, 28, 28);
          // Twin plasma reactors
          const coreGlow = Math.sin(time * 12) > 0 ? '#ef4444' : '#f97316';
          ctx.fillStyle = coreGlow;
          ctx.fillRect(sx - 10, sy - 6, 6, 8);
          ctx.fillRect(sx + 4, sy - 6, 6, 8);
          // Golden cog crest
          ctx.fillStyle = '#f59e0b';
          ctx.fillRect(sx - 6, sy - 12 + gearPulse, 12, 4);
          ctx.fillRect(sx - 2, sy - 14 + gearPulse, 4, 8);
          break;
        }
      }

      // Elemental status effect indicator (frozen ice cube or burning flame)
      if (e.elementalStatus && e.elementalStatus.duration > 0) {
        if (e.elementalStatus.type === 'ice') {
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(sx - 10, sy - 10, 20, 20);
        } else if (e.elementalStatus.type === 'fire') {
          ctx.fillStyle = '#f97316';
          ctx.fillRect(sx - 2, sy - 16, 4, 4);
        } else if (e.elementalStatus.type === 'electricity') {
          ctx.fillStyle = '#fef08a';
          ctx.fillRect(sx - 3, sy - 14, 6, 2);
        }
      }
    }
  }

  private renderPlayer(ctx: CanvasRenderingContext2D, player: PlayerEntity, camX: number, camY: number, time: number) {
    const sx = Math.round(player.pos.x - camX);
    const sy = Math.round(player.pos.y - camY);

    // Invulnerability flash
    if (player.invulnTimer > 0 && Math.floor(time * 30) % 2 === 0) {
      return;
    }

    // Dash trail effect
    if (player.isDashing) {
      ctx.fillStyle = 'rgba(6, 182, 212, 0.4)';
      ctx.fillRect(sx - 6 - player.vel.x * 3, sy - 7 - player.vel.y * 3, 12, 14);
    }

    // Parry shield aura
    if (player.isParrying) {
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(sx, sy, 16, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Player Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.fillRect(sx - 6, sy + 6, 12, 4);

    // Engineer Torso (16-bit cybernetic suit)
    ctx.fillStyle = '#0f766e'; // Teal industrial jacket
    ctx.fillRect(sx - 5, sy - 6, 10, 11);

    // Heavy hydraulic backpack / dynamo
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(sx - 4, sy - 7, 8, 4);
    ctx.fillStyle = '#06b6d4';
    ctx.fillRect(sx - 2, sy - 6, 4, 2); // Dynamo light

    // Cybernetic visor head
    ctx.fillStyle = '#334155';
    ctx.fillRect(sx - 4, sy - 11, 8, 6);
    ctx.fillStyle = '#22d3ee'; // Cyan ocular visor
    if (player.dir === 'right') {
      ctx.fillRect(sx + 1, sy - 9, 3, 2);
    } else if (player.dir === 'left') {
      ctx.fillRect(sx - 4, sy - 9, 3, 2);
    } else {
      ctx.fillRect(sx - 3, sy - 9, 6, 2);
    }

    // Legs walk cycle
    const isMoving = Math.abs(player.vel.x) > 0.1 || Math.abs(player.vel.y) > 0.1;
    const legOffset = isMoving ? Math.sin(time * 16) * 3 : 0;
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(sx - 4, sy + 5 + legOffset, 3, 4);
    ctx.fillRect(sx + 1, sy + 5 - legOffset, 3, 4);

    // Weapon Swing Arc
    if (player.attackPhase !== 'none' && player.attackPhase !== 'dash' && player.attackPhase !== 'parry') {
      this.renderWeaponSwing(ctx, player, sx, sy, time);
    }
  }

  private renderWeaponSwing(ctx: CanvasRenderingContext2D, player: PlayerEntity, sx: number, sy: number, time: number) {
    const isHeavy = player.attackPhase === 'heavy' || player.attackPhase === 'emp';
    const arcRadius = isHeavy ? 26 : 18;
    const color = player.attackPhase === 'emp' ? '#38bdf8' : (isHeavy ? '#f59e0b' : '#22d3ee');

    let startAngle = 0;
    let endAngle = Math.PI;

    if (player.dir === 'right') {
      startAngle = -Math.PI / 3;
      endAngle = Math.PI / 3;
    } else if (player.dir === 'left') {
      startAngle = (2 * Math.PI) / 3;
      endAngle = (4 * Math.PI) / 3;
    } else if (player.dir === 'up') {
      startAngle = -Math.PI * 0.8;
      endAngle = -Math.PI * 0.2;
    } else {
      startAngle = Math.PI * 0.2;
      endAngle = Math.PI * 0.8;
    }

    ctx.strokeStyle = color;
    ctx.lineWidth = isHeavy ? 3 : 2;
    ctx.beginPath();
    ctx.arc(sx, sy, arcRadius, startAngle, endAngle);
    ctx.stroke();

    // Weapon blade sprite
    ctx.fillStyle = '#f8fafc';
    const midAngle = (startAngle + endAngle) / 2;
    const wx = sx + Math.cos(midAngle) * (arcRadius - 2);
    const wy = sy + Math.sin(midAngle) * (arcRadius - 2);
    ctx.fillRect(wx - 2, wy - 2, 4, 4);
  }

  private renderParticles(ctx: CanvasRenderingContext2D, particles: Particle[], camX: number, camY: number) {
    for (const p of particles) {
      if (p.life <= 0) continue;
      const alpha = p.life / p.maxLife;
      ctx.fillStyle = p.color;
      ctx.globalAlpha = alpha;
      ctx.fillRect(Math.round(p.x - camX), Math.round(p.y - camY), p.size, p.size);
    }
    ctx.globalAlpha = 1.0;
  }

  private renderWeather(ctx: CanvasRenderingContext2D, weather: string, weatherTimer: number, time: number) {
    if (weather === 'acid_rain') {
      // 16-bit falling diagonal rain streaks
      ctx.strokeStyle = 'rgba(74, 222, 128, 0.22)';
      ctx.lineWidth = 1;
      for (let i = 0; i < 40; i++) {
        const rx = ((i * 37 + time * 180) % VIRTUAL_WIDTH);
        const ry = ((i * 53 + time * 320) % VIRTUAL_HEIGHT);
        ctx.beginPath();
        ctx.moveTo(rx, ry);
        ctx.lineTo(rx - 3, ry + 8);
        ctx.stroke();
      }
    } else if (weather === 'toxic_smog') {
      // Drifting green atmosphere
      ctx.fillStyle = 'rgba(22, 101, 52, 0.1)';
      ctx.fillRect(0, 0, VIRTUAL_WIDTH, VIRTUAL_HEIGHT);
    } else if (weather === 'static_haze') {
      // Cathode static noise
      if (Math.random() > 0.4) {
        ctx.fillStyle = 'rgba(56, 189, 248, 0.08)';
        const lineY = Math.floor(Math.random() * VIRTUAL_HEIGHT);
        ctx.fillRect(0, lineY, VIRTUAL_WIDTH, 2);
      }
    } else if (weather === 'reactor_overdrive') {
      // Red pulsing ambient core light
      const pulse = Math.sin(time * 3) * 0.08 + 0.12;
      ctx.fillStyle = `rgba(220, 38, 38, ${pulse})`;
      ctx.fillRect(0, 0, VIRTUAL_WIDTH, VIRTUAL_HEIGHT);
    }
  }

  private renderLighting(ctx: CanvasRenderingContext2D, state: RenderState, camX: number, camY: number) {
    const lCtx = this.lightCtx;
    // Ambient darkness with industrial tone
    lCtx.fillStyle = 'rgba(6, 9, 16, 0.45)';
    lCtx.fillRect(0, 0, VIRTUAL_WIDTH, VIRTUAL_HEIGHT);

    // Cut out light around player
    lCtx.globalCompositeOperation = 'destination-out';

    const playerSx = state.player.pos.x - camX;
    const playerSy = state.player.pos.y - camY;

    const playerGradient = lCtx.createRadialGradient(playerSx, playerSy, 12, playerSx, playerSy, 92);
    playerGradient.addColorStop(0, 'rgba(0, 0, 0, 1.0)');
    playerGradient.addColorStop(0.7, 'rgba(0, 0, 0, 0.85)');
    playerGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    lCtx.fillStyle = playerGradient;
    lCtx.beginPath();
    lCtx.arc(playerSx, playerSy, 92, 0, Math.PI * 2);
    lCtx.fill();

    // Light spots for active terminals and generators
    for (const p of state.props) {
      if (p.type === 'terminal_security' || p.type === 'generator_arc') {
        const psx = p.pos.x - camX + 8;
        const psy = p.pos.y - camY + 8;
        const propGradient = lCtx.createRadialGradient(psx, psy, 4, psx, psy, 40);
        propGradient.addColorStop(0, 'rgba(0, 0, 0, 0.9)');
        propGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        lCtx.fillStyle = propGradient;
        lCtx.beginPath();
        lCtx.arc(psx, psy, 40, 0, Math.PI * 2);
        lCtx.fill();
      }
    }

    lCtx.globalCompositeOperation = 'source-over';

    // Blit lighting mask to offscreen canvas
    ctx.drawImage(this.lightCanvas, 0, 0);
  }

  private renderFloatingTexts(ctx: CanvasRenderingContext2D, texts: FloatingText[], camX: number, camY: number) {
    ctx.font = '8px "Press Start 2P", monospace';
    for (const t of texts) {
      const sx = Math.round(t.x - camX);
      const sy = Math.round(t.y - camY);
      ctx.fillStyle = t.color;
      ctx.globalAlpha = Math.max(0, t.alpha);
      ctx.fillText(t.text, sx, sy);
    }
    ctx.globalAlpha = 1.0;
  }
}
