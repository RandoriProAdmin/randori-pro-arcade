// Canvas-Rendering für Gürtelschlange (Premium Obi + Tatami).
// Pure Funktionen, kein React.

import { GRID_SIZE, type Cell, type Direction, type SnakeBelt } from './useSnakeGame';

// ────────────────────────────────────────────────────────────────────────────
// Farb-Helper
// ────────────────────────────────────────────────────────────────────────────

export function lightenHex(hex: string, amount: number): string {
  const m = /^#?([a-fA-F0-9]{6})$/.exec(hex.trim());
  if (!m) return hex;
  const v = parseInt(m[1], 16);
  const r = (v >> 16) & 0xff;
  const g = (v >> 8) & 0xff;
  const b = v & 0xff;
  const lr = Math.min(255, Math.round(r + (255 - r) * amount));
  const lg = Math.min(255, Math.round(g + (255 - g) * amount));
  const lb = Math.min(255, Math.round(b + (255 - b) * amount));
  return `rgb(${lr}, ${lg}, ${lb})`;
}

export function darkenHex(hex: string, amount: number): string {
  const m = /^#?([a-fA-F0-9]{6})$/.exec(hex.trim());
  if (!m) return hex;
  const v = parseInt(m[1], 16);
  const r = (v >> 16) & 0xff;
  const g = (v >> 8) & 0xff;
  const b = v & 0xff;
  const lr = Math.max(0, Math.round(r * (1 - amount)));
  const lg = Math.max(0, Math.round(g * (1 - amount)));
  const lb = Math.max(0, Math.round(b * (1 - amount)));
  return `rgb(${lr}, ${lg}, ${lb})`;
}

