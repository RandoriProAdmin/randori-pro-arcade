import { Link } from 'react-router-dom';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  COLS,
  ROWS,
  useTetrisGame,
  type Cell,
  type Piece,
  type PieceType,
} from './useTetrisGame';
import {
  BELT_LEVELS,
  COMBO_TEXT_MS,
  LEVELUP_MS,
  LINE_TEXT_MS,
  PIECE_META,
  PIECE_TYPES,
  ratingForLines,
  lineTextForCount,
  comboMultiplier,
  STACKOUT_MS,
  FLASH_MS,
  SHAKE_MS,
  LEVELUP_GLOW_MS,
  COLS as TETRIS_COLS,
  ROWS as TETRIS_ROWS,
} from './tetrisConstants';
import { drawBoard, drawPiecePreview, type Particle } from './tetrisRenderer';
import { isSupabaseConfigured, supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';

const HIGHSCORE_KEY = 'randori-pro-arcade.tetris.highscore';
const UNLOCK_KEY = 'randori-pro-arcade.tetris.unlocked-level';

// ────────────────────────────────────────────────────────────────────────────
// Ghost-Piece Hilfsfunktion
// ────────────────────────────────────────────────────────────────────────────
function ghostFor(board: Cell[][], piece: Piece): Piece {
  let y = piece.y;
  while (true) {
    let collides = false;
    for (let r = 0; r < piece.shape.length && !collides; r++) {
      for (let c = 0; c < piece.shape[r].length && !collides; c++) {
        if (!piece.shape[r][c]) continue;
        const bx = piece.x + c;
        const by = y + 1 + r;
        if (bx < 0 || bx >= COLS || by >= ROWS) collides = true;
        else if (by >= 0 && board[by][bx] !== 0) collides = true;
      }
    }
    if (collides) break;
    y++;
  }
  return { ...piece, y };
}

// ────────────────────────────────────────────────────────────────────────────
// UI-Helper-Komponenten
// ────────────────────────────────────────────────────────────────────────────

function BeltProgressBar({
  beltIndex,
  lines,
  startBeltIndex,
}: {
  beltIndex: number;
  lines: number;
  startBeltIndex: number;
}) {
  const linesInLevel = lines - (beltIndex - startBeltIndex) * 8;
  const progress = Math.min(1, Math.max(0, linesInLevel / 8));
  return (
    <div className="grid grid-cols-10 gap-1 w-full">
      {BELT_LEVELS.map((b, i) => {
        const filled = i < beltIndex ? 1 : i === beltIndex ? progress : 0;
        const isCurrent = i === beltIndex;
        return (
          <div
            key={b.level}
            className="relative h-1.5 rounded-full overflow-hidden"
            style={{
              background: 'rgba(212, 201, 181, 0.06)',
              opacity: i <= beltIndex ? 1 : 0.35,
            }}
            title={b.name}
          >
            <div
              className="absolute inset-y-0 left-0 rounded-full transition-all duration-500 ease-out"
              style={{
                width: `${filled * 100}%`,
                background: b.hex,
                border: b.isBlack ? '1px solid #d4c9b5' : 'none',
                boxShadow: isCurrent && filled > 0 ? `0 0 8px ${b.glow}` : undefined,
              }}
            />
          </div>
        );
      })}
    </div>
  );
}

function NextPiecePanel({ type }: { type: PieceType }) {
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
    drawPiecePreview(ctx, cssSize, cssSize, type);
  }, [type]);

  const meta = PIECE_META[type];
  return (
    <div className="flex flex-col items-center gap-1.5">
      <p className="text-[11px] uppercase tracking-rp-display text-rp-text-muted font-medium">
        Nächste Technik
      </p>
      <div className="text-3xl text-rp-text-secondary opacity-60 leading-none font-serif">
        {meta.kanji}
      </div>
      <div className="w-full max-w-[100px]">
        <canvas
          ref={ref}
          className="w-full"
          style={{ aspectRatio: '1 / 1' }}
          aria-label={`Nächste Technik: ${meta.technique}`}
        />
      </div>
      <p
        className="text-[11px] uppercase tracking-rp-display text-rp-text-secondary font-semibold mt-0.5"
        style={{ letterSpacing: '0.08em' }}
      >
        {meta.technique}
      </p>
    </div>
  );
}

