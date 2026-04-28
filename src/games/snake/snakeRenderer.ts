// Canvas-Rendering für Gürtelschlange:
//   • Drache (Ryū) statt klassische Schlange
//   • Helleres Tatami als Spielfeld (Basis-Grau #474e52)
//   • Burning Scroll Power-Up

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
// Tatami-Hintergrund (heller, Basis #474e52)
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

  // 1. Basis-Hintergrund (helleres Grau)
  ctx.fillStyle = '#474e52';
  ctx.fillRect(0, 0, width, height);

  // 2. Enso-Kreis (etwas sichtbarer auf hellerem Grund)
  ctx.save();
  const cx = width / 2;
  const cy = height / 2;
  const radius = Math.min(width, height) * 0.36;
  ctx.strokeStyle = 'rgba(220, 13, 29, 0.05)';
  ctx.lineWidth = Math.max(2, width / 60);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(cx, cy, radius, Math.PI * 0.15, Math.PI * 1.85, false);
  ctx.stroke();
  ctx.restore();

  // 3. Tatami-Matten Pattern (4×2 Zellen je Matte, versetzt je Reihe)
  const matW = cellSize * 4;
  const matH = cellSize * 2;
  const rows = Math.ceil(height / matH) + 1;
  const cols = Math.ceil(width / matW) + 1;

  for (let row = 0; row < rows; row++) {
    const offsetX = row % 2 === 1 ? matW / 2 : 0;
    for (let col = -1; col < cols; col++) {
      const mx = col * matW + offsetX;
      const my = row * matH;
      // Zwei Grautöne (deutlich sichtbar)
      const isLighter = (row + col) % 2 === 0;
      ctx.fillStyle = isLighter ? '#5a6166' : '#525a5f';
      ctx.fillRect(mx + 1, my + 1, matW - 2, matH - 2);

      // Strohlinien (sichtbarer)
      ctx.strokeStyle = 'rgba(212, 201, 181, 0.08)';
      ctx.lineWidth = 0.5;
      const lineSpacing = cellSize * 0.28;
      for (let lx = mx + lineSpacing; lx < mx + matW - lineSpacing * 0.3; lx += lineSpacing) {
        ctx.beginPath();
        ctx.moveTo(lx, my + 2);
        ctx.lineTo(lx, my + matH - 2);
        ctx.stroke();
      }
    }
  }

  // 4. Matten-Nähte (klarer)
  ctx.strokeStyle = 'rgba(212, 201, 181, 0.15)';
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

  // 5. Matten-Einfassung
  if (!wrapAround) {
    ctx.strokeStyle = 'rgba(107, 58, 42, 0.30)';
    ctx.lineWidth = 2;
    roundedRect(ctx, 1, 1, width - 2, height - 2, 6);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(107, 58, 42, 0.15)';
    ctx.lineWidth = 1;
    roundedRect(ctx, 4, 4, width - 8, height - 8, 4);
    ctx.stroke();
  } else {
    // Sanfter Rand-Fade + Pfeile
    const fadeGrad = ctx.createRadialGradient(
      width / 2, height / 2, Math.min(width, height) * 0.35,
      width / 2, height / 2, Math.min(width, height) * 0.55,
    );
    fadeGrad.addColorStop(0, 'rgba(0,0,0,0)');
    fadeGrad.addColorStop(1, 'rgba(0,0,0,0.30)');
    ctx.fillStyle = fadeGrad;
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = 'rgba(212, 201, 181, 0.10)';
    const arrowSize = cellSize * 0.4;
    drawSmallTriangle(ctx, width - 8, height / 2, arrowSize, 0);
    drawSmallTriangle(ctx, 8, height / 2, arrowSize, Math.PI);
    drawSmallTriangle(ctx, width / 2, 8, arrowSize, -Math.PI / 2);
    drawSmallTriangle(ctx, width / 2, height - 8, arrowSize, Math.PI / 2);
  }

  return cv;
}