function roundedRect(
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

// ────────────────────────────────────────────────────────────────────────────
// Tatami-Hintergrund (cached via OffscreenCanvas-ähnlichem Pattern)
// ────────────────────────────────────────────────────────────────────────────

export function createTatamiCache(
  width: number,
  height: number,
  cellSize: number,
  wrapAround: boolean,
): HTMLCanvasElement {
  const cv = document.createElement('canvas');
  cv.width = Math.max(1, Math.floor(width));
  cv.height = Math.max(1, Math.floor(height));
  const ctx = cv.getContext('2d');
  if (!ctx) return cv;

  // 1. Basis-Hintergrund
  ctx.fillStyle = '#0e0e0e';
  ctx.fillRect(0, 0, width, height);

  // 2. Enso-Kreis (durch die Matte schimmernd)
  ctx.save();
  const cx = width / 2;
  const cy = height / 2;
  const radius = Math.min(width, height) * 0.36;
  ctx.strokeStyle = 'rgba(220, 13, 29, 0.025)';
  ctx.lineWidth = Math.max(2, width / 60);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(cx, cy, radius, Math.PI * 0.15, Math.PI * 1.85, false);
  ctx.stroke();
  ctx.restore();

  // 3. Tatami-Matten Pattern (4 cells × 2 cells, versetzt je Reihe)
  const matW = cellSize * 4;
  const matH = cellSize * 2;
  const rows = Math.ceil(height / matH) + 1;
  const cols = Math.ceil(width / matW) + 1;

  for (let row = 0; row < rows; row++) {
    const offsetX = row % 2 === 1 ? matW / 2 : 0;
    for (let col = -1; col < cols; col++) {
      const mx = col * matW + offsetX;
      const my = row * matH;
      // Abwechselnd helle/dunkle Tatami-Tönung
      const brightness = (row + col) % 2 === 0 ? 0.020 : 0.028;
      ctx.fillStyle = `rgba(212, 201, 181, ${brightness})`;
      ctx.fillRect(mx + 1, my + 1, matW - 2, matH - 2);

      // Strohlinien innerhalb der Matte (vertikal)
      ctx.strokeStyle = `rgba(212, 201, 181, ${brightness * 0.55})`;
      ctx.lineWidth = 0.4;
      const lineSpacing = cellSize * 0.28;
      for (let lx = mx + lineSpacing; lx < mx + matW - lineSpacing * 0.3; lx += lineSpacing) {
        ctx.beginPath();
        ctx.moveTo(lx, my + 2);
        ctx.lineTo(lx, my + matH - 2);
        ctx.stroke();
      }
    }
  }

  // 4. Matten-Nähte (Querstreifen + versetzte Längsstreifen)
  ctx.strokeStyle = 'rgba(212, 201, 181, 0.05)';
  ctx.lineWidth = 1;
  for (let row = 0; row <= rows; row++) {
    const y = row * matH;
    if (y < 0 || y > height) continue;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }
  for (let row = 0; row < rows; row++) {
    const offsetX = row % 2 === 1 ? matW / 2 : 0;
    for (let col = -1; col <= cols; col++) {
      const x = col * matW + offsetX;
      if (x < -10 || x > width + 10) continue;
      ctx.beginPath();
      ctx.moveTo(x, row * matH);
      ctx.lineTo(x, (row + 1) * matH);
      ctx.stroke();
    }
  }

  // 5. Matten-Einfassung (nur ohne Wrap-Around)
  if (!wrapAround) {
    ctx.strokeStyle = 'rgba(107, 58, 42, 0.20)';
    ctx.lineWidth = 2;
    roundedRect(ctx, 1, 1, width - 2, height - 2, 6);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(107, 58, 42, 0.10)';
    ctx.lineWidth = 1;
    roundedRect(ctx, 4, 4, width - 8, height - 8, 4);
    ctx.stroke();
  } else {
    // Wrap: Ränder sanft ausfaden + dezente Pfeile
    const fadeGrad = ctx.createRadialGradient(
      width / 2, height / 2, Math.min(width, height) * 0.35,
      width / 2, height / 2, Math.min(width, height) * 0.55,
    );
    fadeGrad.addColorStop(0, 'rgba(0,0,0,0)');
    fadeGrad.addColorStop(1, 'rgba(0,0,0,0.35)');
    ctx.fillStyle = fadeGrad;
    ctx.fillRect(0, 0, width, height);

    // Dezente Pfeile in den Mitten
    ctx.fillStyle = 'rgba(212, 201, 181, 0.08)';
    const arrowSize = cellSize * 0.4;
    drawSmallTriangle(ctx, width - 8, height / 2, arrowSize, 0);
    drawSmallTriangle(ctx, 8, height / 2, arrowSize, Math.PI);
    drawSmallTriangle(ctx, width / 2, 8, arrowSize, -Math.PI / 2);
    drawSmallTriangle(ctx, width / 2, height - 8, arrowSize, Math.PI / 2);
  }

  return cv;
}

function drawSmallTriangle(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  rotation: number,
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  ctx.beginPath();
  ctx.moveTo(size / 2, 0);
  ctx.lineTo(-size / 2, -size / 2);
  ctx.lineTo(-size / 2, size / 2);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

// ────────────────────────────────────────────────────────────────────────────
// Obi-Schlange — Segmente
// ────────────────────────────────────────────────────────────────────────────

interface SegmentOpts {
  belt: SnakeBelt;
  orientation: 'horizontal' | 'vertical';
  alpha?: number;
}

function drawWeaveTexture(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  belt: SnakeBelt,
  orientation: 'horizontal' | 'vertical',
) {
  if (size < 6) return;
  const lines = 7;
  const opacity = belt.isBlack ? 0.05 : 0.09;
  ctx.save();
  ctx.strokeStyle = darkenHex(belt.hex, 0.32);
  ctx.globalAlpha = opacity;
  ctx.lineWidth = 0.5;
  const spacing = size / lines;
  if (orientation === 'horizontal') {
    for (let i = 1; i < lines; i++) {
      ctx.beginPath();
      ctx.moveTo(x, y + i * spacing);
      ctx.lineTo(x + size, y + i * spacing);
      ctx.stroke();
    }
  } else {
    for (let i = 1; i < lines; i++) {
      ctx.beginPath();
      ctx.moveTo(x + i * spacing, y);
      ctx.lineTo(x + i * spacing, y + size);
      ctx.stroke();
    }
  }
  ctx.restore();
}

function drawStitching(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  belt: SnakeBelt,
  orientation: 'horizontal' | 'vertical',
) {
  if (size < 8) return;
  const margin = size * 0.13;
  ctx.save();
  ctx.strokeStyle = lightenHex(belt.hex, 0.28);
  ctx.globalAlpha = 0.22;
  ctx.lineWidth = 0.55;
  ctx.setLineDash([2, 2]);
  if (orientation === 'horizontal') {
    ctx.beginPath();
    ctx.moveTo(x, y + margin);
    ctx.lineTo(x + size, y + margin);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y + size - margin);
    ctx.lineTo(x + size, y + size - margin);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.moveTo(x + margin, y);
    ctx.lineTo(x + margin, y + size);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + size - margin, y);
    ctx.lineTo(x + size - margin, y + size);
    ctx.stroke();
  }
  // Schwarz-Gurt: zusätzliche goldene Naht
  if (belt.isBlack) {
    ctx.strokeStyle = '#d4a017';
    ctx.globalAlpha = 0.32;
    ctx.lineWidth = 0.7;
    ctx.setLineDash([3, 2]);
    const innerMargin = margin * 0.55;
    if (orientation === 'horizontal') {
      ctx.beginPath();
      ctx.moveTo(x, y + innerMargin);
      ctx.lineTo(x + size, y + innerMargin);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x, y + size - innerMargin);
      ctx.lineTo(x + size, y + size - innerMargin);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.moveTo(x + innerMargin, y);
      ctx.lineTo(x + innerMargin, y + size);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x + size - innerMargin, y);
      ctx.lineTo(x + size - innerMargin, y + size);
      ctx.stroke();
    }
  }
  ctx.setLineDash([]);
  ctx.restore();
}

