// Canvas-Rendering für Kata Blocks.
// Pure-Funktionen — kein React, keine Side-Effects.

import {
  COLS,
  PIECE_META,
  PIECE_SHAPES,
  ROWS,
  type PieceType,
} from './tetrisConstants';
import { drawBlockIcon } from './blockIcons';

// ────────────────────────────────────────────────────────────────────────────
// Geometrie-Helpers
// ────────────────────────────────────────────────────────────────────────────

export function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  if (w <= 0 || h <= 0) return;
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + rr, rr);
  ctx.arcTo(x + w, y + h, x + w - rr, y + h, rr);
  ctx.arcTo(x, y + h, x, y + h - rr, rr);
  ctx.arcTo(x, y, x + rr, y, rr);
  ctx.closePath();
}

function trimBounds(shape: number[][]): {
  minR: number;
  maxR: number;
  minC: number;
  maxC: number;
} {
  let minR = shape.length,
    maxR = -1,
    minC = shape[0].length,
    maxC = -1;
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (shape[r][c]) {
        if (r < minR) minR = r;
        if (r > maxR) maxR = r;
        if (c < minC) minC = c;
        if (c > maxC) maxC = c;
      }
    }
  }
  return { minR, maxR, minC, maxC };
}

// ────────────────────────────────────────────────────────────────────────────
// Block — 6-Layer Premium-Pipeline
// 1. Basis-Farbe   2. Licht/Schatten   3. Kanten   4. Schuppen
// 5. Icon          6. Glow (active only)
// ────────────────────────────────────────────────────────────────────────────

interface BlockOpts {
  active?: boolean;
  flashAmount?: number; // 0..1 — Linien-Clear weiß-Flash
  iconAlpha?: number;
}

function drawScales(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
) {
  if (size < 6) return;
  ctx.save();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
  ctx.lineWidth = 0.4;
  const step = size / 5;
  for (let i = 1; i < 5; i++) {
    ctx.beginPath();
    ctx.moveTo(x + i * step, y);
    ctx.lineTo(x, y + i * step);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + size, y + i * step);
    ctx.lineTo(x + i * step, y + size);
    ctx.stroke();
  }
  ctx.restore();
}