// ────────────────────────────────────────────────────────────────────────────
// Drache (Ryū)
// ────────────────────────────────────────────────────────────────────────────

export const DRAGON_COLORS = {
  body: '#1a3a2a',       // dunkles Waldgrün
  bodyLight: '#245038',  // Lichtseite
  bodyDark: '#122a1e',   // Schattenseite
  scales: '#2a5040',     // Schuppen
  belly: '#2a4a3a',      // Bauch
  horn: '#d4c9b5',       // Hörner / Schnurrhaare
  eye: '#dc0d1d',        // Augen
};

function drawScales(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
) {
  if (size < 6) return;
  ctx.save();
  ctx.strokeStyle = DRAGON_COLORS.scales;
  ctx.globalAlpha = 0.18;
  ctx.lineWidth = 0.5;
  const scaleSize = size / 4;
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 4; col++) {
      const sx = x + col * scaleSize + (row % 2 === 1 ? scaleSize / 2 : 0);
      const sy = y + row * scaleSize;
      ctx.beginPath();
      ctx.arc(sx + scaleSize / 2, sy + scaleSize / 2, scaleSize * 0.38, 0, Math.PI);
      ctx.stroke();
    }
  }
  ctx.restore();
}

function drawBellyStripe(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  orientation: 'horizontal' | 'vertical',
) {
  ctx.save();
  ctx.fillStyle = DRAGON_COLORS.belly;
  ctx.globalAlpha = 0.22;
  const stripeWidth = size * 0.32;
  if (orientation === 'horizontal') {
    ctx.fillRect(x + 1, y + (size - stripeWidth) / 2, size - 2, stripeWidth);
  } else {
    ctx.fillRect(x + (size - stripeWidth) / 2, y + 1, stripeWidth, size - 2);
  }
  ctx.restore();
}

function drawDragonBelt(
  ctx: CanvasRenderingContext2D,
  cellX: number,
  cellY: number,
  cellSize: number,
  orientation: 'horizontal' | 'vertical',
  belt: SnakeBelt,
) {
  if (cellSize < 6) return;
  const beltWidth = cellSize * 0.34;
  ctx.save();
  // Glow zuerst
  ctx.shadowColor = belt.glow;
  ctx.shadowBlur = 6;
  ctx.fillStyle = belt.hex;

  let bx = 0, by = 0, bw = 0, bh = 0;
  if (orientation === 'horizontal') {
    // Drache bewegt sich horizontal → Gürtel quer = vertikal
    bx = cellX + (cellSize - beltWidth) / 2;
    by = cellY - 1;
    bw = beltWidth;
    bh = cellSize + 2;
  } else {
    bx = cellX - 1;
    by = cellY + (cellSize - beltWidth) / 2;
    bw = cellSize + 2;
    bh = beltWidth;
  }
  ctx.fillRect(bx, by, bw, bh);

  // Stoff-Highlight
  ctx.shadowBlur = 0;
  const grad =
    orientation === 'horizontal'
      ? ctx.createLinearGradient(bx, by, bx + bw, by)
      : ctx.createLinearGradient(bx, by, bx, by + bh);
  grad.addColorStop(0, 'rgba(255,255,255,0.12)');
  grad.addColorStop(0.5, 'rgba(0,0,0,0)');
  grad.addColorStop(1, 'rgba(0,0,0,0.12)');
  ctx.fillStyle = grad;
  ctx.fillRect(bx, by, bw, bh);

  // Nähte (gestrichelt)
  ctx.strokeStyle = lightenHex(belt.hex, 0.3);
  ctx.globalAlpha = 0.4;
  ctx.lineWidth = 0.5;
  ctx.setLineDash([1.5, 1.5]);
  if (orientation === 'horizontal') {
    ctx.beginPath();
    ctx.moveTo(bx + 1, by);
    ctx.lineTo(bx + 1, by + bh);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(bx + bw - 1, by);
    ctx.lineTo(bx + bw - 1, by + bh);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.moveTo(bx, by + 1);
    ctx.lineTo(bx + bw, by + 1);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(bx, by + bh - 1);
    ctx.lineTo(bx + bw, by + bh - 1);
    ctx.stroke();
  }
  // Schwarz-Gurt: Goldakzent
  if (belt.isBlack) {
    ctx.strokeStyle = '#d4a017';
    ctx.lineWidth = 0.8;
    ctx.globalAlpha = 0.55;
    ctx.setLineDash([2, 1.5]);
    if (orientation === 'horizontal') {
      ctx.beginPath();
      ctx.moveTo(bx + bw / 2, by);
      ctx.lineTo(bx + bw / 2, by + bh);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.moveTo(bx, by + bh / 2);
      ctx.lineTo(bx + bw, by + bh / 2);
      ctx.stroke();
    }
  }
  ctx.setLineDash([]);
  ctx.restore();
}

