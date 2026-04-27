import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BELT_HEX,
  BELT_LABELS,
  BELT_ORDER,
  type BeltRank,
  useSudokuGame,
} from './useSudokuGame';
import SudokuGrid from './SudokuGrid';
import NumberPad from './NumberPad';
import BeltProgress from './BeltProgress';
import BreathTimer from './BreathTimer';
import { isSupabaseConfigured, supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';

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

function Stars({ n }: { n: number }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3].map((i) => (
        <span
          key={i}
          className={`text-2xl ${i <= n ? 'text-rp-rot' : 'text-rp-text-muted opacity-40'}`}
          aria-hidden
        >
          ★
        </span>
      ))}
    </div>
  );
}

function InfoPanel({
  belt,
  errors,
  hintsRemaining,
  hintsLimit,
  progress,
  randoriEnabled,
  randoriTimer,
}: {
  belt: BeltRank;
  errors: number;
  hintsRemaining: number;
  hintsLimit: number;
  progress: number;
  randoriEnabled: boolean;
  randoriTimer: number | null;
}) {
  return (
    <div className="rp-panel p-4 flex flex-col gap-3">
      <div>
        <p className="text-[11px] uppercase tracking-rp-display text-rp-text-muted font-medium">
          Aktueller Gürtel
        </p>
        <div className="flex items-center gap-2 mt-1.5">
          <span
            className="block w-10 h-2 rounded-full"
            style={{
              background: BELT_HEX[belt],
              border: belt === 'black' ? '1px solid #d4c9b5' : 'none',
            }}
          />
          <span className="text-white font-semibold text-sm">
            {BELT_LABELS[belt]}
          </span>
        </div>
      </div>

      <div className="border-t border-[rgba(212,201,181,0.08)] pt-3 flex flex-col gap-2 text-sm">
        <div className="flex justify-between items-center">
          <span className="text-rp-text-muted text-xs uppercase tracking-rp-tight">
            Fehler
          </span>
          <span className="rp-mono text-white font-semibold">{errors}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-rp-text-muted text-xs uppercase tracking-rp-tight">
            Tipps
          </span>
          {hintsLimit > 90 ? (
            <span className="rp-mono text-white font-semibold">∞</span>
          ) : hintsLimit === 0 ? (
            <span className="rp-mono text-rp-text-muted text-xs">keine</span>
          ) : (
            <span className="flex gap-1.5">
              {Array.from({ length: hintsLimit }).map((_, i) => (
                <span
                  key={i}
                  className="block w-2 h-2 rounded-full"
                  style={{
                    background:
                      i < hintsRemaining
                        ? '#dc0d1d'
                        : 'rgba(220, 13, 29, 0.18)',
                  }}
                />
              ))}
            </span>
          )}
        </div>
        {randoriEnabled && randoriTimer !== null && (
          <div className="flex justify-between items-center">
            <span className="text-rp-text-muted text-xs uppercase tracking-rp-tight">
              Randori
            </span>
            <span className="rp-mono text-rp-rot font-semibold">
              {randoriTimer}s
            </span>
          </div>
        )}
        <div className="flex justify-between items-center">
          <span className="text-rp-text-muted text-xs uppercase tracking-rp-tight">
            Prüfungen
          </span>
          <span className="rp-mono text-white font-semibold">
            {Math.min(progress, 3)}/3
          </span>
        </div>
      </div>
    </div>
  );
}

