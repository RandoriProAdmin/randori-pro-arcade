import { Link } from 'react-router-dom';
import { useEffect, useMemo, useRef, useState } from 'react';
import { drawScene, LOGICAL_HEIGHT, LOGICAL_WIDTH } from './renderer';
import { useSpaceInvadersGame } from './useSpaceInvadersGame';
import {
  PLAYER_BELTS,
  POWERUP_DURATIONS_MS,
  KI_TECHNIQUES,
  tierForCombo,
  type EnemyType,
} from './constants';
import { drawEnemy, drawHeartFighter, drawPowerUp } from './sprites';
import type { PowerUpKind } from './sprites';
import { isSupabaseConfigured } from '../../lib/supabase';
import NameInputForm from '../../components/NameInputForm';

const HIGHSCORE_KEY = 'randori-pro-arcade.invaders.highscore';

// ────────────────────────────────────────────────────────────────────────────
// Mini-Canvas Renderer für Start-Screen-Vorschau
// ────────────────────────────────────────────────────────────────────────────

function EnemyPreview({ type }: { type: EnemyType }) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    drawEnemy(ctx, w / 2, h * 0.7, type, 0, false, false);
  }, [type]);
  return <canvas ref={ref} className="w-full" style={{ aspectRatio: '1 / 1' }} />;
}

function PowerUpPreview({ kind }: { kind: PowerUpKind }) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    drawPowerUp(ctx, w / 2, h / 2, kind, 1, 0);
  }, [kind]);
  return <canvas ref={ref} className="w-full" style={{ aspectRatio: '1 / 1' }} />;
}

function HeartsBar({ lives }: { lives: number }) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    const slot = w / 3;
    for (let i = 0; i < 3; i++) {
      drawHeartFighter(ctx, slot * (i + 0.5), h / 2, i < lives);
    }
  }, [lives]);
  return <canvas ref={ref} className="w-12 h-5" />;
}

// ────────────────────────────────────────────────────────────────────────────
// Score-Counter Hook
// ────────────────────────────────────────────────────────────────────────────

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

// ────────────────────────────────────────────────────────────────────────────
// Belt-Progress (vertikal/horizontal)
// ────────────────────────────────────────────────────────────────────────────

