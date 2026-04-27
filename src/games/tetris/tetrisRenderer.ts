// Canvas-Rendering für Kata Blocks.
// Pure-Funktionen — kein React, keine Side-Effects.

import {
  COLS,
  PIECE_META,
  PIECE_SHAPES,
  ROWS,
  lightenHex,
  type PieceType,
} from './tetrisConstants';

export function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + rr, rr);
  ctx.arcTo(x + w, y + h, x + w - rr, y + h, rr);
  ctx.arcTo(x, y + h, x, y + h - rr, rr);
  ctx.arcTo(x, y, x + rr, y, rr);
  ctx.closePath();
}

export function drawKanji(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
  kanji: string,
  color: string,
  alpha: number,
) {
  ctx.save();
  ctx.font = `${Math.round(size * 0.55)}px "Noto Serif JP", "Hiragino Mincho ProN", "Yu Mincho", serif`;
  ctx.fillStyle = lightenHex(color, 0.2);
  ctx.globalAlpha = alpha;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(kanji, cx, cy + size * 0.04);
  ctx.restore();
}

interface BlockOpts {
  active?: boolean;
  kanjiAlpha?: number;
  flashAmount?: number; // 0..1 — Linien-Clear weiß-Flash
}

/**
 * Zeichnet einen einzelnen Quadrat-Block mit Kanji und innerem Gradient.
 * (cellSize = Pixelgröße einer Zelle.)
 */
export function drawBlock(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  cellSize: number,
  type: PieceType,
  opts: BlockOpts = {},
) {
  const meta = PIECE_META[type];
  const padding = 0.5;
  const x = cx + padding;
  const y = cy + padding;
  const size = cellSize - padding * 2;
  const radius = 2;

  // Glow für aktive Stücke
  if (opts.active) {
    ctx.save();
    ctx.shadowBlur = 12;
    ctx.shadowColor = meta.glow;
  }

  // Block-Hintergrund
  drawRoundedRect(ctx, x, y, size, size, radius);
  ctx.fillStyle = meta.color;
  ctx.fill();

  if (opts.active) ctx.restore();

  // Innerer Gradient (oben heller, unten dunkler — leichter "Carved-Look")
  drawRoundedRect(ctx, x, y, size, size, radius);
  const grad = ctx.createLinearGradient(x, y, x, y + size);
  grad.addColorStop(0, 'rgba(255, 255, 255, 0.10)');
  grad.addColorStop(0.5, 'rgba(255, 255, 255, 0.0)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0.18)');
  ctx.fillStyle = grad;
  ctx.fill();

  // Innerer Schatten (subtil)
  drawRoundedRect(ctx, x, y, size, size, radius);
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Kanji
  const kanjiAlpha = opts.kanjiAlpha ?? (opts.active ? 0.4 : 0.3);
  drawKanji(
    ctx,
    cx + cellSize / 2,
    cy + cellSize / 2,
    cellSize,
    meta.kanji,
    meta.color,
    kanjiAlpha,
  );

  // Weiß-Flash bei Linien-Clear
  if (opts.flashAmount && opts.flashAmount > 0) {
    drawRoundedRect(ctx, x, y, size, size, radius);
    ctx.fillStyle = `rgba(255, 255, 255, ${0.7 * opts.flashAmount})`;
    ctx.fill();
  }
}

/** Geist-Block: nur gestrichelte Outline an der Landeposition. */
export function drawGhostBlock(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  cellSize: number,
  type: PieceType,
) {
  const meta = PIECE_META[type];
  ctx.save();
  ctx.strokeStyle = meta.color;
  ctx.globalAlpha = 0.2;
  ctx.lineWidth = 1;
  ctx.setLineDash([3, 3]);
  drawRoundedRect(ctx, cx + 1, cy + 1, cellSize - 2, cellSize - 2, 2);
  ctx.stroke();
  ctx.restore();
}

/** Enso-Kreis hinter dem Spielfeld (vertikal zentriert, dezent rot). */
export function drawEnso(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
) {
  const radius = Math.min(width, height) * 0.34;
  const cx = width / 2;
  const cy = height / 2;
  ctx.save();
  ctx.strokeStyle = 'rgba(220, 13, 29, 0.025)';
  ctx.lineWidth = Math.max(2, width / 60);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(cx, cy, radius, Math.PI * 0.15, Math.PI * 1.85, false);
  ctx.stroke();
  ctx.restore();
}

