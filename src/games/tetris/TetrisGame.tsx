import { useCallback, useEffect, useRef, useState } from 'react';
import {
  COLS,
  PIECE_COLORS,
  PIECE_SHAPES,
  ROWS,
  useTetrisGame,
  type PieceType,
} from './useTetrisGame';
import GameOverModal from '../../components/GameOverModal';
import { beltColors } from '../../styles/theme';
import { isSupabaseConfigured, supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';

function TouchKey({
  children,
  onClick,
  label,
  variant = 'primary',
  className = '',
}: {
  children: React.ReactNode;
  onClick: () => void;
  label: string;
  variant?: 'primary' | 'muted' | 'accent';
  className?: string;
}) {
  const base =
    'flex items-center justify-center h-14 rounded-xl text-lg font-bold transition-all duration-rp active:scale-95 select-none';
  const skin = {
    primary: 'bg-[rgba(220,13,29,0.6)] text-white active:bg-rp-rot',
    muted:
      'bg-[rgba(212,201,181,0.08)] text-rp-text-secondary active:bg-[rgba(212,201,181,0.15)] active:text-white',
    accent:
      'bg-[rgba(220,13,29,0.85)] text-white active:bg-rp-rot uppercase text-sm tracking-rp-wide font-semibold',
  }[variant];
  return (
    <button
      onClick={onClick}
      onContextMenu={(e) => e.preventDefault()}
      className={`${base} ${skin} ${className}`}
      aria-label={label}
    >
      {children}
    </button>
  );
}

function trimShape(shape: number[][]): number[][] {
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
  if (bot < 0) return shape;
  const out: number[][] = [];
  for (let r = top; r <= bot; r++) {
    out.push(shape[r].slice(left, right + 1));
  }
  return out;
}

function NextPieceCanvas({ type }: { type: PieceType }) {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const cssSize = canvas.clientWidth;
    if (cssSize === 0) return;
    const px = Math.floor(cssSize * dpr);
    if (canvas.width !== px) {
      canvas.width = px;
      canvas.height = px;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cssSize, cssSize);

    const shape = trimShape(PIECE_SHAPES[type]);
    const cols = shape[0].length;
    const rows = shape.length;
    const cell = Math.floor(Math.min(cssSize / cols, cssSize / rows) * 0.8);
    const offX = (cssSize - cols * cell) / 2;
    const offY = (cssSize - rows * cell) / 2;
    const color = PIECE_COLORS[type];

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (!shape[r][c]) continue;
        ctx.fillStyle = color;
        ctx.fillRect(offX + c * cell + 1, offY + r * cell + 1, cell - 2, cell - 2);
        ctx.strokeStyle = 'rgba(0,0,0,0.4)';
        ctx.lineWidth = 1;
        ctx.strokeRect(offX + c * cell + 1, offY + r * cell + 1, cell - 2, cell - 2);
      }
    }
  }, [type]);

  return (
    <canvas
      ref={ref}
      className="w-full"
      style={{ aspectRatio: '1 / 1' }}
      aria-label={`Nächste Technik: ${type}`}
    />
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string | number;
  accent?: boolean;
}) {
  return (
    <span className="flex items-baseline gap-2 whitespace-nowrap">
      <span className="text-rp-text-muted uppercase tracking-rp-tight text-[11px] font-medium">
        {label}
      </span>
      <span
        className={
          accent
            ? 'rp-mono text-rp-rot text-2xl font-bold'
            : 'rp-mono text-white font-semibold'
        }
      >
        {value}
      </span>
    </span>
  );
}