function BeltProgressBar({
  beltIndex,
  wavesInBelt,
}: {
  beltIndex: number;
  wavesInBelt: number;
}) {
  const progress = Math.min(1, wavesInBelt / 3);
  return (
    <div className="grid grid-cols-7 gap-1 w-full">
      {PLAYER_BELTS.map((b, i) => {
        const filled = i < beltIndex ? 1 : i === beltIndex ? progress : 0;
        const isCurrent = i === beltIndex;
        return (
          <div
            key={b.name}
            className="relative h-1.5 rounded-full overflow-hidden"
            style={{
              background: 'rgba(212, 201, 181, 0.06)',
              opacity: i <= beltIndex ? 1 : 0.35,
            }}
          >
            <div
              className="absolute inset-y-0 left-0 rounded-full transition-all duration-500 ease-out"
              style={{
                width: `${filled * 100}%`,
                background: b.color,
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

// ────────────────────────────────────────────────────────────────────────────
// Touch-Buttons
// ────────────────────────────────────────────────────────────────────────────

function HoldButton({
  onPress,
  onRelease,
  children,
  className = '',
  primary = false,
  ariaLabel,
}: {
  onPress: () => void;
  onRelease: () => void;
  children: React.ReactNode;
  className?: string;
  primary?: boolean;
  ariaLabel: string;
}) {
  const handlers = {
    onTouchStart: (e: React.TouchEvent) => {
      e.preventDefault();
      onPress();
    },
    onTouchEnd: (e: React.TouchEvent) => {
      e.preventDefault();
      onRelease();
    },
    onTouchCancel: () => onRelease(),
    onMouseDown: (e: React.MouseEvent) => {
      e.preventDefault();
      onPress();
    },
    onMouseUp: () => onRelease(),
    onMouseLeave: () => onRelease(),
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
  };
  return (
    <button
      {...handlers}
      aria-label={ariaLabel}
      className={`flex items-center justify-center font-semibold transition-all duration-rp active:bg-[rgba(220,13,29,0.2)] select-none ${className}`}
      style={{
        height: 56,
        borderRadius: 10,
        background: primary ? 'rgba(220, 13, 29, 0.15)' : 'rgba(30, 30, 30, 0.8)',
        border: primary
          ? '1px solid rgba(220, 13, 29, 0.4)'
          : '1px solid rgba(212, 201, 181, 0.12)',
        color: primary ? '#fff' : '#a0a0a0',
      }}
    >
      {children}
    </button>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Main
// ────────────────────────────────────────────────────────────────────────────

export default function SpaceInvadersGame() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const {
    state,
    stateRef,
    belt,
    start,
    restart,
    pause,
    resume,
    fire,
    inputLeft,
    inputRight,
    switchWeapon,
  } = useSpaceInvadersGame();
  const [bestScore, setBestScore] = useState(0);
  const [isNewHigh, setIsNewHigh] = useState(false);
  const savedRef = useRef(false);

  // Highscore laden
  useEffect(() => {
    try {
      const v = window.localStorage.getItem(HIGHSCORE_KEY);
      if (v) setBestScore(Math.max(0, parseInt(v, 10) || 0));
    } catch {
      // ignorieren
    }
  }, []);

  // Render-Loop
  useEffect(() => {
    let raf = 0;
    const loop = () => {
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const dpr = window.devicePixelRatio || 1;
          const cssW = canvas.clientWidth;
          const cssH = canvas.clientHeight;
          if (cssW > 0) {
            const wPx = Math.floor(cssW * dpr);
            const hPx = Math.floor(cssH * dpr);
            if (canvas.width !== wPx || canvas.height !== hPx) {
              canvas.width = wPx;
              canvas.height = hPx;
            }
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            ctx.clearRect(0, 0, cssW, cssH);
            drawScene({
              ctx,
              cssWidth: cssW,
              cssHeight: cssH,
              state: stateRef.current,
              now: performance.now(),
              beltIndex: belt.index,
            });
          }
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [stateRef, belt.index]);

  // Tastatur
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      switch (e.key) {
        case 'ArrowLeft':
        case 'a':
        case 'A':
          e.preventDefault();
          inputLeft(true);
          return;
        case 'ArrowRight':
        case 'd':
        case 'D':
          e.preventDefault();
          inputRight(true);
          return;
        case ' ':
          e.preventDefault();
          if (state.status === 'idle') start();
          else fire();
          return;
        case 'Escape':
        case 'p':
        case 'P':
          e.preventDefault();
          if (state.status === 'playing') pause();
          else if (state.status === 'paused') resume();
          return;
        case '1':
          e.preventDefault();
          switchWeapon(0);
          return;
        case '2':
          e.preventDefault();
          switchWeapon(1);
          return;
        case '3':
          e.preventDefault();
          switchWeapon(2);
          return;
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowLeft':
        case 'a':
        case 'A':
          inputLeft(false);
          return;
        case 'ArrowRight':
        case 'd':
        case 'D':
          inputRight(false);
          return;
      }
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [state.status, start, pause, resume, fire, inputLeft, inputRight, switchWeapon]);

  // Game Over: Highscore speichern
  useEffect(() => {
    if (state.status !== 'gameOver') {
      savedRef.current = false;
      if (isNewHigh) setIsNewHigh(false);
      return;
    }
    if (savedRef.current) return;
    savedRef.current = true;

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

  }, [state.status, state.score, bestScore, isNewHigh]);

  const wavesInBelt = state.wavesSurvived - belt.index * 3;
  const showAnnounce = state.status === 'announce' && state.announce;
  const showStartScreen = state.status === 'idle';
  const showPause = state.status === 'paused';
  const showGameOver = state.status === 'gameOver';
  const goScore = useScoreCounter(state.score, showGameOver);

  const ppText = useMemo(() => {
    if (!state.ppRecent) return null;
    switch (state.ppRecent.kind) {
      case 'blackBelt': return { text: '+1000', color: '#d4a017' };
      case 'shield':    return { text: 'SENSEI-SCHILD', color: '#d4a017' };
      case 'doubleKi':  return { text: 'DOPPEL-KI!', color: '#dc0d1d' };
      case 'zanshin':   return { text: 'ZANSHIN', color: '#2454a0' };
    }
  }, [state.ppRecent]);

  // Effects countdown display
  const now = performance.now();
  const effectShield = (state.activeEffects.shield ?? 0) - now;
  const effectDouble = (state.activeEffects.doubleKi ?? 0) - now;
  const effectZanshin = (state.activeEffects.zanshin ?? 0) - now;

  return (
    <div className="w-full flex flex-col gap-3 sm:gap-4" ref={containerRef}>
      {/* Belt-Progress */}
      <BeltProgressBar beltIndex={belt.index} wavesInBelt={wavesInBelt} />

      {/* HUD */}
      <div className="flex items-center justify-between gap-3 flex-wrap pb-2 border-b border-[rgba(212,201,181,0.08)]">
        <div className="flex items-baseline gap-2">
          <span className="text-[10px] uppercase tracking-rp-display text-rp-text-muted font-medium">
            Verteidigung
          </span>
          <span className="rp-mono text-rp-rot font-bold" style={{ fontSize: '20px' }}>
            {state.score}
          </span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-[10px] uppercase tracking-rp-display text-rp-text-muted font-medium">
            Welle
          </span>
          <span className="rp-mono text-white font-semibold" style={{ fontSize: '16px' }}>
            {state.wave || '—'}
          </span>
        </div>
        <HeartsBar lives={state.player.lives} />
        {/* Combo */}
        {state.combo.count >= 3 && (() => {
          const tier = tierForCombo(state.combo.count);
          if (!tier) return null;
          return (
            <span
              className="rp-display"
              style={{
                fontSize: '17px',
                letterSpacing: '0.08em',
                color: tier.color,
                textShadow: tier.isGold
                  ? '0 0 10px rgba(212, 160, 23, 0.7)'
                  : '0 0 8px rgba(220, 13, 29, 0.45)',
                animation: 'rp-combo-pulse 800ms ease-in-out infinite',
              }}
            >
              {state.combo.count}× {tier.name}
            </span>
          );
        })()}
        <div className="flex items-center gap-2">
          <span
            className="block w-6 h-1.5 rounded-full"
            style={{
              background: belt.belt.color,
              border: belt.belt.isBlack ? '1px solid #d4c9b5' : 'none',
              boxShadow: `0 0 6px ${belt.belt.glow}`,
            }}
          />
          <span className="text-[12px] uppercase tracking-rp-tight text-rp-text-secondary font-semibold">
            {belt.belt.name}
          </span>
        </div>
      </div>

      {/* Letzte Verteidigung Banner */}
      {state.player.lives === 1 && state.status === 'playing' && (
        <div className="flex items-center justify-center">
          <span
            className="rp-display rp-pulse-glow text-sm"
            style={{
              color: '#dc0d1d',
              letterSpacing: '0.12em',
              textShadow: '0 0 12px rgba(220, 13, 29, 0.7)',
            }}
          >
            ★ Letzte Verteidigung ★
          </span>
        </div>
      )}

      {/* Active effect badges */}
      {(effectShield > 0 || effectDouble > 0 || effectZanshin > 0) && (
        <div className="flex gap-2 text-[11px] rp-mono">
          {effectShield > 0 && (
            <span className="px-2 py-0.5 rounded-full" style={{ background: 'rgba(212, 160, 23, 0.12)', color: '#d4a017' }}>
              Schild {(effectShield / 1000).toFixed(1)}s
            </span>
          )}
          {effectDouble > 0 && (
            <span className="px-2 py-0.5 rounded-full" style={{ background: 'rgba(220, 13, 29, 0.12)', color: '#dc0d1d' }}>
              Doppel-Ki {(effectDouble / 1000).toFixed(1)}s
            </span>
          )}
          {effectZanshin > 0 && (
            <span className="px-2 py-0.5 rounded-full" style={{ background: 'rgba(36, 84, 160, 0.15)', color: '#2454a0' }}>
              Zanshin {(effectZanshin / 1000).toFixed(1)}s
            </span>
          )}
        </div>
      )}

      {/* Spielfeld */}
      <div
        className="relative w-full mx-auto"
        style={{
          maxWidth: '480px',
          aspectRatio: `${LOGICAL_WIDTH} / ${LOGICAL_HEIGHT}`,
        }}
      >
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full rounded-rp-md"
          style={{ border: '1px solid rgba(212, 201, 181, 0.08)' }}
          aria-label="Dojo-Defenders-Spielfeld"
        />

        {/* Wave/Boss Announce */}
        {showAnnounce && state.announce && (
          <div className="absolute inset-0 flex items-center justify-center text-center pointer-events-none rp-anim-fade">
            <div>
              <p
                className={`rp-display ${state.announce.isBoss ? 'rp-pulse-glow' : ''}`}
                style={{
                  fontSize: state.announce.isBoss ? 'clamp(22px, 6vw, 30px)' : 'clamp(28px, 8vw, 40px)',
                  letterSpacing: '0.1em',
                  color: state.announce.isBoss ? '#dc0d1d' : '#ffffff',
                  textShadow: state.announce.isBoss
                    ? '0 0 18px rgba(220, 13, 29, 0.7)'
                    : '0 0 8px rgba(0, 0, 0, 0.8)',
                }}
              >
                {state.announce.title}
              </p>
              {state.announce.subtitle && (
                <p className="text-rp-text-secondary text-sm mt-2">
                  {state.announce.subtitle}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Power-Up-Pickup-Text */}
        {ppText && (
          <div className="absolute inset-0 flex items-end justify-center pointer-events-none rp-anim-fade pb-24">
            <span
              className="rp-display"
              style={{
                fontSize: '20px',
                letterSpacing: '0.1em',
                color: ppText.color,
                textShadow: `0 0 12px ${ppText.color}`,
              }}
            >
              {ppText.text}
            </span>
          </div>
        )}

        {/* Boss-Defeat-Text */}
        {state.bossDefeatTextUntil > now && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none rp-anim-fade">
            <span
              className="rp-display"
              style={{
                fontSize: 'clamp(22px, 6vw, 36px)',
                letterSpacing: '0.1em',
                color: '#d4a017',
                textShadow: '0 0 24px rgba(212, 160, 23, 0.8)',
              }}
            >
              Sensei besiegt!
            </span>
          </div>
        )}

        {/* Start-Screen */}
        {showStartScreen && (
          <StartScreen bestScore={bestScore} onStart={start} />
        )}

        {/* Pause */}
        {showPause && (
          <div
            className="absolute inset-0 rounded-rp-md flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(4px)' }}
          >
            <div className="flex flex-col items-center gap-3 text-center max-w-[280px]">
              <h2
                className="rp-display text-white"
                style={{ fontSize: '40px', letterSpacing: '0.12em' }}
              >
                Pause
              </h2>
              <p className="text-rp-text-secondary text-sm italic">
                Der wahre Kämpfer kennt den Wert der Ruhe.
              </p>
              <div className="flex flex-col gap-2 w-full mt-2">
                <button onClick={resume} className="rp-btn w-full">
                  Fortsetzen
                </button>
                <button
                  onClick={() => restart()}
                  className="rp-btn-secondary w-full"
                >
                  Aufgeben
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Game Over */}
        {showGameOver && (
          <div className="absolute inset-0 rounded-rp-md flex items-center justify-center p-4 sm:p-6 rp-anim-fade"
            style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(2px)' }}
          >
            <div className="flex flex-col items-center text-center gap-3 max-w-[300px]">
              <h2
                className="rp-display"
                style={{ fontSize: '36px', color: '#dc0d1d', letterSpacing: '0.1em' }}
              >
                Dojo gefallen
              </h2>
              <div>
                <p className="text-[11px] uppercase tracking-rp-display text-rp-text-muted font-medium">
                  Verteidigung
                </p>
                <p
                  className="rp-mono text-white font-bold leading-none mt-1"
                  style={{ fontSize: '40px' }}
                >
                  {goScore}
                </p>
              </div>
              <div className="text-sm text-rp-text-secondary leading-relaxed">
                <p>
                  Wellen überlebt:{' '}
                  <span className="rp-mono text-white font-semibold">
                    {state.wavesSurvived}
                  </span>
                </p>
                <p>
                  Gegner besiegt:{' '}
                  <span className="rp-mono text-white font-semibold">
                    {state.enemiesDefeated}
                  </span>
                </p>
                <p>
                  Bosse besiegt:{' '}
                  <span className="rp-mono text-white font-semibold">
                    {state.bossesDefeated}
                  </span>
                </p>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span
                  className="block w-10 h-1.5 rounded-full"
                  style={{
                    background: belt.belt.color,
                    border: belt.belt.isBlack ? '1px solid #d4c9b5' : 'none',
                  }}
                />
                <span className="text-xs uppercase tracking-rp-tight text-rp-text-secondary font-semibold">
                  {belt.belt.name}
                </span>
              </div>
              {isNewHigh && state.score > 0 && (
                <p
                  className="rp-display rp-pulse-glow text-xl"
                  style={{ color: '#d4a017', letterSpacing: '0.1em' }}
                >
                  Neuer Rekord!
                </p>
              )}
              <NameInputForm
                game="space-invaders"
                score={state.score}
                level={state.wavesSurvived}
                metadata={{
                  wavesSurvived: state.wavesSurvived,
                  enemiesDefeated: state.enemiesDefeated,
                  bossesDefeated: state.bossesDefeated,
                  belt: belt.belt.name,
                }}
              />
              <div className="flex flex-col gap-2 w-full mt-1">
                <button onClick={() => start()} className="rp-btn w-full">
                  Nochmal verteidigen
                </button>
                <Link to="/" className="rp-btn-secondary w-full">
                  Zurück
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Mobile Touch Buttons */}
      <div className="grid grid-cols-[1fr_2fr_1fr] gap-2 sm:hidden">
        <HoldButton
          ariaLabel="Links"
          onPress={() => inputLeft(true)}
          onRelease={() => inputLeft(false)}
        >
          ←
        </HoldButton>
        <HoldButton
          ariaLabel="Feuer"
          onPress={fire}
          onRelease={() => {}}
          primary
        >
          🔥 Feuer
        </HoldButton>
        <HoldButton
          ariaLabel="Rechts"
          onPress={() => inputRight(true)}
          onRelease={() => inputRight(false)}
        >
          →
        </HoldButton>
      </div>

      {/* Waffen-Slots */}
      <div className="flex items-center justify-center gap-2 mt-1">
        {KI_TECHNIQUES.map((tech, i) => {
          const unlocked = i < state.unlockedWeapons;
          const active = i === state.activeWeapon;
          return (
            <button
              key={tech.id}
              type="button"
              onClick={() => unlocked && switchWeapon(i)}
              disabled={!unlocked}
              className="flex flex-col items-center justify-center gap-0.5 transition-all duration-rp"
              style={{
                width: 72,
                height: 48,
                borderRadius: 8,
                background: active
                  ? 'rgba(220, 13, 29, 0.18)'
                  : unlocked
                    ? 'rgba(30, 30, 30, 0.6)'
                    : 'rgba(30, 30, 30, 0.3)',
                border: active
                  ? '1px solid rgba(220, 13, 29, 0.5)'
                  : '1px solid rgba(212, 201, 181, 0.12)',
                opacity: unlocked ? 1 : 0.4,
                cursor: unlocked ? 'pointer' : 'not-allowed',
              }}
              aria-label={`${tech.name} (${i + 1})`}
            >
              <span
                className="font-serif"
                style={{
                  color: active ? '#dc0d1d' : '#d4c9b5',
                  fontSize: '16px',
                  opacity: 0.85,
                }}
              >
                {tech.kanji}
              </span>
              <span
                className="rp-mono uppercase"
                style={{
                  fontSize: '9px',
                  letterSpacing: '0.05em',
                  color: active ? '#ffffff' : '#a0a0a0',
                }}
              >
                {!unlocked ? `🔒 W.${tech.unlockWave}` : `${i + 1} ${tech.name}`}
              </span>
            </button>
          );
        })}
      </div>

      <p className="hidden sm:block text-xs text-rp-text-muted rp-mono text-center">
        ← → bewegen · Leertaste = Feuer · 1/2/3 Waffe · Esc/P pausiert
      </p>

      {!isSupabaseConfigured && (
        <p className="text-xs text-rp-text-muted text-center">
          Bestenliste momentan nicht verfügbar.
        </p>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Start-Screen
// ────────────────────────────────────────────────────────────────────────────

const ENEMY_TIERS: { type: EnemyType; name: string; points: number }[] = [
  { type: 'white', name: 'Weiß-Gurt',  points: 100 },
  { type: 'blue',  name: 'Blau-Gurt',  points: 200 },
  { type: 'brown', name: 'Braun-Gurt', points: 300 },
  { type: 'black', name: 'Schwarz-Gurt', points: 500 },
];

const POWERUPS_INFO: { kind: PowerUpKind; name: string; desc: string }[] = [
  { kind: 'blackBelt', name: 'Schwarzer Gürtel', desc: '+1000 Punkte' },
  { kind: 'shield',    name: 'Sensei-Schild',    desc: `${POWERUP_DURATIONS_MS.shield / 1000}s unverwundbar` },
  { kind: 'doubleKi',  name: 'Doppel-Ki',        desc: `${POWERUP_DURATIONS_MS.doubleKi / 1000}s 2 Schüsse` },
  { kind: 'zanshin',   name: 'Zanshin',          desc: `${POWERUP_DURATIONS_MS.zanshin / 1000}s Zeitlupe` },
];

function StartScreen({ bestScore, onStart }: { bestScore: number; onStart: () => void }) {
  return (
    <div
      className="absolute inset-0 rounded-rp-md flex flex-col p-4 sm:p-5 overflow-y-auto"
      style={{ background: 'rgba(0,0,0,0.78)', backdropFilter: 'blur(8px)' }}
    >
      <div className="flex flex-col items-center text-center gap-3 my-auto">
        <h2
          className="rp-display text-white"
          style={{ fontSize: 'clamp(28px, 7vw, 44px)', letterSpacing: '0.1em' }}
        >
          Dojo Defenders
        </h2>
        <p className="text-rp-text-secondary text-xs sm:text-sm leading-snug max-w-[300px]">
          Verteidige dein Dojo. Besiege die Herausforderer.
        </p>

        {/* Gegner-Vorschau */}
        <div className="grid grid-cols-4 gap-2 w-full max-w-[280px] mt-1">
          {ENEMY_TIERS.map((t) => (
            <div key={t.type} className="flex flex-col items-center gap-1">
              <div className="w-full max-w-[36px]">
                <EnemyPreview type={t.type} />
              </div>
              <p className="text-[9px] uppercase tracking-rp-tight text-rp-text-secondary font-semibold leading-tight">
                {t.name}
              </p>
              <p className="text-[10px] rp-mono text-rp-rot">
                {t.points}
              </p>
            </div>
          ))}
        </div>

        {/* Power-Up-Legende */}
        <div className="grid grid-cols-4 gap-2 w-full max-w-[280px] mt-1">
          {POWERUPS_INFO.map((p) => (
            <div key={p.kind} className="flex flex-col items-center gap-1">
              <div className="w-full max-w-[28px]">
                <PowerUpPreview kind={p.kind} />
              </div>
              <p className="text-[9px] uppercase tracking-rp-tight text-rp-text-secondary font-semibold leading-tight">
                {p.name}
              </p>
              <p className="text-[8px] text-rp-text-muted leading-tight">
                {p.desc}
              </p>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2 mt-2">
          <span className="text-[10px] uppercase tracking-rp-display text-rp-text-muted">
            Highscore
          </span>
          <span className="rp-mono text-rp-beige text-sm font-semibold">
            {bestScore}
          </span>
        </div>

        <button onClick={onStart} className="rp-btn w-full max-w-[260px] mt-2">
          Dojo verteidigen
        </button>
        <p className="text-[10px] uppercase tracking-rp-tight text-rp-text-muted">
          oder drücke Leertaste
        </p>
      </div>
    </div>
  );
}