export function drawObiBody(
  ctx: CanvasRenderingContext2D,
  cellX: number,
  cellY: number,
  cellSize: number,
  opts: SegmentOpts,
) {
  if (cellSize < 4) return;
  const padding = 0.5;
  const x = cellX + padding;
  const y = cellY + padding;
  const size = cellSize - padding * 2;
  if (size < 2) return;

  ctx.save();
  if (opts.alpha !== undefined) ctx.globalAlpha = opts.alpha;

  // Stoff-Gradient (orientation-aware)
  const grad =
    opts.orientation === 'horizontal'
      ? ctx.createLinearGradient(x, y, x, y + size)
      : ctx.createLinearGradient(x, y, x + size, y);
  grad.addColorStop(0, lightenHex(opts.belt.hex, 0.13));
  grad.addColorStop(0.35, opts.belt.hex);
  grad.addColorStop(0.65, opts.belt.hex);
  grad.addColorStop(1, darkenHex(opts.belt.hex, 0.16));

  roundedRect(ctx, x, y, size, size, 2);
  ctx.fillStyle = grad;
  ctx.fill();

  // Schwarz-Gurt: dezenter beiger Stoff-Hauch oben drauf
  if (opts.belt.isBlack) {
    ctx.fillStyle = 'rgba(212, 201, 181, 0.06)';
    ctx.fill();
  }

  drawWeaveTexture(ctx, x, y, size, opts.belt, opts.orientation);
  drawStitching(ctx, x, y, size, opts.belt, opts.orientation);

  // Subtile Outline
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.18)';
  ctx.lineWidth = 0.5;
  ctx.stroke();

  ctx.restore();
}