export default function TetrisGame() {
  const boardRef = useRef<HTMLCanvasElement | null>(null);
  const {
    state,
    start,
    reset,
    pause,
    resume,
    left,
    right,
    softDrop,
    rotate,
    hardDrop,
  } = useTetrisGame();
  const { user } = useAuth();
  const [saved, setSaved] = useState(false);

  // Render board
  const draw = useCallback(() => {
    const canvas = boardRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const cssWidth = canvas.clientWidth;
    const cssHeight = canvas.clientHeight;
    if (cssWidth === 0) return;

    const wPx = Math.floor(cssWidth * dpr);
    const hPx = Math.floor(cssHeight * dpr);
    if (canvas.width !== wPx || canvas.height !== hPx) {
      canvas.width = wPx;
      canvas.height = hPx;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const cellW = cssWidth / COLS;
    const cellH = cssHeight / ROWS;

    // BG
    ctx.fillStyle = '#0f0f0f';
    ctx.fillRect(0, 0, cssWidth, cssHeight);

    // Grid
    ctx.strokeStyle = 'rgba(212, 201, 181, 0.05)';
    ctx.lineWidth = 1;
    for (let c = 1; c < COLS; c++) {
      ctx.beginPath();
      ctx.moveTo(c * cellW, 0);
      ctx.lineTo(c * cellW, cssHeight);
      ctx.stroke();
    }
    for (let r = 1; r < ROWS; r++) {
      ctx.beginPath();
      ctx.moveTo(0, r * cellH);
      ctx.lineTo(cssWidth, r * cellH);
      ctx.stroke();
    }

    // Locked cells
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const v = state.board[r][c];
        if (v) {
          ctx.fillStyle = v as string;
          ctx.fillRect(c * cellW + 1, r * cellH + 1, cellW - 2, cellH - 2);
          ctx.strokeStyle = 'rgba(0,0,0,0.45)';
          ctx.lineWidth = 1;
          ctx.strokeRect(c * cellW + 1, r * cellH + 1, cellW - 2, cellH - 2);
        }
      }
    }

    // Active piece
    if (state.piece) {
      const color = PIECE_COLORS[state.piece.type];
      for (let r = 0; r < state.piece.shape.length; r++) {
        for (let c = 0; c < state.piece.shape[r].length; c++) {
          if (!state.piece.shape[r][c]) continue;
          const bx = state.piece.x + c;
          const by = state.piece.y + r;
          if (by < 0) continue;
          ctx.fillStyle = color;
          ctx.fillRect(bx * cellW + 1, by * cellH + 1, cellW - 2, cellH - 2);
          ctx.strokeStyle = 'rgba(0,0,0,0.45)';
          ctx.lineWidth = 1;
          ctx.strokeRect(bx * cellW + 1, by * cellH + 1, cellW - 2, cellH - 2);
        }
      }
    }

    // Flash overlay during line-clear
    if (state.status === 'lineflash') {
      ctx.fillStyle = 'rgba(220, 13, 29, 0.55)';
      state.flashRows.forEach((r) => {
        ctx.fillRect(0, r * cellH, cssWidth, cellH);
      });
    }
  }, [state]);

  // Schedule a draw on every state change AND on rAF while playing (to follow the live piece)
  useEffect(() => {
    draw();
  }, [draw]);

  useEffect(() => {
    if (state.status !== 'playing') return;
    let raf = 0;
    const loop = () => {
      draw();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [state.status, draw]);

  useEffect(() => {
    const onResize = () => draw();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [draw]);

  // Keyboard controls
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat && (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W' || e.key === 'p' || e.key === 'P')) {
        return;
      }
      switch (e.key) {
        case 'ArrowLeft':
        case 'a':
        case 'A':
          e.preventDefault();
          if (state.status === 'idle') start();
          left();
          return;
        case 'ArrowRight':
        case 'd':
        case 'D':
          e.preventDefault();
          if (state.status === 'idle') start();
          right();
          return;
        case 'ArrowDown':
        case 's':
        case 'S':
          e.preventDefault();
          if (state.status === 'idle') start();
          softDrop();
          return;
        case 'ArrowUp':
        case 'w':
        case 'W':
          e.preventDefault();
          if (state.status === 'idle') start();
          rotate();
          return;
        case ' ':
          e.preventDefault();
          if (state.status === 'idle') start();
          else hardDrop();
          return;
        case 'p':
        case 'P':
          if (state.status === 'playing') pause();
          else if (state.status === 'paused') resume();
          return;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [state.status, left, right, softDrop, rotate, hardDrop, start, pause, resume]);

  // Highscore-Save bei Game Over
  useEffect(() => {
    if (state.status === 'gameover' && !saved && isSupabaseConfigured && user && state.score > 0) {
      setSaved(true);
      supabase
        .from('highscores')
        .insert({
          user_id: user.id,
          game: 'tetris',
          score: state.score,
          level: state.level,
          metadata: { lines: state.lines, belt: beltColors[state.beltIndex].name },
        })
        .then(({ error }) => {
          if (error) console.error('[Tetris] Highscore save failed:', error.message);
        });
    }
    if (state.status !== 'gameover' && saved) setSaved(false);
  }, [state.status, state.score, state.level, state.lines, state.beltIndex, user, saved]);

  const beltName = beltColors[state.beltIndex].name;
  const showOss = state.status === 'lineflash';
  const isQuad = showOss && state.lastClearCount === 4;

  return (
    <div className="w-full max-w-[640px] flex flex-col gap-3 items-stretch">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <Stat label="Techniken" value={state.lines} />
        <Stat label="Punkte" value={state.score} accent />
        <Stat label="Rang" value={beltName} />
      </div>

      <div className="flex items-start gap-3 sm:gap-4 justify-center">
        <div
          className="relative shrink-0"
          style={{ width: 'min(60vw, 280px)', aspectRatio: '10 / 20' }}
        >
          <canvas
            ref={boardRef}
            className="absolute inset-0 w-full h-full border border-[rgba(212,201,181,0.25)] rounded-rp-md"
            aria-label="Tetris-Spielfeld"
          />
          {showOss && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none rp-anim-fade">
              <span
                className="rp-display text-white text-center px-4 leading-none"
                style={{
                  fontSize: isQuad ? 'clamp(28px, 8vw, 48px)' : 'clamp(48px, 14vw, 88px)',
                  letterSpacing: '0.08em',
                  textShadow:
                    '0 0 24px rgba(220,13,29,0.9), 0 0 8px rgba(0,0,0,0.8)',
                }}
              >
                {isQuad ? (
                  <>
                    TECHNIK
                    <br />
                    PERFEKT!
                  </>
                ) : (
                  'OSS!'
                )}
              </span>
            </div>
          )}
          {state.status === 'idle' && (
            <button
              onClick={start}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center rounded-rp-md"
              aria-label="Spiel starten"
            >
              <span className="rp-btn">Spielen</span>
            </button>
          )}
          {state.status === 'paused' && (
            <button
              onClick={resume}
              className="absolute inset-0 bg-black/70 backdrop-blur-sm flex flex-col items-center justify-center rounded-rp-md gap-3"
              aria-label="Fortsetzen"
            >
              <span
                className="rp-display text-rp-beige text-2xl"
                style={{ letterSpacing: '0.12em' }}
              >
                Pause
              </span>
              <span className="rp-btn">Fortsetzen</span>
            </button>
          )}
        </div>

        <aside className="flex flex-col gap-3 w-24 sm:w-32 shrink-0">
          <div>
            <p className="text-[10px] sm:text-[11px] uppercase tracking-rp-display text-rp-text-muted font-medium mb-2">
              Nächste Technik
            </p>
            <div className="rp-panel p-2 sm:p-3">
              <NextPieceCanvas type={state.next} />
            </div>
          </div>
          <div>
            <p className="text-[10px] sm:text-[11px] uppercase tracking-rp-display text-rp-text-muted font-medium mb-2">
              Level
            </p>
            <div className="rp-panel p-3 text-center">
              <span className="rp-mono text-2xl font-bold text-white">
                {state.level}
              </span>
            </div>
          </div>
        </aside>
      </div>

      {/* Touch controls */}
      <div className="grid grid-cols-5 gap-2 sm:hidden mt-2">
        <TouchKey label="Links" onClick={left}>◀</TouchKey>
        <TouchKey label="Rotieren" onClick={rotate} variant="muted">↻</TouchKey>
        <TouchKey label="Rechts" onClick={right}>▶</TouchKey>
        <TouchKey label="Soft Drop" onClick={softDrop} variant="muted">▼</TouchKey>
        <TouchKey label="Hard Drop" onClick={hardDrop} variant="accent">DROP</TouchKey>
      </div>

      <p className="hidden sm:block text-xs text-rp-text-muted rp-mono text-center">
        ← → bewegen · ↑ rotieren · ↓ soft drop · Space hard drop · P pausiert
      </p>

      {!isSupabaseConfigured && (
        <p className="text-xs text-rp-text-muted text-center">
          Gast-Modus: Highscores werden nicht gespeichert.
        </p>
      )}
      {isSupabaseConfigured && !user && (
        <p className="text-xs text-rp-text-muted text-center">
          Logge dich ein, um deinen Highscore zu speichern.
        </p>
      )}

      <GameOverModal
        open={state.status === 'gameover'}
        score={state.score}
        level={state.level}
        gameTitle="Kata Blocks"
        onRestart={() => {
          reset();
          start();
        }}
      />
    </div>
  );
}
