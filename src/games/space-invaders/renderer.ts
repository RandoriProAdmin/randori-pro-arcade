// Scene-Komposition für Dojo Defenders

import {
  BOSS_H,
  BOSS_W,
  ENEMY_META,
  LOGICAL_HEIGHT,
  LOGICAL_WIDTH,
  PLAYER_Y,
  PLAYER_BELTS,
  POWERUP_H,
  POWERUP_W,
  SHIELD_CHUNK,
  SHIELD_COLS,
  SHIELD_ROWS,
} from './constants';
import {
  drawBoss,
  drawEnemy,
  drawKiBlast,
  drawPlayer,
  drawPowerUp,
  drawShield,
  drawShuriken,
  drawTorii,
  PLAYER_W,
} from './sprites';
import type { Boss, Enemy, Particle, PowerUp, Projectile, Shield, State } from './useSpaceInvadersGame';

// Hintergrund: Enso, Torii, Boden, Vignette, Wand-Linien
function drawDojoBackground(ctx: CanvasRenderingContext2D) {
  // BG
  ctx.fillStyle = '#0a0a0a';
  ctx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);

  // Enso
  ctx.save();
  const cx = LOGICAL_WIDTH / 2;
  const cy = LOGICAL_HEIGHT / 2;
  const radius = Math.min(LOGICAL_WIDTH, LOGICAL_HEIGHT) * 0.34;
  ctx.strokeStyle = 'rgba(220, 13, 29, 0.025)';
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(cx, cy, radius, Math.PI * 0.15, Math.PI * 1.85);
  ctx.stroke();
  ctx.restore();

  // Torii oben
  drawTorii(ctx, LOGICAL_WIDTH);

  // Boden-Andeutung (unteres 15%)
  const floorH = LOGICAL_HEIGHT * 0.18;
  const grad = ctx.createLinearGradient(0, LOGICAL_HEIGHT - floorH, 0, LOGICAL_HEIGHT);
  grad.addColorStop(0, 'rgba(212, 201, 181, 0)');
  grad.addColorStop(1, 'rgba(212, 201, 181, 0.025)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, LOGICAL_HEIGHT - floorH, LOGICAL_WIDTH, floorH);

  // Wand-Linien außen
  ctx.fillStyle = 'rgba(212, 201, 181, 0.04)';
  ctx.fillRect(0, 0, 1, LOGICAL_HEIGHT);
  ctx.fillRect(LOGICAL_WIDTH - 1, 0, 1, LOGICAL_HEIGHT);

  // Vignette
  const vg = ctx.createRadialGradient(
    LOGICAL_WIDTH / 2,
    LOGICAL_HEIGHT / 2,
    Math.min(LOGICAL_WIDTH, LOGICAL_HEIGHT) * 0.25,
    LOGICAL_WIDTH / 2,
    LOGICAL_HEIGHT / 2,
    Math.max(LOGICAL_WIDTH, LOGICAL_HEIGHT) * 0.7,
  );
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(0,0,0,0.45)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);
}

function drawShields(ctx: CanvasRenderingContext2D, shields: Shield[]) {
  for (const s of shields) {
    drawShield(ctx, s.x, s.y, SHIELD_COLS, SHIELD_ROWS, SHIELD_CHUNK, s.pixels);
  }
}

function drawEnemies(ctx: CanvasRenderingContext2D, enemies: Enemy[], now: number) {
  for (const e of enemies) {
    if (!e.alive) continue;
    const meta = ENEMY_META[e.type];
    const bob = Math.sin(now / 800 + e.bobPhase) * 0.7;
    const hitFlash = e.hitFlashUntil > now;
    const damaged = meta.hp > 1 && e.hp < meta.hp;
    drawEnemy(ctx, e.x, e.y, e.type, bob, hitFlash, damaged);
  }
}