export function shouldDrawBelt(segmentIndex: number, totalSegments: number): boolean {
  return totalSegments >= 6 && segmentIndex >= 2 && segmentIndex <= 4;
}

export interface DragonBodyOpts {
  orientation: 'horizontal' | 'vertical';
  segmentIndex: number;
  totalSegments: number;
  currentBelt: SnakeBelt;
  alpha?: number;
}

export function drawDragonBody(
  ctx: CanvasRenderingContext2D,
  cellX: number,
  cellY: number,
  cellSize: number,
  opts: DragonBodyOpts,
) {
  if (cellSize < 4) return;
  const padding = 0.5;
  const x = cellX + padding;
  const y = cellY + padding;
  const size = cellSize - padding * 2;
  if (size < 2) return;

  ctx.save();
  if (opts.alpha !== undefined) ctx.globalAlpha = opts.alpha;

  // 1. Body-Gradient (Lichtseite oben/links, Schattenseite unten/rechts)
  const grad =
    opts.orientation === 'horizontal'
      ? ctx.createLinearGradient(x, y, x, y + size)
      : ctx.createLinearGradient(x, y, x + size, y);
  grad.addColorStop(0, DRAGON_COLORS.bodyLight);
  grad.addColorStop(0.5, DRAGON_COLORS.body);
  grad.addColorStop(1, DRAGON_COLORS.bodyDark);
  roundedRect(ctx, x, y, size, size, 3);
  ctx.fillStyle = grad;
  ctx.fill();

  // 2. Schuppen
  drawScales(ctx, x, y, size);

  // 3. Bauchstreifen
  drawBellyStripe(ctx, x, y, size, opts.orientation);

  // 4. Outline
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.25)';
  ctx.lineWidth = 0.5;
  ctx.stroke();

  ctx.restore();

  // 5. Gürtel auf Segmenten 2-4 (Index)
  if (shouldDrawBelt(opts.segmentIndex, opts.totalSegments)) {
    drawDragonBelt(ctx, cellX, cellY, cellSize, opts.orientation, opts.currentBelt);
  }
}