/** Vignette: leichte Abdunkelung an Ecken. */
export function drawVignette(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
) {
  const grad = ctx.createRadialGradient(
    width / 2,
    height / 2,
    Math.max(width, height) * 0.25,
    width / 2,
    height / 2,
    Math.max(width, height) * 0.7,
  );
  grad.addColorStop(0, 'rgba(0, 0, 0, 0)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0.45)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);
}

/**
 * Zeichnet einen einzelnen Tetromino-Typ auf einer Mini-Vorschau-Canvas
 * (z.B. "Nächste Technik" oder Start-Screen-Legende). Trim, zentriert.
 */
export function drawPiecePreview(
  ctx: CanvasRenderingContext2D,
  cssWidth: number,
  cssHeight: number,
  type: PieceType,
) {
  ctx.clearRect(0, 0, cssWidth, cssHeight);

  // Trim
  const shape = PIECE_SHAPES[type];
  let top = shape.length,
    bot = -1,
    left = shape[0].length,
    right = -1;
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (shape[r][c]) {
        if (r < top) top = r;
        if (r > bot) bot = r;
        if (c < left) left = c;
        if (c > right) right = c;
      }
    }
  }
  if (bot < 0) return;

  const trimmed: number[][] = [];
  for (let r = top; r <= bot; r++) trimmed.push(shape[r].slice(left, right + 1));

  const cols = trimmed[0].length;
  const rows = trimmed.length;
  const cell = Math.floor(Math.min(cssWidth / cols, cssHeight / rows) * 0.85);
  const offX = (cssWidth - cols * cell) / 2;
  const offY = (cssHeight - rows * cell) / 2;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (!trimmed[r][c]) continue;
      drawBlock(ctx, offX + c * cell, offY + r * cell, cell, type);
    }
  }
}

// Spielfeld-Renderer-Bundle: zeichnet das gesamte Brett in einem Aufruf.
export interface BoardRenderArgs {
  ctx: CanvasRenderingContext2D;
  cssWidth: number;
  cssHeight: number;
  board: Array<Array<PieceType | 0>>;
  piece: { type: PieceType; shape: number[][]; x: number; y: number } | null;
  ghost: { type: PieceType; shape: number[][]; x: number; y: number } | null;
  flashRows: number[];
  flashAmount: number; // 0..1 — Verlauf der Flash-Phase
  contractAmount: number; // 0..1 — Verlauf der Kontraktions-Phase
  stackOutAmount: number; // 0..1 — Verlauf der Stack-Out (Game Over)
  showGhost: boolean;
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
  } = args;

  const cellW = cssWidth / COLS;
  const cellH = cssHeight / ROWS;

  // BG
  ctx.fillStyle = '#0a0a0a';
  ctx.fillRect(0, 0, cssWidth, cssHeight);

  // Enso
  drawEnso(ctx, cssWidth, cssHeight);

  // Vignette
  drawVignette(ctx, cssWidth, cssHeight);

  // Locked cells — mit Stack-Out-Kollaps von oben
  const stackHide = Math.floor(stackOutAmount * ROWS);
  for (let r = 0; r < ROWS; r++) {
    if (r < stackHide) continue; // bei Stack-Out fallen Reihen reihenweise weg (von oben)
    for (let c = 0; c < COLS; c++) {
      const v = board[r][c];
      if (!v) continue;
      const isFlash = flashRows.includes(r);
      let xOffset = 0;
      let widthScale = 1;
      let alpha = 1;

      // Während Flash-Phase (Kontraktion): Blöcke der gecleardten Reihen schrumpfen zur Mitte
      if (isFlash && contractAmount > 0) {
        widthScale = Math.max(0, 1 - contractAmount);
        xOffset = (cellW * (1 - widthScale)) / 2;
      }

      ctx.save();
      ctx.globalAlpha = alpha;
      drawBlock(
        ctx,
        c * cellW + xOffset,
        r * cellH,
        cellW * widthScale,
        v as PieceType,
        {
          flashAmount: isFlash ? flashAmount : 0,
          kanjiAlpha: isFlash ? 0.3 + 0.5 * flashAmount : 0.3,
        },
      );
      ctx.restore();
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

  // Roter Energieblitz entlang der gecleardten Reihen (während Flash)
  if (flashRows.length > 0 && flashAmount > 0) {
    ctx.save();
    ctx.globalAlpha = Math.min(1, flashAmount * 1.2);
    ctx.fillStyle = '#dc0d1d';
    flashRows.forEach((r) => {
      ctx.fillRect(0, r * cellH + cellH / 2 - 1, cssWidth, 2);
    });
    ctx.restore();
  }
}