function TechniqueLegend() {
  return (
    <div className="grid grid-cols-7 gap-2 w-full">
      {PIECE_TYPES.map((t) => {
        const m = PIECE_META[t];
        return (
          <div key={t} className="flex flex-col items-center gap-0.5">
            <span
              className="block w-full h-1 rounded-full"
              style={{ background: m.color, boxShadow: `0 0 6px ${m.glow}` }}
            />
            <span
              className="text-2xl font-serif"
              style={{ color: m.color, opacity: 0.85 }}
            >
              {m.kanji}
            </span>
            <span className="text-[9px] sm:text-[10px] uppercase tracking-rp-tight text-rp-text-muted text-center leading-tight">
              {m.technique}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function TouchButton({
  onClick,
  label,
  children,
  primary = false,
}: {
  onClick: () => void;
  label: string;
  children: React.ReactNode;
  primary?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      onContextMenu={(e) => e.preventDefault()}
      className="flex items-center justify-center text-rp-text-secondary transition-all duration-rp active:scale-95 active:text-white select-none"
      style={{
        height: 48,
        borderRadius: 10,
        background: primary
          ? 'rgba(220, 13, 29, 0.15)'
          : 'rgba(30, 30, 30, 0.8)',
        border: primary
          ? '1px solid rgba(220, 13, 29, 0.4)'
          : '1px solid rgba(212, 201, 181, 0.12)',
      }}
      aria-label={label}
    >
      {children}
    </button>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// TetrisGame
// ────────────────────────────────────────────────────────────────────────────

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
  const [bestScore, setBestScore] = useState(0);
  const [unlockedLevel, setUnlockedLevel] = useState(1);
  const [isNewHigh, setIsNewHigh] = useState(false);

  // Refs für Render-Loop (vermeiden re-init)
  const stateRef = useRef(state);
  stateRef.current = state;
  const stackOutAtRef = useRef<number | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const bgParticlesRef = useRef<Particle[]>([]);
  const lastFrameAtRef = useRef<number>(performance.now());
  const lineFragKeyRef = useRef('');
  const pendingLevelUpRef = useRef<string | null>(null);

  // Effekte (UI-State für CSS-Class-Toggles)
  const shakeBoxRef = useRef<HTMLDivElement | null>(null);
  const [borderGlow, setBorderGlow] = useState<string | null>(null);
  const [scoreFloat, setScoreFloat] = useState<{ delta: number; id: number } | null>(null);
  const [scorePulseKey, setScorePulseKey] = useState(0);
  const lastScoreRef = useRef(state.score);

  // Shake via Web Animations API — kein Remount des Canvas-Containers
  const triggerShake = useCallback(() => {
    const el = shakeBoxRef.current;
    if (!el || !el.animate) return;
    el.animate(
      [
        { transform: 'translateX(0)' },
        { transform: 'translateX(-2px)' },
        { transform: 'translateX(2px)' },
        { transform: 'translateX(-1px)' },
        { transform: 'translateX(1px)' },
        { transform: 'translateX(0)' },
      ],
      { duration: SHAKE_MS, easing: 'ease-out' },
    );
  }, []);

  // Transient Overlays (DOM)
  const [lineText, setLineText] = useState<{
    rows: number;
    id: number;
  } | null>(null);
  const [comboText, setComboText] = useState<{ combo: number; id: number } | null>(
    null,
  );
  const [levelUpBanner, setLevelUpBanner] = useState<{
    level: number;
    id: number;
  } | null>(null);
  const overlayIdRef = useRef(0);

  // Highscore + Unlock laden
  useEffect(() => {
    try {
      const hs = window.localStorage.getItem(HIGHSCORE_KEY);
      if (hs) setBestScore(Math.max(0, parseInt(hs, 10) || 0));
      const ul = window.localStorage.getItem(UNLOCK_KEY);
      if (ul) setUnlockedLevel(Math.min(10, Math.max(1, parseInt(ul, 10) || 1)));
    } catch {
      // ignorieren
    }
  }, []);

  // Linie-Clear: Text-Overlay + Partikel + IPPON-Shake
  const lastClearKeyRef = useRef('');
  useEffect(() => {
    if (state.status !== 'lineflash') return;
    const key = `${state.flashStartedAt}-${state.lastClearCount}`;
    if (key === lastClearKeyRef.current) return;
    lastClearKeyRef.current = key;
    const id = ++overlayIdRef.current;
    setLineText({ rows: state.lastClearCount, id });
    window.setTimeout(() => {
      setLineText((cur) => (cur && cur.id === id ? null : cur));
    }, LINE_TEXT_MS);

    if (state.combo >= 2) {
      const cid = ++overlayIdRef.current;
      setComboText({ combo: state.combo, id: cid });
      window.setTimeout(() => {
        setComboText((cur) => (cur && cur.id === cid ? null : cur));
      }, COMBO_TEXT_MS);
    }

    // IPPON: Shake (via WAAPI, kein Remount) + goldene Partikel
    if (state.lastClearCount === 4) {
      triggerShake();
    }

    // Marker für Render-Loop, dass beim nächsten Frame Fragmente gespawnt werden
    lineFragKeyRef.current = key;
  }, [state.status, state.flashStartedAt, state.lastClearCount, state.combo]);

  // Level-Up Banner + Border-Glow + Funkenregen
  const lastBeltRef = useRef(state.beltIndex);
  useEffect(() => {
    if (state.beltIndex > lastBeltRef.current && state.status !== 'idle') {
      const id = ++overlayIdRef.current;
      setLevelUpBanner({ level: state.level, id });
      window.setTimeout(() => {
        setLevelUpBanner((cur) => (cur && cur.id === id ? null : cur));
      }, LEVELUP_MS);
      // Border-Glow in neuer Belt-Farbe
      const beltGlow = BELT_LEVELS[state.beltIndex]?.glow ?? 'rgba(255,255,255,0.3)';
      setBorderGlow(beltGlow);
      window.setTimeout(() => setBorderGlow(null), LEVELUP_GLOW_MS);
      // Funkenregen von oben — wird im Render-Loop gespawnt (kennt cssWidth)
      const beltHex = BELT_LEVELS[state.beltIndex]?.hex ?? '#ffffff';
      pendingLevelUpRef.current = beltHex;
    }
    lastBeltRef.current = state.beltIndex;
  }, [state.beltIndex, state.level, state.status]);

  // Score-Float und Pulse bei Score-Änderung
  useEffect(() => {
    const delta = state.score - lastScoreRef.current;
    if (delta > 0 && state.status !== 'idle') {
      const id = ++overlayIdRef.current;
      setScoreFloat({ delta, id });
      setScorePulseKey((k) => k + 1);
      window.setTimeout(() => {
        setScoreFloat((cur) => (cur && cur.id === id ? null : cur));
      }, 600);
    }
    lastScoreRef.current = state.score;
  }, [state.score, state.status]);

  // Game Over: Stack-Out Timestamp + Highscore-Save + Unlock-Update
  useEffect(() => {
    if (state.status !== 'gameover') {
      stackOutAtRef.current = null;
      if (saved) setSaved(false);
      if (isNewHigh) setIsNewHigh(false);
      return;
    }
    if (saved) return;
    setSaved(true);
    stackOutAtRef.current = performance.now();

    const newHigh = state.score > bestScore;
    setIsNewHigh(newHigh);
    if (newHigh) {
      setBestScore(state.score);
      try {
        window.localStorage.setItem(HIGHSCORE_KEY, String(state.score));
      } catch {
        // ignorieren
      }
    }

    if (state.level > unlockedLevel) {
      setUnlockedLevel(state.level);
      try {
        window.localStorage.setItem(UNLOCK_KEY, String(state.level));
      } catch {
        // ignorieren
      }
    }

    if (isSupabaseConfigured && user && state.score > 0) {
      supabase
        .from('highscores')
        .insert({
          user_id: user.id,
          game: 'tetris',
          score: state.score,
          level: state.level,
          metadata: {
            lines: state.lines,
            belt: BELT_LEVELS[state.beltIndex].name,
            start_belt: BELT_LEVELS[state.startBeltIndex].name,
            rating: ratingForLines(state.lines).name,
          },
        })
        .then(({ error }) => {
          if (error) console.error('[Tetris] Highscore save failed:', error.message);
        });
    }
  }, [state.status, state.score, state.level, state.lines, state.beltIndex, state.startBeltIndex, user, saved, bestScore, unlockedLevel, isNewHigh]);

  // Render-Loop (rAF — läuft immer, liest stateRef)
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

    const s = stateRef.current;
    const now = performance.now();

    // Flash-Phasen berechnen (60ms Flash + 220ms Kontraktion)
    let flashAmount = 0;
    let contractAmount = 0;
    if (s.status === 'lineflash' && s.flashStartedAt > 0) {
      const elapsed = now - s.flashStartedAt;
      if (elapsed < 80) {
        flashAmount = 1 - elapsed / 80;
      }
      if (elapsed >= 80 && elapsed < FLASH_MS) {
        contractAmount = (elapsed - 80) / (FLASH_MS - 80);
      } else if (elapsed >= FLASH_MS) {
        contractAmount = 1;
      }
    }

    // Stack-Out (Game Over)
    let stackOutAmount = 0;
    if (s.status === 'gameover' && stackOutAtRef.current) {
      stackOutAmount = Math.min(
        1,
        (now - stackOutAtRef.current) / STACKOUT_MS,
      );
    }

    // Pause: Spielfeld ausblenden (kein Schummeln)
    if (s.status === 'paused') {
      ctx.fillStyle = '#0a0a0a';
      ctx.fillRect(0, 0, cssWidth, cssHeight);
      return;
    }

    // Spawn Linien-Fragment-Partikel bei lineflash (einmalig pro Flash)
    if (
      s.status === 'lineflash' &&
      s.flashRows.length > 0 &&
      lineFragKeyRef.current &&
      lineFragKeyRef.current !== '__spawned'
    ) {
      const cellW = cssWidth / TETRIS_COLS;
      const cellH = cssHeight / TETRIS_ROWS;
      spawnLineFragments(
        particlesRef.current,
        s.board,
        s.flashRows,
        cellW,
        cellH,
        s.lastClearCount === 4,
      );
      lineFragKeyRef.current = '__spawned';
    }
    if (s.status !== 'lineflash') {
      lineFragKeyRef.current = '';
    }

    // Level-Up-Funkenregen (kennt jetzt cssWidth)
    if (pendingLevelUpRef.current) {
      spawnLevelUpShower(particlesRef.current, pendingLevelUpRef.current, cssWidth);
      pendingLevelUpRef.current = null;
    }

    // Background Ki-Partikel auffüllen (max 8)
    if (s.status === 'playing' && bgParticlesRef.current.length < 8 && Math.random() < 0.03) {
      bgParticlesRef.current.push({
        x: Math.random() * cssWidth,
        y: cssHeight + 4,
        vx: 0,
        vy: -(0.06 + Math.random() * 0.04), // px/ms aufwärts
        size: 0.8 + Math.random() * 0.6,
        color: 'rgba(220, 13, 29, 0.18)',
        life: 8000 + Math.random() * 4000,
        maxLife: 12000,
        gravity: 0,
      });
    }

    // dt
    const dt = Math.min(50, now - lastFrameAtRef.current);
    lastFrameAtRef.current = now;

    // Update foreground particles (with gravity)
    particlesRef.current = particlesRef.current
      .map((p) => ({
        ...p,
        x: p.x + p.vx * dt,
        y: p.y + p.vy * dt,
        vy: p.vy + p.gravity * dt,
        life: p.life - dt,
      }))
      .filter((p) => p.life > 0);

    // Update background ki particles
    bgParticlesRef.current = bgParticlesRef.current
      .map((p) => ({
        ...p,
        x: p.x + p.vx * dt,
        y: p.y + p.vy * dt,
        life: p.life - dt,
      }))
      .filter((p) => p.life > 0 && p.y > -10);

    // Ghost ab Belt 6 unsichtbar (mehr Skill nötig)
    const showGhost = s.beltIndex < 5 && s.status === 'playing';
    const ghost = s.piece && showGhost ? ghostFor(s.board, s.piece) : null;

    // Background Ki-Partikel zuerst zeichnen (kommen unter Board-Inhalt durch
    // Reihenfolge — deshalb wir zeichnen sie nach Board nicht möglich.
    // Lösung: kombiniere mit Vordergrund-Partikeln im Pass)
    const allParticles: Particle[] = [
      ...bgParticlesRef.current,
      ...particlesRef.current,
    ];

    drawBoard({
      ctx,
      cssWidth,
      cssHeight,
      board: s.board,
      piece: s.piece,
      ghost,
      flashRows: s.flashRows,
      flashAmount,
      contractAmount,
      stackOutAmount,
      showGhost,
      particles: allParticles,
    });
  }, []);

  useEffect(() => {
    let raf = 0;
    let errorCount = 0;
    const loop = () => {
      try {
        draw();
      } catch (err) {
        errorCount++;
        if (errorCount <= 3) console.error('[Tetris] render error:', err);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [draw]);

  useEffect(() => {
    const onResize = () => draw();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [draw]);

  // Tastatur
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (
        e.repeat &&
        (e.key === ' ' ||
          e.key === 'ArrowUp' ||
          e.key === 'w' ||
          e.key === 'W' ||
          e.key === 'p' ||
          e.key === 'P' ||
          e.key === 'Escape')
      ) {
        return;
      }

      if (e.key === ' ' && state.status === 'idle') {
        e.preventDefault();
        start(state.startBeltIndex);
        return;
      }
      if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') {
        e.preventDefault();
        if (state.status === 'playing') pause();
        else if (state.status === 'paused') resume();
        return;
      }

      if (state.status !== 'playing' && state.status !== 'lineflash') return;

      switch (e.key) {
        case 'ArrowLeft':
        case 'a':
        case 'A':
          e.preventDefault();
          left();
          return;
        case 'ArrowRight':
        case 'd':
        case 'D':
          e.preventDefault();
          right();
          return;
        case 'ArrowDown':
        case 's':
        case 'S':
          e.preventDefault();
          softDrop();
          return;
        case 'ArrowUp':
        case 'w':
        case 'W':
          e.preventDefault();
          rotate();
          return;
        case ' ':
          e.preventDefault();
          hardDrop();
          return;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [state.status, state.startBeltIndex, left, right, softDrop, rotate, hardDrop, start, pause, resume]);

  const beltDef = BELT_LEVELS[state.beltIndex];
  const startBelt = BELT_LEVELS[state.startBeltIndex];
  const lineTextCfg = useMemo(
    () => (lineText ? lineTextForCount(lineText.rows) : null),
    [lineText],
  );
  const showStartScreen = state.status === 'idle';
  const showPauseScreen = state.status === 'paused';
  const showGameOver =
    state.status === 'gameover' &&
    stackOutAtRef.current !== null &&
    performance.now() - stackOutAtRef.current >= STACKOUT_MS - 50;

  // gameOver „shown" zustand triggern via re-render. Nutzen rAF + State.
  const [gameOverVisible, setGameOverVisible] = useState(false);
  useEffect(() => {
    if (state.status !== 'gameover') {
      setGameOverVisible(false);
      return;
    }
    const id = window.setTimeout(() => setGameOverVisible(true), STACKOUT_MS);
    return () => window.clearTimeout(id);
  }, [state.status]);

  const gameOverScore = useScoreCounter(
    state.score,
    state.status === 'gameover' && gameOverVisible,
  );
  const rating = useMemo(() => ratingForLines(state.lines), [state.lines]);

  const handleStart = (level: number) => {
    start(Math.max(0, level - 1));
  };

  return (
    <div className="w-full flex flex-col gap-3 sm:gap-4">
      {/* Belt-Progress (full width, horizontal) */}
      <BeltProgressBar
        beltIndex={state.beltIndex}
        lines={state.lines}
        startBeltIndex={state.startBeltIndex}
      />

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_180px] gap-4 items-start">
        {/* Board-Spalte */}
        <div className="flex flex-col items-center gap-3 w-full">
          <div
            ref={shakeBoxRef}
            className="relative shrink-0"
            style={{
              width: 'min(70vw, 320px)',
              aspectRatio: '10 / 20',
            }}
          >
            <canvas
              ref={boardRef}
              className="absolute inset-0 w-full h-full rounded-rp-md"
              style={{
                border: '1px solid rgba(212, 201, 181, 0.12)',
                boxShadow: borderGlow
                  ? `0 0 24px ${borderGlow}, inset 0 0 30px rgba(0,0,0,0.5), inset 0 0 2px rgba(212, 201, 181, 0.05)`
                  : 'inset 0 0 30px rgba(0,0,0,0.5), inset 0 0 2px rgba(212, 201, 181, 0.05)',
                transition: 'box-shadow 250ms ease-out',
              }}
              aria-label="Tetris-Spielfeld"
            />

            {/* Linien-Clear Text */}
            {lineText && lineTextCfg && state.status !== 'idle' && (
              <div
                className="absolute inset-0 flex items-center justify-center pointer-events-none rp-anim-fade"
                key={lineText.id}
              >
                <span
                  className="rp-display text-center px-4 leading-none"
                  style={{
                    color: lineTextCfg.color,
                    fontSize: lineTextCfg.size,
                    letterSpacing: '0.08em',
                    textShadow: lineTextCfg.withGlow
                      ? `0 0 24px ${lineTextCfg.color}, 0 0 8px rgba(0,0,0,0.8)`
                      : '0 0 8px rgba(0,0,0,0.8)',
                    animation: lineTextCfg.withShake
                      ? 'rp-shake 200ms ease-out'
                      : undefined,
                  }}
                >
                  {lineTextCfg.text}
                </span>
              </div>
            )}

            {/* Combo */}
            {comboText && (
              <div
                className="absolute top-3 right-3 pointer-events-none rp-anim-fade"
                key={`c-${comboText.id}`}
              >
                <span
                  className="rp-display"
                  style={{
                    color: '#dc0d1d',
                    fontSize: `${20 + Math.min(comboText.combo, 5) * 2}px`,
                    letterSpacing: '0.08em',
                    textShadow: '0 0 12px rgba(220,13,29,0.7)',
                  }}
                >
                  {comboText.combo}× COMBO
                </span>
              </div>
            )}

            {/* Level-Up */}
            {levelUpBanner && (
              <div
                className="absolute top-1/3 left-0 right-0 pointer-events-none text-center rp-anim-fade"
                key={`l-${levelUpBanner.id}`}
              >
                <p
                  className="rp-display"
                  style={{
                    fontSize: 'clamp(20px, 5.5vw, 28px)',
                    color: BELT_LEVELS[levelUpBanner.level - 1]?.hex ?? '#d4c9b5',
                    letterSpacing: '0.1em',
                    textShadow: `0 0 16px ${BELT_LEVELS[levelUpBanner.level - 1]?.glow ?? 'rgba(255,255,255,0.5)'}`,
                  }}
                >
                  Aufstieg: {BELT_LEVELS[levelUpBanner.level - 1]?.shortName}
                </p>
              </div>
            )}

            {/* Start-Screen */}
            {showStartScreen && (
              <StartScreen
                bestScore={bestScore}
                unlockedLevel={unlockedLevel}
                onStart={handleStart}
              />
            )}

            {/* Pause */}
            {showPauseScreen && (
              <div
                className="absolute inset-0 rounded-rp-md flex items-center justify-center p-4"
                style={{
                  background: 'rgba(0,0,0,0.85)',
                  backdropFilter: 'blur(4px)',
                }}
              >
                <div className="flex flex-col items-center gap-3 text-center max-w-[260px]">
                  <h2
                    className="rp-display text-white"
                    style={{ fontSize: '40px', letterSpacing: '0.12em' }}
                  >
                    Pause
                  </h2>
                  <p className="text-rp-text-secondary text-sm">
                    Eine gute Kata braucht Geduld.
                  </p>
                  <div className="flex flex-col gap-2 w-full mt-2">
                    <button onClick={resume} className="rp-btn w-full">
                      Fortsetzen
                    </button>
                    <button
                      onClick={() => {
                        reset();
                      }}
                      className="rp-btn-secondary w-full"
                    >
                      Aufgeben
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Game Over Overlay (nach Stack-Out) */}
            {showGameOver && gameOverVisible && (
              <div className="absolute inset-0 rounded-rp-md flex items-center justify-center p-4 sm:p-6 rp-anim-fade">
                <div className="flex flex-col items-center text-center gap-3 max-w-[300px]">
                  <h2
                    className="rp-display"
                    style={{ fontSize: '32px', color: '#dc0d1d', letterSpacing: '0.1em' }}
                  >
                    Game Over
                  </h2>
                  <div>
                    <p className="text-[11px] uppercase tracking-rp-display text-rp-text-muted font-medium">
                      Punkte
                    </p>
                    <p
                      className="rp-mono text-white font-bold leading-none mt-1"
                      style={{ fontSize: '44px' }}
                    >
                      {gameOverScore}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className="block w-10 h-1.5 rounded-full"
                      style={{
                        background: beltDef.hex,
                        border: beltDef.isBlack ? '1px solid #d4c9b5' : 'none',
                      }}
                    />
                    <span className="text-xs uppercase tracking-rp-tight text-rp-text-secondary font-semibold">
                      {beltDef.shortName}
                    </span>
                  </div>
                  <p className="text-rp-text-secondary text-sm">
                    <span className="rp-mono text-white font-semibold">
                      {state.lines}
                    </span>{' '}
                    Techniken gemeistert
                  </p>
                  <p
                    className="rp-display text-rp-beige uppercase"
                    style={{ fontSize: '16px', letterSpacing: '0.12em' }}
                  >
                    {rating.name}
                  </p>
                  {isNewHigh && state.score > 0 && (
                    <p
                      className="rp-display rp-pulse-glow text-xl"
                      style={{ color: '#d4a017', letterSpacing: '0.1em' }}
                    >
                      Neuer Rekord!
                    </p>
                  )}
                  <div className="flex flex-col gap-2 w-full mt-1">
                    <button
                      onClick={() => start(state.startBeltIndex)}
                      className="rp-btn w-full"
                    >
                      Nochmal
                    </button>
                    <Link to="/" className="rp-btn-secondary w-full">
                      Zurück
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Side-Panel */}
        <aside className="flex flex-col gap-4 w-full">
          <NextPiecePanel type={state.next} />

          <div className="border-t border-[rgba(212,201,181,0.08)] pt-3 flex flex-col gap-2">
            <div className="relative">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-[11px] uppercase tracking-rp-display text-rp-text-muted font-medium">
                  Punkte
                </span>
                <span
                  key={`pulse-${scorePulseKey}`}
                  className="rp-mono text-rp-rot font-bold text-2xl"
                  style={{
                    animation: scorePulseKey > 0 ? 'rp-score-pulse 200ms ease-out' : undefined,
                  }}
                >
                  {state.score}
                </span>
              </div>
              {scoreFloat && (
                <span
                  key={`float-${scoreFloat.id}`}
                  className="absolute right-0 -top-2 rp-mono text-[14px] font-bold text-rp-rot pointer-events-none"
                  style={{ animation: 'rp-score-float 600ms ease-out forwards' }}
                >
                  +{scoreFloat.delta}
                </span>
              )}
            </div>
            <PanelStat label="Techniken" value={state.lines} />
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-[11px] uppercase tracking-rp-display text-rp-text-muted font-medium">
                Combo
              </span>
              {state.combo > 1 ? (
                <span
                  className="rp-mono text-rp-rot font-bold text-base"
                  style={{
                    textShadow: '0 0 10px rgba(220,13,29,0.6)',
                    animation: 'rp-combo-pulse 800ms ease-in-out infinite',
                  }}
                >
                  ×{comboMultiplier(state.combo)}
                </span>
              ) : (
                <span className="rp-mono text-rp-text-muted text-sm">—</span>
              )}
            </div>
          </div>

          <div className="border-t border-[rgba(212,201,181,0.08)] pt-3">
            <p className="text-[11px] uppercase tracking-rp-display text-rp-text-muted font-medium">
              Rang
            </p>
            <div className="flex items-center gap-2 mt-1.5">
              <span
                className="block w-6 h-1.5 rounded-full"
                style={{
                  background: beltDef.hex,
                  border: beltDef.isBlack ? '1px solid #d4c9b5' : 'none',
                  boxShadow: `0 0 6px ${beltDef.glow}`,
                }}
              />
              <span className="text-white font-semibold text-sm">
                {beltDef.shortName}
              </span>
            </div>
            {state.startBeltIndex > 0 && (
              <p className="text-[10px] text-rp-text-muted mt-1">
                Start: {startBelt.shortName}
              </p>
            )}
          </div>

          <div className="border-t border-[rgba(212,201,181,0.08)] pt-3 hidden lg:block">
            <p className="text-[11px] uppercase tracking-rp-display text-rp-text-muted font-medium mb-2">
              Steuerung
            </p>
            <ul className="text-[12px] text-rp-text-secondary leading-relaxed rp-mono">
              <li>← → bewegen</li>
              <li>↑ rotieren</li>
              <li>↓ schneller</li>
              <li>⎵ fallenlassen</li>
              <li>Esc pause</li>
            </ul>
          </div>
        </aside>
      </div>

      {/* Mobile Touch Buttons */}
      <div className="grid grid-cols-5 gap-2 lg:hidden">
        <TouchButton onClick={left} label="Links">←</TouchButton>
        <TouchButton onClick={rotate} label="Rotieren">↻</TouchButton>
        <TouchButton onClick={right} label="Rechts">→</TouchButton>
        <TouchButton onClick={softDrop} label="Soft Drop">↓</TouchButton>
        <TouchButton onClick={hardDrop} label="Hard Drop" primary>⤓</TouchButton>
      </div>

      {!isSupabaseConfigured && (
        <p className="text-xs text-rp-text-muted text-center">
          Gast-Modus: Highscores werden nicht in der Cloud gespeichert.
        </p>
      )}
      {isSupabaseConfigured && !user && (
        <p className="text-xs text-rp-text-muted text-center">
          Logge dich ein, um deinen Highscore zu speichern.
        </p>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Subkomponenten
// ────────────────────────────────────────────────────────────────────────────

function PanelStat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string | number;
  accent?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className="text-[11px] uppercase tracking-rp-display text-rp-text-muted font-medium">
        {label}
      </span>
      <span
        className={
          accent
            ? 'rp-mono text-rp-rot font-bold text-lg'
            : 'rp-mono text-white font-semibold text-sm'
        }
      >
        {value}
      </span>
    </div>
  );
}

function StartScreen({
  bestScore,
  unlockedLevel,
  onStart,
}: {
  bestScore: number;
  unlockedLevel: number;
  onStart: (level: number) => void;
}) {
  const [selectedLevel, setSelectedLevel] = useState(1);
  const safeUnlocked = Math.min(10, Math.max(1, unlockedLevel));

  return (
    <div
      className="absolute inset-0 rounded-rp-md flex flex-col p-4 sm:p-5 overflow-y-auto"
      style={{ background: 'rgba(0,0,0,0.78)', backdropFilter: 'blur(8px)' }}
    >
      <div className="flex flex-col items-center text-center gap-3 my-auto">
        <h2
          className="rp-display text-white"
          style={{ fontSize: 'clamp(28px, 7vw, 40px)', letterSpacing: '0.1em' }}
        >
          Kata Blocks
        </h2>
        <p className="text-rp-text-secondary text-xs sm:text-sm leading-snug max-w-[280px]">
          Setze Techniken zusammen. Forme die perfekte Kata.
        </p>

        <div className="w-full max-w-[280px] mt-2">
          <TechniqueLegend />
        </div>

        <div className="flex items-center gap-2 mt-2">
          <span className="text-[10px] uppercase tracking-rp-display text-rp-text-muted">
            Highscore
          </span>
          <span className="rp-mono text-rp-beige text-sm font-semibold">
            {bestScore}
          </span>
        </div>

        <div className="w-full max-w-[280px] flex flex-col gap-1.5">
          <p className="text-[10px] uppercase tracking-rp-display text-rp-text-muted">
            Start-Gürtel
          </p>
          <div className="grid grid-cols-5 gap-1">
            {BELT_LEVELS.map((b) => {
              const locked = b.level > safeUnlocked;
              const active = b.level === selectedLevel;
              return (
                <button
                  key={b.level}
                  disabled={locked}
                  onClick={() => setSelectedLevel(b.level)}
                  className="flex flex-col items-center gap-0.5 p-1 rounded transition-all duration-rp"
                  style={{
                    background: active ? 'rgba(220,13,29,0.12)' : 'transparent',
                    border: active
                      ? '1px solid rgba(220,13,29,0.4)'
                      : '1px solid transparent',
                    opacity: locked ? 0.3 : 1,
                    cursor: locked ? 'not-allowed' : 'pointer',
                  }}
                  aria-label={`${b.name} starten`}
                >
                  <span
                    className="block w-full h-1 rounded-full"
                    style={{
                      background: b.hex,
                      border: b.isBlack ? '1px solid #d4c9b5' : 'none',
                    }}
                  />
                  <span
                    className="text-[8px] uppercase font-semibold"
                    style={{ color: active ? '#fff' : '#a0a0a0' }}
                  >
                    {b.level}
                  </span>
                </button>
              );
            })}
          </div>
          <p className="text-[10px] text-rp-text-muted">
            {BELT_LEVELS[selectedLevel - 1]?.name}
          </p>
        </div>

        <button onClick={() => onStart(selectedLevel)} className="rp-btn w-full max-w-[280px] mt-2">
          Training starten
        </button>
        <p className="text-[10px] uppercase tracking-rp-tight text-rp-text-muted">
          oder drücke Leertaste
        </p>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Partikel-Spawner
// ────────────────────────────────────────────────────────────────────────────

function spawnLineFragments(
  arr: Particle[],
  board: Array<Array<PieceType | 0>>,
  flashRows: number[],
  cellW: number,
  cellH: number,
  isQuad: boolean,
) {
  for (const r of flashRows) {
    for (let c = 0; c < TETRIS_COLS; c++) {
      const v = board[r][c];
      if (!v) continue;
      const baseColor = isQuad ? '#d4a017' : (PIECE_META[v as PieceType]?.color ?? '#d4c9b5');
      // 4-6 Splitter pro Zelle
      const splitCount = 4 + Math.floor(Math.random() * 3);
      const cx = c * cellW + cellW / 2;
      const cy = r * cellH + cellH / 2;
      for (let i = 0; i < splitCount; i++) {
        arr.push({
          x: cx + (Math.random() - 0.5) * cellW * 0.6,
          y: cy + (Math.random() - 0.5) * cellH * 0.6,
          vx: (Math.random() - 0.5) * 0.18,
          vy: -0.05 - Math.random() * 0.1,
          size: 1.2 + Math.random() * 1.6,
          color: baseColor,
          life: 500 + Math.random() * 250,
          maxLife: 700,
          gravity: 0.0008,
          shape: 'rect',
        });
      }
    }
  }
  if (isQuad) {
    // Zusätzliche goldene Partikel von oben
    for (let i = 0; i < 24; i++) {
      arr.push({
        x: Math.random() * (TETRIS_COLS * cellW),
        y: -Math.random() * 30,
        vx: (Math.random() - 0.5) * 0.06,
        vy: 0.18 + Math.random() * 0.12,
        size: 1.5 + Math.random() * 1.2,
        color: '#d4a017',
        life: 1200 + Math.random() * 400,
        maxLife: 1600,
        gravity: 0.0003,
        shape: 'dot',
      });
    }
  }
}

function spawnLevelUpShower(arr: Particle[], beltHex: string, canvasWidth: number) {
  for (let i = 0; i < 18; i++) {
    arr.push({
      x: Math.random() * canvasWidth,
      y: -Math.random() * 40,
      vx: (Math.random() - 0.5) * 0.06,
      vy: 0.16 + Math.random() * 0.1,
      size: 1.4 + Math.random() * 1.2,
      color: beltHex,
      life: 900 + Math.random() * 400,
      maxLife: 1300,
      gravity: 0.0004,
      shape: 'dot',
    });
  }
}

function useScoreCounter(target: number, active: boolean, duration = 1500) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!active) {
      setValue(0);
      return;
    }
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
      setValue(Math.round(target * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, active, duration]);
  return value;
}