function drawBossEntity(ctx: CanvasRenderingContext2D, boss: Boss, now: number) {
  const bob = Math.sin(now / 600) * 1.2;
  const hitFlash = boss.hitFlashUntil > now;
  const lowHpBlink = boss.hp / boss.hpMax < 0.25;
  drawBoss(ctx, boss.x, boss.y, BOSS_W, BOSS_H, {
    fill: boss.fill,
    beltColor: boss.beltColor,
    glow: boss.glow,
    goldRim: boss.goldRim,
    hitFlash,
    lowHpBlink,
    hpRatio: boss.hp / boss.hpMax,
    bobOffset: bob,
  });
}

function drawProjectiles(ctx: CanvasRenderingContext2D, items: Projectile[]) {
  for (const p of items) {
    if (p.kind === 'kiblast') {
      drawKiBlast(ctx, p.x, p.y);
    } else if (p.kind === 'shuriken') {
      drawShuriken(ctx, p.x, p.y, p.size, p.rotation);
    } else if (p.kind === 'bossShuriken') {
      drawShuriken(ctx, p.x, p.y, p.size, p.rotation, '#dc0d1d');
    }
  }
}

function drawPowerUps(ctx: CanvasRenderingContext2D, powerUps: PowerUp[], now: number) {
  for (const pu of powerUps) {
    const pulse = 0.5 + 0.5 * Math.sin(now / 400);
    const rotation = (now / 1500) % (Math.PI * 2);
    drawPowerUp(ctx, pu.x, pu.y, pu.kind, pulse, rotation);
  }
}

function drawParticles(ctx: CanvasRenderingContext2D, particles: Particle[]) {
  for (const p of particles) {
    const a = p.life / p.maxLife;
    ctx.save();
    ctx.globalAlpha = a;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function drawZanshinTint(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = 'rgba(36, 84, 160, 0.04)';
  ctx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);
}

export interface SceneArgs {
  ctx: CanvasRenderingContext2D;
  cssWidth: number;
  cssHeight: number;
  state: State;
  now: number;
  beltIndex: number;
}

export function drawScene({ ctx, cssWidth, state, now, beltIndex }: SceneArgs) {
  // Skala → logisch → CSS
  const scale = cssWidth / LOGICAL_WIDTH;
  ctx.save();
  ctx.scale(scale, scale);

  drawDojoBackground(ctx);

  if ((state.activeEffects.zanshin ?? 0) > now) drawZanshinTint(ctx);

  drawShields(ctx, state.shields);
  drawEnemies(ctx, state.enemies, now);
  if (state.boss) drawBossEntity(ctx, state.boss, now);
  drawProjectiles(ctx, state.playerProjectiles);
  drawProjectiles(ctx, state.enemyProjectiles);
  drawPowerUps(ctx, state.powerUps, now);
  drawParticles(ctx, state.particles);

  // Spieler — bei Game Over nur, wenn noch in der Anfangsphase
  if (state.status !== 'gameOver') {
    const bob = Math.sin(now / 1000) * 0.6;
    const beltDef = PLAYER_BELTS[beltIndex];
    drawPlayer(ctx, state.player.x, PLAYER_Y, {
      beltColor: beltDef.color,
      beltIsBlack: !!beltDef.isBlack,
      firing: state.player.firingUntil > now,
      hitFlash: state.player.hitFlashUntil > now,
      invulnerable:
        state.player.invulnUntil > now || (state.activeEffects.shield ?? 0) > now,
      doubleKi: (state.activeEffects.doubleKi ?? 0) > now,
      bobOffset: bob,
    });
  } else if (state.gameOverAt && now - state.gameOverAt < 500) {
    // Sehr kurzer Flash bevor er ganz weg ist (Partikel zeichnen ihn schon weg)
    const beltDef = PLAYER_BELTS[beltIndex];
    drawPlayer(ctx, state.player.x, PLAYER_Y, {
      beltColor: beltDef.color,
      beltIsBlack: !!beltDef.isBlack,
      firing: false,
      hitFlash: true,
      invulnerable: false,
      doubleKi: false,
      bobOffset: 0,
    });
  }

  ctx.restore();
}

export { LOGICAL_WIDTH, LOGICAL_HEIGHT, PLAYER_W, POWERUP_W, POWERUP_H };