export function drawObiHead(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  cellSize: number,
  belt: SnakeBelt,
  direction: Direction,
) {
  if (cellSize < 6) return;
  const headSize = cellSize * 1.05;
  const x = centerX - headSize / 2;
  const y = centerY - headSize / 2;

  ctx.save();
  // Glow
  ctx.save();
  ctx.shadowBlur = 10;
  ctx.shadowColor = belt.glow;
  roundedRect(ctx, x + 1, y + 1, headSize - 2, headSize - 2, headSize * 0.28);
  ctx.fillStyle = belt.hex;
  ctx.fill();
  ctx.restore();

  // Knoten-Hauptform mit radialem Gradient
  const grad = ctx.createRadialGradient(
    centerX,
    centerY - headSize * 0.15,
    0,
    centerX,
    centerY,
    headSize * 0.6,
  );
  grad.addColorStop(0, lightenHex(belt.hex, 0.2));
  grad.addColorStop(0.55, belt.hex);
  grad.addColorStop(1, darkenHex(belt.hex, 0.14));
  roundedRect(ctx, x, y, headSize, headSize, headSize * 0.3);
  ctx.fillStyle = grad;
  ctx.fill();

  // Schwarz-Gurt: beiger Akzent
  if (belt.isBlack) {
    ctx.fillStyle = 'rgba(212, 201, 181, 0.08)';
    ctx.fill();
    ctx.strokeStyle = '#d4a017';
    ctx.lineWidth = 0.8;
    ctx.globalAlpha = 0.45;
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  // Knoten-Detail: zwei sich kreuzende Bänder
  ctx.save();
  ctx.globalAlpha = 0.22;
  ctx.strokeStyle = lightenHex(belt.hex, 0.4);
  ctx.lineWidth = headSize * 0.1;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(centerX - headSize * 0.22, centerY - headSize * 0.22);
  ctx.lineTo(centerX + headSize * 0.22, centerY + headSize * 0.22);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(centerX + headSize * 0.22, centerY - headSize * 0.22);
  ctx.lineTo(centerX - headSize * 0.22, centerY + headSize * 0.22);
  ctx.stroke();
  ctx.restore();

  // Richtungs-Indikator (kleiner heller Punkt)
  ctx.save();
  ctx.globalAlpha = 0.55;
  ctx.fillStyle = lightenHex(belt.hex, 0.55);
  const off = headSize * 0.32;
  let dx = centerX;
  let dy = centerY;
  if (direction === 'up') dy = centerY - off;
  else if (direction === 'down') dy = centerY + off;
  else if (direction === 'left') dx = centerX - off;
  else if (direction === 'right') dx = centerX + off;
  ctx.beginPath();
  ctx.arc(dx, dy, headSize * 0.07, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.restore();
}

export function drawObiTail(
  ctx: CanvasRenderingContext2D,
  cellX: number,
  cellY: number,
  cellSize: number,
  belt: SnakeBelt,
  flowDir: Direction,
) {
  if (cellSize < 4) return;
  const cx = cellX + cellSize / 2;
  const cy = cellY + cellSize / 2;
  const tailWidth = cellSize * 0.7;

  ctx.save();
  ctx.globalAlpha = 0.85;

  // Spitze zeigt entgegen der Bewegungsrichtung
  ctx.beginPath();
  if (flowDir === 'right') {
    ctx.moveTo(cellX, cy);
    ctx.lineTo(cellX + cellSize, cy - tailWidth / 2);
    ctx.lineTo(cellX + cellSize, cy + tailWidth / 2);
  } else if (flowDir === 'left') {
    ctx.moveTo(cellX + cellSize, cy);
    ctx.lineTo(cellX, cy - tailWidth / 2);
    ctx.lineTo(cellX, cy + tailWidth / 2);
  } else if (flowDir === 'down') {
    ctx.moveTo(cx, cellY);
    ctx.lineTo(cx - tailWidth / 2, cellY + cellSize);
    ctx.lineTo(cx + tailWidth / 2, cellY + cellSize);
  } else {
    ctx.moveTo(cx, cellY + cellSize);
    ctx.lineTo(cx - tailWidth / 2, cellY);
    ctx.lineTo(cx + tailWidth / 2, cellY);
  }
  ctx.closePath();
  ctx.fillStyle = belt.hex;
  ctx.fill();
  ctx.strokeStyle = darkenHex(belt.hex, 0.2);
  ctx.lineWidth = 0.5;
  ctx.globalAlpha = 0.4;
  ctx.stroke();

  ctx.restore();
}

// ────────────────────────────────────────────────────────────────────────────
// Food: Gürtelknoten (Belt-Knot)
// ────────────────────────────────────────────────────────────────────────────

export function drawBeltKnot(
  ctx: CanvasRenderingContext2D,
  cellX: number,
  cellY: number,
  cellSize: number,
  belt: SnakeBelt,
  pulsePhase: number,
) {
  if (cellSize < 6) return;
  const cx = cellX + cellSize / 2;
  const cy = cellY + cellSize / 2;

  const pulseScale = 1 + Math.sin(pulsePhase) * 0.06;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(pulseScale, pulseScale);
  ctx.translate(-cx, -cy);

  // Schatten
  ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
  ctx.beginPath();
  ctx.ellipse(cx, cy + cellSize * 0.32, cellSize * 0.3, cellSize * 0.07, 0, 0, Math.PI * 2);
  ctx.fill();

  // Glow
  ctx.shadowColor = belt.glow;
  ctx.shadowBlur = 12;

  // Gürtel-Stück (horizontal)
  const bandW = cellSize * 0.7;
  const bandH = cellSize * 0.16;
  const bandX = cx - bandW / 2;
  const bandY = cy - bandH / 2 + cellSize * 0.04;
  roundedRect(ctx, bandX, bandY, bandW, bandH, 2);
  ctx.fillStyle = belt.hex;
  ctx.fill();

  ctx.shadowBlur = 0;

  // Stoff-Verlauf
  const grad = ctx.createLinearGradient(bandX, bandY, bandX, bandY + bandH);
  grad.addColorStop(0, 'rgba(255,255,255,0.18)');
  grad.addColorStop(1, 'rgba(0,0,0,0.18)');
  roundedRect(ctx, bandX, bandY, bandW, bandH, 2);
  ctx.fillStyle = grad;
  ctx.fill();

  // Knoten-Knubbel in Mitte
  ctx.beginPath();
  ctx.arc(cx, cy + cellSize * 0.04, cellSize * 0.13, 0, Math.PI * 2);
  ctx.fillStyle = lightenHex(belt.hex, 0.12);
  ctx.fill();
  ctx.strokeStyle = darkenHex(belt.hex, 0.25);
  ctx.lineWidth = 0.8;
  ctx.stroke();

  // Hängende Bandenden (links + rechts)
  ctx.strokeStyle = belt.hex;
  ctx.lineWidth = cellSize * 0.07;
  ctx.lineCap = 'round';

  ctx.beginPath();
  ctx.moveTo(bandX, bandY + bandH / 2);
  ctx.quadraticCurveTo(
    bandX - cellSize * 0.07,
    bandY + bandH * 0.7 + cellSize * 0.05,
    bandX - cellSize * 0.04,
    bandY + bandH + cellSize * 0.12,
  );
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(bandX + bandW, bandY + bandH / 2);
  ctx.quadraticCurveTo(
    bandX + bandW + cellSize * 0.07,
    bandY + bandH * 0.7 + cellSize * 0.05,
    bandX + bandW + cellSize * 0.04,
    bandY + bandH + cellSize * 0.12,
  );
  ctx.stroke();

  // Schwarz-Gurt: goldener Akzent
  if (belt.isBlack) {
    ctx.strokeStyle = '#d4a017';
    ctx.lineWidth = 0.6;
    ctx.globalAlpha = 0.5;
    roundedRect(ctx, bandX, bandY, bandW, bandH, 2);
    ctx.stroke();
  }

  ctx.restore();
}

// ────────────────────────────────────────────────────────────────────────────
// Makiwara (Premium)
// ────────────────────────────────────────────────────────────────────────────

export function drawMakiwara(
  ctx: CanvasRenderingContext2D,
  cellX: number,
  cellY: number,
  cellSize: number,
  ageRatio: number, // 0..1 für Fade-In
) {
  if (cellSize < 4) return;
  const cx = cellX + cellSize / 2;

  ctx.save();
  ctx.globalAlpha = ageRatio;

  // 1. Schatten
  ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
  ctx.beginPath();
  ctx.ellipse(cx, cellY + cellSize * 0.92, cellSize * 0.32, cellSize * 0.06, 0, 0, Math.PI * 2);
  ctx.fill();

  // 2. Holzpfahl mit horizontalem Gradient
  const woodGrad = ctx.createLinearGradient(cx - cellSize * 0.12, 0, cx + cellSize * 0.12, 0);
  woodGrad.addColorStop(0, '#241308');
  woodGrad.addColorStop(0.3, '#3a2a1a');
  woodGrad.addColorStop(0.7, '#3a2a1a');
  woodGrad.addColorStop(1, '#241308');
  ctx.fillStyle = woodGrad;
  ctx.beginPath();
  ctx.moveTo(cx - cellSize * 0.10, cellY + cellSize * 0.16);
  ctx.lineTo(cx + cellSize * 0.10, cellY + cellSize * 0.16);
  ctx.lineTo(cx + cellSize * 0.13, cellY + cellSize * 0.86);
  ctx.lineTo(cx - cellSize * 0.13, cellY + cellSize * 0.86);
  ctx.closePath();
  ctx.fill();

  // 3. Holzmaserung
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.22)';
  ctx.lineWidth = 0.5;
  for (let ly = cellY + cellSize * 0.22; ly < cellY + cellSize * 0.84; ly += cellSize * 0.09) {
    ctx.beginPath();
    ctx.moveTo(cx - cellSize * 0.1, ly);
    ctx.bezierCurveTo(
      cx - cellSize * 0.04,
      ly + 0.6,
      cx + cellSize * 0.04,
      ly - 0.4,
      cx + cellSize * 0.1,
      ly,
    );
    ctx.stroke();
  }

  // 4. Schlagpolster oben (Dunkelrot, Wicklungsoptik)
  const padX = cx - cellSize * 0.16;
  const padY = cellY + cellSize * 0.06;
  const padW = cellSize * 0.32;
  const padH = cellSize * 0.13;
  const padGrad = ctx.createLinearGradient(padX, padY, padX + padW, padY);
  padGrad.addColorStop(0, '#3c1018');
  padGrad.addColorStop(0.5, '#6d1723');
  padGrad.addColorStop(1, '#3c1018');
  ctx.fillStyle = padGrad;
  roundedRect(ctx, padX, padY, padW, padH, 2);
  ctx.fill();

  // Wicklungs-Linien
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.22)';
  ctx.lineWidth = 0.5;
  for (let wx = padX + 1; wx < padX + padW - 1; wx += cellSize * 0.045) {
    ctx.beginPath();
    ctx.moveTo(wx, padY);
    ctx.lineTo(wx + cellSize * 0.025, padY + padH);
    ctx.stroke();
  }

  ctx.restore();
}