export function drawBlock(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  cellSize: number,
  type: PieceType,
  opts: BlockOpts = {},
) {
  if (cellSize <= 1) return;
  const meta = PIECE_META[type];
  const padding = 0.5;
  const x = cx + padding;
  const y = cy + padding;
  const size = cellSize - padding * 2;
  if (size <= 0) return;
  const r = 3;

  // Layer 1: Basis-Farbe
  drawRoundedRect(ctx, x, y, size, size, r);
  ctx.fillStyle = meta.color;
  ctx.fill();

  // Layer 2: Licht (oben) → Schatten (unten)
  const lightGrad = ctx.createLinearGradient(x, y, x, y + size);
  lightGrad.addColorStop(0, 'rgba(255, 255, 255, 0.14)');
  lightGrad.addColorStop(0.4, 'rgba(255, 255, 255, 0)');
  lightGrad.addColorStop(0.6, 'rgba(0, 0, 0, 0)');
  lightGrad.addColorStop(1, 'rgba(0, 0, 0, 0.20)');
  drawRoundedRect(ctx, x, y, size, size, r);
  ctx.fillStyle = lightGrad;
  ctx.fill();

  // Layer 3: Kanten — heller oben+links, dunkler unten+rechts
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(x + r, y + 0.5);
  ctx.lineTo(x + size - r, y + 0.5);
  ctx.moveTo(x + 0.5, y + r);
  ctx.lineTo(x + 0.5, y + size - r);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.22)';
  ctx.beginPath();
  ctx.moveTo(x + r, y + size - 0.5);
  ctx.lineTo(x + size - r, y + size - 0.5);
  ctx.moveTo(x + size - 0.5, y + r);
  ctx.lineTo(x + size - 0.5, y + size - r);
  ctx.stroke();

  // Subtiler Outline (komplett umlaufend)
  drawRoundedRect(ctx, x, y, size, size, r);
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.30)';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Layer 4: Schuppen-Textur (diagonale Kreuz-Hatching)
  drawScales(ctx, x, y, size);

  // Layer 5: Icon
  drawBlockIcon(ctx, x, y, size, meta.color, meta.icon, opts.iconAlpha ?? 1);

  // Layer 6: Glow (nur bei aktivem/fallendem Block)
  if (opts.active) {
    ctx.save();
    ctx.shadowColor = meta.color;
    ctx.shadowBlur = 10;
    ctx.globalAlpha = 0.16;
    drawRoundedRect(ctx, x + 1.5, y + 1.5, size - 3, size - 3, r);
    ctx.fillStyle = meta.color;
    ctx.fill();
    ctx.restore();
  }

  // Linien-Clear Weiß-Flash
  if (opts.flashAmount && opts.flashAmount > 0) {
    drawRoundedRect(ctx, x, y, size, size, r);
    ctx.fillStyle = `rgba(255, 255, 255, ${0.65 * opts.flashAmount})`;
    ctx.fill();
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Ghost-Block — gestrichelte Outline ohne Icon, ohne Fill
// ────────────────────────────────────────────────────────────────────────────

export function drawGhostBlock(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  cellSize: number,
  type: PieceType,
) {
  if (cellSize <= 2) return;
  const meta = PIECE_META[type];
  ctx.save();
  ctx.strokeStyle = meta.color;
  ctx.globalAlpha = 0.16;
  ctx.lineWidth = 1;
  ctx.setLineDash([3, 3]);
  drawRoundedRect(ctx, cx + 1.5, cy + 1.5, cellSize - 3, cellSize - 3, 2);
  ctx.stroke();
  ctx.restore();
}

// ────────────────────────────────────────────────────────────────────────────
// Atmosphäre — dezente diagonale Schraffur + Enso
// ────────────────────────────────────────────────────────────────────────────

function drawBackground(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
) {
  // Basis #474e52 (konsistent mit Snake-Tatami)
  ctx.fillStyle = '#474e52';
  ctx.fillRect(0, 0, width, height);

  // Sehr dezente diagonale Schraffur
  ctx.save();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.012)';
  ctx.lineWidth = 0.5;
  const step = 14;
  for (let i = -height; i < width + height; i += step) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i + height, height);
    ctx.stroke();
  }
  ctx.restore();

  // Enso-Kreis im Hintergrund
  ctx.save();
  const cx = width / 2;
  const cy = height / 2;
  const radius = Math.min(width, height) * 0.32;
  ctx.strokeStyle = 'rgba(220, 13, 29, 0.04)';
  ctx.lineWidth = Math.max(2, width / 60);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(cx, cy, radius, Math.PI * 0.15, Math.PI * 1.85, false);
  ctx.stroke();
  ctx.restore();
}

function drawInnerGlow(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
) {
  ctx.save();
  ctx.strokeStyle = 'rgba(212, 201, 181, 0.05)';
  ctx.lineWidth = 1;
  ctx.strokeRect(0.5, 0.5, width - 1, height - 1);
  ctx.restore();
}

// ────────────────────────────────────────────────────────────────────────────
// Mini-Vorschau (Next-Piece) — KEINE Kanji auf dem Canvas, nur die Blöcke.
// (Kanji + Name werden in der DOM-UI nebenan angezeigt.)
// ────────────────────────────────────────────────────────────────────────────

export function drawPiecePreview(
  ctx: CanvasRenderingContext2D,
  cssWidth: number,
  cssHeight: number,
  type: PieceType,
) {
  ctx.clearRect(0, 0, cssWidth, cssHeight);

  const shape = PIECE_SHAPES[type];
  const tb = trimBounds(shape);
  if (tb.maxR < 0) return;
  const cols = tb.maxC - tb.minC + 1;
  const rows = tb.maxR - tb.minR + 1;
  const cell = Math.floor(Math.min(cssWidth / cols, cssHeight / rows) * 0.85);
  const offX = (cssWidth - cols * cell) / 2;
  const offY = (cssHeight - rows * cell) / 2;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (!shape[tb.minR + r][tb.minC + c]) continue;
      drawBlock(ctx, offX + c * cell, offY + r * cell, cell, type);
    }
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Partikel
// ────────────────────────────────────────────────────────────────────────────

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  life: number;
  maxLife: number;
  gravity: number;
  shape?: 'rect' | 'dot';
}