function ResultModal({
  status,
  rating,
  score,
  errors,
  hintsUsed,
  belt,
  unlockedNew,
  onAgain,
}: {
  status: 'won' | 'timeout';
  rating: 'kata' | 'technique' | 'passed' | null;
  score: number;
  errors: number;
  hintsUsed: number;
  belt: BeltRank;
  unlockedNew: BeltRank | null;
  onAgain: () => void;
}) {
  const counter = useScoreCounter(score, status === 'won');
  const ratingLabel =
    rating === 'kata'
      ? 'Saubere Kata!'
      : rating === 'technique'
        ? 'Starke Technik!'
        : 'Prüfung bestanden';
  const stars = rating === 'kata' ? 3 : rating === 'technique' ? 2 : 1;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 rp-anim-fade"
      style={{ backdropFilter: 'blur(8px)' }}
    >
      <div
        className="w-full max-w-md p-8 bg-[#1a1a1a] border border-[rgba(212,201,181,0.15)]"
        style={{ borderRadius: 'var(--rp-radius-lg)' }}
      >
        <p className="text-rp-text-muted uppercase tracking-rp-display text-[11px] font-medium">
          {BELT_LABELS[belt]}
        </p>
        <h2
          className="rp-display text-4xl text-white mt-1"
          style={{ letterSpacing: '0.08em' }}
        >
          {status === 'timeout' ? 'Zeit abgelaufen' : 'OSS!'}
        </h2>
        {status === 'won' && rating && (
          <>
            <p
              className="rp-display rp-pulse-glow mt-3 text-2xl text-rp-beige"
              style={{ letterSpacing: '0.1em' }}
            >
              {ratingLabel}
            </p>
            <div className="mt-4">
              <Stars n={stars} />
            </div>
          </>
        )}

        {status === 'won' && (
          <div className="mt-6 text-center">
            <p className="text-rp-text-muted uppercase tracking-rp-display text-[11px] font-medium">
              Punkte
            </p>
            <p
              className="rp-display text-rp-rot mt-2 leading-none"
              style={{
                fontSize: 'clamp(48px, 12vw, 64px)',
                letterSpacing: '0.04em',
              }}
            >
              {counter}
            </p>
          </div>
        )}

        {status === 'timeout' && (
          <p className="mt-6 text-rp-text-secondary text-sm leading-relaxed">
            Der Atem ging dir aus. Komm zurück und beende die Kata.
          </p>
        )}

        {status === 'won' && (
          <div className="mt-6 flex justify-around text-sm border-t border-[rgba(212,201,181,0.08)] pt-4">
            <div className="text-center">
              <p className="text-rp-text-muted uppercase tracking-rp-tight text-[10px]">
                Fehler
              </p>
              <p className="rp-mono text-white font-semibold mt-1">{errors}</p>
            </div>
            <div className="text-center">
              <p className="text-rp-text-muted uppercase tracking-rp-tight text-[10px]">
                Tipps
              </p>
              <p className="rp-mono text-white font-semibold mt-1">
                {hintsUsed}
              </p>
            </div>
          </div>
        )}

        {unlockedNew && (
          <p
            className="mt-6 text-center text-rp-rot font-semibold uppercase tracking-rp-wide rp-pulse-glow"
            style={{ letterSpacing: '0.1em' }}
          >
            ★ Gürtel freigeschaltet: {BELT_LABELS[unlockedNew]}
          </p>
        )}

        <div className="mt-8 flex flex-col gap-3">
          <button onClick={onAgain} className="rp-btn w-full">
            Nochmal
          </button>
          <Link to="/" className="rp-btn-secondary w-full">
            Zum Dojo
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function SudokuGame() {
  const {
    state,
    beltConfig,
    startGame,
    selectCell,
    setNumber,
    toggleNote,
    clearCell,
    useHint,
    checkErrors,
    togglePause,
    toggleNotesMode,
  } = useSudokuGame();
  const { user } = useAuth();
  const [saved, setSaved] = useState(false);
  const [unlockSnapshot, setUnlockSnapshot] = useState<BeltRank[]>(
    state.unlockedBelts,
  );

  // Track unlocked-set when status flips into "won/timeout" so we can detect new unlocks
  useEffect(() => {
    if (state.status === 'playing' || state.status === 'generating') {
      setUnlockSnapshot(state.unlockedBelts);
    }
  }, [state.status]);

  // Highscore save
  useEffect(() => {
    if (
      state.status === 'won' &&
      !saved &&
      isSupabaseConfigured &&
      user &&
      state.score > 0
    ) {
      setSaved(true);
      const beltLevel = BELT_ORDER.indexOf(state.currentBelt) + 1;
      supabase
        .from('highscores')
        .insert({
          user_id: user.id,
          game: 'sudoku',
          score: state.score,
          level: beltLevel,
          metadata: {
            belt: state.currentBelt,
            rating: state.rating,
            errors: state.errors,
            hints_used: state.hintsUsed,
            time_used:
              state.totalTime !== null && state.timeRemaining !== null
                ? state.totalTime - state.timeRemaining
                : null,
          },
        })
        .then(({ error }) => {
          if (error) console.error('[Sudoku] Highscore save failed:', error.message);
        });
    }
    if (state.status !== 'won' && saved) setSaved(false);
  }, [state.status, state.score, state.currentBelt, state.rating, state.errors, state.hintsUsed, state.timeRemaining, state.totalTime, user, saved]);

  // Keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'p' || e.key === 'P') {
        togglePause();
        return;
      }
      if (state.status !== 'playing') return;
      if (!state.selectedCell) {
        if (
          ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)
        ) {
          e.preventDefault();
          selectCell(0, 0);
        }
        return;
      }
      const [r, c] = state.selectedCell;
      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          selectCell(Math.max(0, r - 1), c);
          return;
        case 'ArrowDown':
          e.preventDefault();
          selectCell(Math.min(8, r + 1), c);
          return;
        case 'ArrowLeft':
          e.preventDefault();
          selectCell(r, Math.max(0, c - 1));
          return;
        case 'ArrowRight':
          e.preventDefault();
          selectCell(r, Math.min(8, c + 1));
          return;
        case 'Backspace':
        case 'Delete':
          e.preventDefault();
          clearCell();
          return;
        case 'n':
        case 'N':
          toggleNotesMode();
          return;
      }
      if (e.key >= '1' && e.key <= '9') {
        e.preventDefault();
        const v = parseInt(e.key, 10);
        if (state.isNotesMode) toggleNote(r, c, v);
        else setNumber(r, c, v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [
    state.status,
    state.selectedCell,
    state.isNotesMode,
    selectCell,
    clearCell,
    toggleNotesMode,
    togglePause,
    setNumber,
    toggleNote,
  ]);

  // Compute error matrix per Belt-Modus
  const errorCells = useMemo(() => {
    const grid: boolean[][] = Array.from({ length: 9 }, () =>
      Array(9).fill(false),
    );
    if (state.status !== 'playing' && state.status !== 'won') return grid;
    const mode = beltConfig.errorMode;
    if (mode === 'none') return grid;
    if (mode === 'manual' && !state.showCheck) return grid;
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (state.puzzle[r][c] !== 0) continue;
        const v = state.userInput[r][c];
        if (v === 0) continue;
        if (v !== state.solution[r][c]) {
          // Bei "onleave" die aktuell ausgewählte Zelle nicht markieren
          if (
            mode === 'onleave' &&
            state.selectedCell !== null &&
            state.selectedCell[0] === r &&
            state.selectedCell[1] === c
          ) {
            continue;
          }
          grid[r][c] = true;
        }
      }
    }
    return grid;
  }, [
    state.puzzle,
    state.userInput,
    state.solution,
    state.selectedCell,
    state.showCheck,
    state.status,
    beltConfig.errorMode,
  ]);

  // Counts pro Zahl (für Number-Pad-Disable)
  const counts = useMemo(() => {
    const c: Record<number, number> = {};
    for (let r = 0; r < 9; r++) {
      for (let cIdx = 0; cIdx < 9; cIdx++) {
        const v =
          state.puzzle[r][cIdx] !== 0
            ? state.puzzle[r][cIdx]
            : state.userInput[r][cIdx];
        if (v !== 0 && v === state.solution[r][cIdx]) {
          c[v] = (c[v] || 0) + 1;
        }
      }
    }
    return c;
  }, [state.puzzle, state.userInput, state.solution]);

  function handlePickBelt(belt: BeltRank) {
    startGame(belt);
  }

  function handleNumberPick(n: number) {
    if (!state.selectedCell) return;
    const [r, c] = state.selectedCell;
    if (state.isNotesMode) {
      toggleNote(r, c, n);
    } else {
      setNumber(r, c, n);
    }
  }

  const idx = BELT_ORDER.indexOf(state.currentBelt);
  const nextBeltCandidate = BELT_ORDER[idx + 1];
  const unlockedNew =
    nextBeltCandidate &&
    state.unlockedBelts.includes(nextBeltCandidate) &&
    !unlockSnapshot.includes(nextBeltCandidate)
      ? nextBeltCandidate
      : null;

  const playing = state.status === 'playing';
  const showResult = state.status === 'won' || state.status === 'timeout';

  return (
    <div className="w-full flex flex-col gap-4">
      <BeltProgress
        current={state.currentBelt}
        unlocked={state.unlockedBelts}
        progress={state.beltProgress}
        onPick={handlePickBelt}
      />

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_280px] gap-5 items-start">
        <div className="flex flex-col items-center gap-3 w-full">
          <div className="relative w-full max-w-[480px]">
            <SudokuGrid
              puzzle={state.puzzle}
              userInput={state.userInput}
              solution={state.solution}
              notes={state.notes}
              selectedCell={state.selectedCell}
              errorCells={errorCells}
              paused={state.status === 'paused'}
              onSelectCell={selectCell}
            />

            {state.status === 'idle' && (
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm rounded-rp-md flex items-center justify-center text-center p-6">
                <div>
                  <p className="rp-display text-3xl text-white" style={{ letterSpacing: '0.1em' }}>
                    Wähle deinen Gürtel
                  </p>
                  <p className="text-rp-text-secondary text-sm mt-2">
                    Tippe oben auf einen freigeschalteten Gürtel, um die
                    Prüfung zu starten.
                  </p>
                </div>
              </div>
            )}

            {state.status === 'generating' && (
              <div className="absolute inset-0 bg-black/70 backdrop-blur-sm rounded-rp-md flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-10 h-10 border-2 border-rp-beige border-t-rp-rot rounded-full animate-spin" />
                  <p className="text-rp-text-secondary text-sm uppercase tracking-rp-tight">
                    Generiere Prüfung …
                  </p>
                </div>
              </div>
            )}

            {state.status === 'paused' && (
              <button
                onClick={togglePause}
                className="absolute inset-0 bg-black/80 backdrop-blur-md rounded-rp-md flex flex-col items-center justify-center gap-3"
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

          {playing && (
            <button
              onClick={togglePause}
              className="text-xs text-rp-text-muted hover:text-rp-rot uppercase tracking-rp-tight transition-colors duration-rp"
            >
              Pause (P)
            </button>
          )}
        </div>

        <aside className="flex flex-col gap-4 items-stretch w-full">
          <div className="flex justify-center">
            <BreathTimer
              remaining={state.timeRemaining}
              total={state.totalTime}
            />
          </div>

          <div className="flex justify-center">
            <NumberPad
              counts={counts}
              notesMode={state.isNotesMode}
              onPick={handleNumberPick}
              onClear={clearCell}
              onToggleNotes={toggleNotesMode}
              onHint={useHint}
              hintsRemaining={state.hintsRemaining}
              errorMode={beltConfig.errorMode}
              onCheck={beltConfig.errorMode === 'manual' ? checkErrors : undefined}
              disabled={!playing}
            />
          </div>

          <InfoPanel
            belt={state.currentBelt}
            errors={state.errors}
            hintsRemaining={state.hintsRemaining}
            hintsLimit={beltConfig.hints}
            progress={state.beltProgress[state.currentBelt]}
            randoriEnabled={beltConfig.randori}
            randoriTimer={state.randoriTimer}
          />
        </aside>
      </div>

      {!isSupabaseConfigured && (
        <p className="text-xs text-rp-text-muted text-center">
          Gast-Modus: Highscores werden nicht gespeichert. Belt-Fortschritt nur
          lokal.
        </p>
      )}
      {isSupabaseConfigured && !user && (
        <p className="text-xs text-rp-text-muted text-center">
          Logge dich ein, um deinen Highscore zu speichern.
        </p>
      )}

      {showResult && (
        <ResultModal
          status={state.status as 'won' | 'timeout'}
          rating={state.rating}
          score={state.score}
          errors={state.errors}
          hintsUsed={state.hintsUsed}
          belt={state.currentBelt}
          unlockedNew={unlockedNew}
          onAgain={() => startGame(state.currentBelt)}
        />
      )}
    </div>
  );
}