// ────────────────────────────────────────────────────────────────────────────
// Snake-Renderer (komposition)
// ────────────────────────────────────────────────────────────────────────────

export function segmentOrientation(
  snake: Cell[],
  i: number,
  headDir: Direction,
): 'horizontal' | 'vertical' {
  if (i === 0) {
    return headDir === 'left' || headDir === 'right' ? 'horizontal' : 'vertical';
  }
  const prev = snake[i - 1];
  const cur = snake[i];
  // Wrap-tolerant
  const dx = Math.abs(prev.x - cur.x);
  const dy = Math.abs(prev.y - cur.y);
  // Ignore wrap-jumps
  if (dx > GRID_SIZE / 2 || dy > GRID_SIZE / 2) {
    return headDir === 'left' || headDir === 'right' ? 'horizontal' : 'vertical';
  }
  return dx > dy ? 'horizontal' : 'vertical';
}

export function flowDirectionForTail(
  snake: Cell[],
  headDir: Direction,
): Direction {
  const n = snake.length;
  if (n < 2) return headDir;
  const tail = snake[n - 1];
  const before = snake[n - 2];
  const dx = before.x - tail.x;
  const dy = before.y - tail.y;
  if (Math.abs(dx) > GRID_SIZE / 2 || Math.abs(dy) > GRID_SIZE / 2) return headDir;
  if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? 'right' : 'left';
  return dy > 0 ? 'down' : 'up';
}