export function drawParticles(
  ctx: CanvasRenderingContext2D,
  particles: Particle[],
) {
  for (const p of particles) {
    const a = Math.max(0, p.life / p.maxLife);
    ctx.save();
    ctx.globalAlpha = a;
    ctx.fillStyle = p.color;
    if (p.shape === 'rect') {
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    } else {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Board-Renderer
// ────────────────────────────────────────────────────────────────────────────

interface PieceLike {
  type: PieceType;
  shape: number[][];
  x: number;
  y: number;
  rotation: number;
}

export interface BoardRenderArgs {
  ctx: CanvasRenderingContext2D;
  cssWidth: number;
  cssHeight: number;
  board: Array<Array<PieceType | 0>>;
  piece: PieceLike | null;
  ghost: PieceLike | null;
  flashRows: number[];
  flashAmount: number;
  contractAmount: number;
  stackOutAmount: number;
  showGhost: boolean;
  particles?: Particle[];
}

export function drawBoard(args: BoardRenderArgs) {
  const {
    ctx,
    cssWidth,
    cssHeight,
    board,
    piece,
    ghost,
    flashRows,
    flashAmount,
    contractAmount,
    stackOutAmount,
    showGhost,
    particles,
  } = args;

  const cellW = cssWidth / COLS;
  const cellH = cssHeight / ROWS;

  drawBackground(ctx, cssWidth, cssHeight);

  // Locked cells
  const stackHide = Math.floor(stackOutAmount * ROWS);
  for (let r = 0; r < ROWS; r++) {
    if (r < stackHide) continue;
    for (let c = 0; c < COLS; c++) {
      const v = board[r][c];
      if (!v) continue;
      const isFlash = flashRows.includes(r);
      let widthScale = 1;
      let xOffset = 0;
      if (isFlash && contractAmount > 0) {
        widthScale = Math.max(0, 1 - contractAmount);
        xOffset = (cellW * (1 - widthScale)) / 2;
      }
      const drawW = cellW * widthScale;
      if (drawW > 1) {
        drawBlock(ctx, c * cellW + xOffset, r * cellH, drawW, v as PieceType, {
          flashAmount: isFlash ? flashAmount : 0,
          // Icons in der gecleardten Reihe leuchten kurz stärker auf
          iconAlpha: isFlash ? 1 + flashAmount * 1.5 : 1,
        });
      }
    }
  }

  // Ghost
  if (piece && ghost && showGhost) {
    for (let r = 0; r < ghost.shape.length; r++) {
      for (let c = 0; c < ghost.shape[r].length; c++) {
        if (!ghost.shape[r][c]) continue;
        const bx = ghost.x + c;
        const by = ghost.y + r;
        if (by < 0) continue;
        drawGhostBlock(ctx, bx * cellW, by * cellH, cellW, ghost.type);
      }
    }
  }

  // Aktives Stück
  if (piece && stackOutAmount === 0) {
    for (let r = 0; r < piece.shape.length; r++) {
      for (let c = 0; c < piece.shape[r].length; c++) {
        if (!piece.shape[r][c]) continue;
        const bx = piece.x + c;
        const by = piece.y + r;
        if (by < 0) continue;
        drawBlock(ctx, bx * cellW, by * cellH, cellW, piece.type, {
          active: true,
        });
      }
    }
  }

  // Roter Energieblitz auf gecleardten Reihen
  if (flashRows.length > 0 && flashAmount > 0) {
    ctx.save();
    ctx.globalAlpha = Math.min(1, flashAmount * 1.2);
    ctx.fillStyle = '#dc0d1d';
    flashRows.forEach((r) => {
      ctx.fillRect(0, r * cellH + cellH / 2 - 1, cssWidth, 2);
    });
    ctx.restore();
  }

  // Partikel
  if (particles && particles.length > 0) {
    drawParticles(ctx, particles);
  }

  // Innerer Rand
  drawInnerGlow(ctx, cssWidth, cssHeight);
}