export function drawDragonHead(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  cellSize: number,
  direction: Direction,
) {
  if (cellSize < 6) return;
  const headSize = cellSize * 1.2;

  // Rotation pro Richtung
  let angle = 0;
  if (direction === 'right') angle = 0;
  else if (direction === 'down') angle = Math.PI / 2;
  else if (direction === 'left') angle = Math.PI;
  else if (direction === 'up') angle = -Math.PI / 2;

  ctx.save();
  ctx.translate(centerX, centerY);
  ctx.rotate(angle);

  // 1. Kopfform: längliches Oval, leicht nach vorn versetzt
  const grad = ctx.createRadialGradient(
    headSize * 0.05,
    -headSize * 0.1,
    0,
    headSize * 0.05,
    0,
    headSize * 0.5,
  );
  grad.addColorStop(0, DRAGON_COLORS.bodyLight);
  grad.addColorStop(1, DRAGON_COLORS.body);
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.ellipse(headSize * 0.05, 0, headSize * 0.45, headSize * 0.35, 0, 0, Math.PI * 2);
  ctx.fill();

  // 2. Schnauze (vorne)
  ctx.beginPath();
  ctx.moveTo(headSize * 0.35, -headSize * 0.15);
  ctx.quadraticCurveTo(headSize * 0.55, 0, headSize * 0.35, headSize * 0.15);
  ctx.fillStyle = DRAGON_COLORS.bodyLight;
  ctx.fill();

  // 3. Augen
  const eyeY = headSize * 0.16;
  for (const sign of [-1, 1]) {
    ctx.fillStyle = DRAGON_COLORS.eye;
    ctx.beginPath();
    ctx.arc(headSize * 0.12, sign * eyeY, headSize * 0.055, 0, Math.PI * 2);
    ctx.fill();
    ctx.save();
    ctx.shadowColor = DRAGON_COLORS.eye;
    ctx.shadowBlur = 6;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(headSize * 0.13, sign * eyeY - 0.5, headSize * 0.025, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // 4. Hörner
  ctx.strokeStyle = DRAGON_COLORS.horn;
  ctx.lineWidth = 1.4;
  ctx.lineCap = 'round';
  for (const sign of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(-headSize * 0.1, sign * headSize * 0.28);
    ctx.quadraticCurveTo(
      -headSize * 0.2,
      sign * headSize * 0.45,
      -headSize * 0.35,
      sign * headSize * 0.38,
    );
    ctx.stroke();
  }

  // 5. Schnurrhaare
  ctx.lineWidth = 0.7;
  ctx.globalAlpha = 0.65;
  for (const sign of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(headSize * 0.3, sign * headSize * 0.1);
    ctx.quadraticCurveTo(
      headSize * 0.5,
      sign * headSize * 0.25,
      headSize * 0.5,
      sign * headSize * 0.4,
    );
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  ctx.restore();
}

export function drawDragonTail(
  ctx: CanvasRenderingContext2D,
  cellX: number,
  cellY: number,
  cellSize: number,
  flowDir: Direction,
) {
  if (cellSize < 4) return;
  const cx = cellX + cellSize / 2;
  const cy = cellY + cellSize / 2;

  ctx.save();
  ctx.fillStyle = DRAGON_COLORS.body;
  ctx.globalAlpha = 0.85;

  ctx.beginPath();
  if (flowDir === 'right') {
    ctx.moveTo(cellX, cy - cellSize * 0.3);
    ctx.quadraticCurveTo(cellX + cellSize * 0.3, cy, cellX, cy + cellSize * 0.3);
    // Zacke
    ctx.lineTo(cellX - cellSize * 0.18, cy + cellSize * 0.15);
    ctx.lineTo(cellX - cellSize * 0.1, cy);
    ctx.lineTo(cellX - cellSize * 0.18, cy - cellSize * 0.15);
  } else if (flowDir === 'left') {
    ctx.moveTo(cellX + cellSize, cy - cellSize * 0.3);
    ctx.quadraticCurveTo(
      cellX + cellSize * 0.7,
      cy,
      cellX + cellSize,
      cy + cellSize * 0.3,
    );
    ctx.lineTo(cellX + cellSize + cellSize * 0.18, cy + cellSize * 0.15);
    ctx.lineTo(cellX + cellSize + cellSize * 0.1, cy);
    ctx.lineTo(cellX + cellSize + cellSize * 0.18, cy - cellSize * 0.15);
  } else if (flowDir === 'down') {
    ctx.moveTo(cx - cellSize * 0.3, cellY);
    ctx.quadraticCurveTo(cx, cellY + cellSize * 0.3, cx + cellSize * 0.3, cellY);
    ctx.lineTo(cx + cellSize * 0.15, cellY - cellSize * 0.18);
    ctx.lineTo(cx, cellY - cellSize * 0.1);
    ctx.lineTo(cx - cellSize * 0.15, cellY - cellSize * 0.18);
  } else {
    ctx.moveTo(cx - cellSize * 0.3, cellY + cellSize);
    ctx.quadraticCurveTo(
      cx,
      cellY + cellSize * 0.7,
      cx + cellSize * 0.3,
      cellY + cellSize,
    );
    ctx.lineTo(cx + cellSize * 0.15, cellY + cellSize + cellSize * 0.18);
    ctx.lineTo(cx, cellY + cellSize + cellSize * 0.1);
    ctx.lineTo(cx - cellSize * 0.15, cellY + cellSize + cellSize * 0.18);
  }
  ctx.closePath();
  ctx.fill();

  drawScales(ctx, cellX, cellY, cellSize);

  ctx.restore();
}

// ────────────────────────────────────────────────────────────────────────────
// Food: Belt-Knot
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

  ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
  ctx.beginPath();
  ctx.ellipse(cx, cy + cellSize * 0.32, cellSize * 0.3, cellSize * 0.07, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.shadowColor = belt.glow;
  ctx.shadowBlur = 12;

  const bandW = cellSize * 0.7;
  const bandH = cellSize * 0.16;
  const bandX = cx - bandW / 2;
  const bandY = cy - bandH / 2 + cellSize * 0.04;
  roundedRect(ctx, bandX, bandY, bandW, bandH, 2);
  ctx.fillStyle = belt.hex;
  ctx.fill();

  ctx.shadowBlur = 0;

  const grad = ctx.createLinearGradient(bandX, bandY, bandX, bandY + bandH);
  grad.addColorStop(0, 'rgba(255,255,255,0.18)');
  grad.addColorStop(1, 'rgba(0,0,0,0.18)');
  roundedRect(ctx, bandX, bandY, bandW, bandH, 2);
  ctx.fillStyle = grad;
  ctx.fill();

  ctx.beginPath();
  ctx.arc(cx, cy + cellSize * 0.04, cellSize * 0.13, 0, Math.PI * 2);
  ctx.fillStyle = lightenHex(belt.hex, 0.12);
  ctx.fill();
  ctx.strokeStyle = darkenHex(belt.hex, 0.25);
  ctx.lineWidth = 0.8;
  ctx.stroke();

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
// Makiwara
// ────────────────────────────────────────────────────────────────────────────

export function drawMakiwara(
  ctx: CanvasRenderingContext2D,
  cellX: number,
  cellY: number,
  cellSize: number,
  ageRatio: number,
) {
  if (cellSize < 4) return;
  const cx = cellX + cellSize / 2;
  ctx.save();
  ctx.globalAlpha = ageRatio;

  ctx.fillStyle = 'rgba(0, 0, 0, 0.30)';
  ctx.beginPath();
  ctx.ellipse(cx, cellY + cellSize * 0.92, cellSize * 0.32, cellSize * 0.06, 0, 0, Math.PI * 2);
  ctx.fill();

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

  ctx.strokeStyle = 'rgba(0, 0, 0, 0.22)';
  ctx.lineWidth = 0.5;
  for (let ly = cellY + cellSize * 0.22; ly < cellY + cellSize * 0.84; ly += cellSize * 0.09) {
    ctx.beginPath();
    ctx.moveTo(cx - cellSize * 0.1, ly);
    ctx.bezierCurveTo(
      cx - cellSize * 0.04, ly + 0.6,
      cx + cellSize * 0.04, ly - 0.4,
      cx + cellSize * 0.1, ly,
    );
    ctx.stroke();
  }

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
// Burning Scroll Power-Up
// ────────────────────────────────────────────────────────────────────────────

function drawFlames(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  position: 'top' | 'bottom',
  urgency: number,
  now: number,
) {
  const flameH = size * (0.13 + urgency * 0.08);
  const dir = position === 'top' ? -1 : 1;
  const t = now / 200;
  const offsets = [-size * 0.08, 0, size * 0.08];
  const phases = [0, 1.5, 3];
  for (let i = 0; i < offsets.length; i++) {
    const flicker = Math.sin(t + phases[i]) * 0.3;
    const fh = flameH * (0.7 + flicker);
    ctx.beginPath();
    ctx.moveTo(x + offsets[i] - size * 0.04, y);
    ctx.quadraticCurveTo(
      x + offsets[i] + Math.sin(t + phases[i]) * 2,
      y + fh * dir * 0.5,
      x + offsets[i],
      y + fh * dir,
    );
    ctx.quadraticCurveTo(
      x + offsets[i] - Math.sin(t + phases[i] + 1) * 2,
      y + fh * dir * 0.5,
      x + offsets[i] + size * 0.04,
      y,
    );
    const flameGrad = ctx.createLinearGradient(x, y, x, y + fh * dir);
    flameGrad.addColorStop(0, 'rgba(220, 160, 30, 0.75)');
    flameGrad.addColorStop(0.4, 'rgba(220, 80, 13, 0.55)');
    flameGrad.addColorStop(1, 'rgba(220, 13, 29, 0)');
    ctx.fillStyle = flameGrad;
    ctx.fill();
  }
}

function drawEmbers(
  ctx: CanvasRenderingContext2D,
  x: number,
  topY: number,
  size: number,
  now: number,
) {
  const time = now / 1000;
  for (let i = 0; i < 5; i++) {
    const seed = i * 137.508;
    const phase = (time * 0.8 + seed) % 3;
    if (phase < 2) {
      const progress = phase / 2;
      const ex = x + Math.sin(seed + time * 2) * size * 0.15;
      const ey = topY - progress * size * 0.5;
      const alpha = (1 - progress) * 0.6;
      const emberSize = (1 - progress) * 1.4 + 0.5;
      ctx.fillStyle = `rgba(220, ${Math.floor(120 + progress * 100)}, 30, ${alpha})`;
      ctx.beginPath();
      ctx.arc(ex, ey, emberSize, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

export function drawBurningScroll(
  ctx: CanvasRenderingContext2D,
  cellX: number,
  cellY: number,
  cellSize: number,
  timeAlive: number,
  maxTime: number,
  now: number,
) {
  if (cellSize < 4) return;
  const cx = cellX + cellSize / 2;
  const cy = cellY + cellSize / 2;
  const timeLeft = Math.max(0, maxTime - timeAlive);
  const urgency = Math.max(0, Math.min(1, 1 - timeLeft / maxTime));

  ctx.save();

  // Schatten
  ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
  ctx.beginPath();
  ctx.ellipse(cx, cy + cellSize * 0.36, cellSize * 0.25, cellSize * 0.05, 0, 0, Math.PI * 2);
  ctx.fill();

  // Pergament
  const scrollW = cellSize * 0.4;
  const scrollH = cellSize * 0.6;
  const sx = cx - scrollW / 2;
  const sy = cy - scrollH / 2;
  const pergamentBase = lerpColor('#d4c9a5', '#8a6030', urgency * 0.5);
  const pgGrad = ctx.createLinearGradient(sx, sy, sx + scrollW, sy);
  pgGrad.addColorStop(0, darkenHex(pergamentBase, 0.12));
  pgGrad.addColorStop(0.3, pergamentBase);
  pgGrad.addColorStop(0.7, pergamentBase);
  pgGrad.addColorStop(1, darkenHex(pergamentBase, 0.18));
  roundedRect(ctx, sx, sy, scrollW, scrollH, 2);
  ctx.fillStyle = pgGrad;
  ctx.fill();

  // Pergament-Linien
  ctx.strokeStyle = darkenHex(pergamentBase, 0.2);
  ctx.globalAlpha = 0.18;
  ctx.lineWidth = 0.3;
  for (let ly = sy + 3; ly < sy + scrollH - 3; ly += 2.5) {
    ctx.beginPath();
    ctx.moveTo(sx + 2, ly);
    ctx.lineTo(sx + scrollW - 2, ly);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  // Rollen-Kappen (oben + unten)
  const capH = cellSize * 0.07;
  ctx.fillStyle = '#6b3a2a';
  roundedRect(ctx, sx - 2, sy - capH, scrollW + 4, capH + 2, 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.10)';
  ctx.fillRect(sx - 1, sy - capH, scrollW + 2, capH * 0.4);
  ctx.fillStyle = '#6b3a2a';
  roundedRect(ctx, sx - 2, sy + scrollH - 2, scrollW + 4, capH + 2, 2);
  ctx.fill();

  // Kanji 断
  ctx.font = `${Math.round(cellSize * 0.28)}px "Noto Serif JP", "Hiragino Mincho ProN", serif`;
  ctx.fillStyle = '#6d1723';
  ctx.globalAlpha = 0.55 + urgency * 0.3;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('断', cx, cy + 1);
  ctx.globalAlpha = 1;

  // Flammen
  drawFlames(ctx, cx, sy - capH, cellSize, 'top', urgency, now);
  drawFlames(ctx, cx, sy + scrollH + capH, cellSize, 'bottom', urgency, now);

  // Glut-Funken
  drawEmbers(ctx, cx, sy, cellSize, now);

  // Glow um die ganze Schriftrolle
  ctx.save();
  ctx.shadowColor = `rgba(220, ${Math.floor(120 - urgency * 80)}, 30, 0.45)`;
  ctx.shadowBlur = 10 + urgency * 8;
  ctx.globalAlpha = 0.1;
  roundedRect(ctx, sx, sy, scrollW, scrollH, 2);
  ctx.fillStyle = '#dc0d1d';
  ctx.fill();
  ctx.restore();

  // Dringlichkeit (letzte 2s): pulsierender Ring
  if (timeLeft < 2000) {
    const pulse = 0.12 + Math.sin(now / 130) * 0.08;
    ctx.strokeStyle = `rgba(220, 13, 29, ${pulse})`;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(cx, cy, cellSize * 0.45, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.restore();
}

function lerpColor(c1: string, c2: string, t: number): string {
  const m1 = /^#?([a-fA-F0-9]{6})$/.exec(c1.trim());
  const m2 = /^#?([a-fA-F0-9]{6})$/.exec(c2.trim());
  if (!m1 || !m2) return c1;
  const v1 = parseInt(m1[1], 16);
  const v2 = parseInt(m2[1], 16);
  const r = Math.round(((v1 >> 16) & 0xff) * (1 - t) + ((v2 >> 16) & 0xff) * t);
  const g = Math.round(((v1 >> 8) & 0xff) * (1 - t) + ((v2 >> 8) & 0xff) * t);
  const b = Math.round((v1 & 0xff) * (1 - t) + (v2 & 0xff) * t);
  return `rgb(${r}, ${g}, ${b})`;
}

// ────────────────────────────────────────────────────────────────────────────
// Kompositions-Helpers
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
  const dx = Math.abs(prev.x - cur.x);
  const dy = Math.abs(prev.y - cur.y);
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
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
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

export function spawnScrollEatParticles(
  arr: SnakeParticle[],
  cellX: number,
  cellY: number,
) {
  for (let i = 0; i < 12; i++) {
    const angle = (i / 12) * Math.PI * 2 + Math.random() * 0.4;
    const speed = 0.003 + Math.random() * 0.004;
    const colors = ['#d4a017', '#dc8030', '#dc0d1d'];
    arr.push({
      x: cellX + 0.5,
      y: cellY + 0.5,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 600,
      maxLife: 600,
      color: colors[i % colors.length],
      size: 2 + Math.random() * 1.5,
      gravity: -0.000002, // leichter Auftrieb (Glut)
    });
  }
}

export function spawnTailCutParticles(
  arr: SnakeParticle[],
  cells: Cell[],
) {
  for (const c of cells) {
    for (let i = 0; i < 3; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.0015 + Math.random() * 0.0025;
      arr.push({
        x: c.x + 0.5,
        y: c.y + 0.5,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 500,
        maxLife: 500,
        color: DRAGON_COLORS.scales,
        size: 1.5 + Math.random() * 1.2,
        gravity: 0.000003,
      });
    }
  }
}