// ────────────────────────────────────────────────────────────────────────────
// Particles
// ────────────────────────────────────────────────────────────────────────────

export interface SnakeParticle {
  x: number; // logical (cell-units)
  y: number;
  vx: number; // cells per ms
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number; // px (canvas pixel space, will be drawn as-is)
  gravity: number;
}

export function drawSnakeParticles(
  ctx: CanvasRenderingContext2D,
  particles: SnakeParticle[],
  cellSize: number,
) {
  for (const p of particles) {
    const a = Math.max(0, p.life / p.maxLife);
    ctx.save();
    ctx.globalAlpha = a;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x * cellSize, p.y * cellSize, p.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

export function spawnCollectParticles(
  arr: SnakeParticle[],
  cellX: number,
  cellY: number,
  color: string,
) {
  for (let i = 0; i < 7; i++) {
    const angle = (i / 7) * Math.PI * 2 + Math.random() * 0.4;
    const speed = 0.0028 + Math.random() * 0.003;
    arr.push({
      x: cellX + 0.5,
      y: cellY + 0.5,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 420,
      maxLife: 420,
      color,
      size: 2 + Math.random() * 1.2,
      gravity: 0,
    });
  }
}

export function spawnDeathParticles(
  arr: SnakeParticle[],
  snake: Cell[],
) {
  const head = snake[0];
  if (!head) return;
  for (let i = 0; i < 14; i++) {
    const angle = (i / 14) * Math.PI * 2 + Math.random() * 0.5;
    const speed = 0.003 + Math.random() * 0.005;
    arr.push({
      x: head.x + 0.5,
      y: head.y + 0.5,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 600,
      maxLife: 600,
      color: '#dc0d1d',
      size: 2.2 + Math.random() * 1.5,
      gravity: 0.000004,
    });
  }
}

export function spawnBeltUpShower(
  arr: SnakeParticle[],
  color: string,
) {
  for (let i = 0; i < 18; i++) {
    arr.push({
      x: Math.random() * GRID_SIZE,
      y: -Math.random() * 1.5,
      vx: (Math.random() - 0.5) * 0.0008,
      vy: 0.004 + Math.random() * 0.003,
      life: 1100 + Math.random() * 400,
      maxLife: 1500,
      color,
      size: 1.8 + Math.random() * 1.4,
      gravity: 0.000002,
    });
  }
}
