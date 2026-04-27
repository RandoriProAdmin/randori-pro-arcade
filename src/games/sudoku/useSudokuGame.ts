import { useCallback, useEffect, useMemo, useReducer } from 'react';
import {
  generatePuzzle,
  pickTargetClues,
  type Grid,
} from './sudokuGenerator';

export type BeltRank =
  | 'white'
  | 'yellow'
  | 'orange'
  | 'green'
  | 'blue'
  | 'brown'
  | 'black';

export type ErrorMode = 'realtime' | 'onleave' | 'manual' | 'none';
export type Status = 'idle' | 'generating' | 'playing' | 'paused' | 'won' | 'timeout';
export type Rating = 'kata' | 'technique' | 'passed';

export const BELT_ORDER: BeltRank[] = [
  'white',
  'yellow',
  'orange',
  'green',
  'blue',
  'brown',
  'black',
];

export const BELT_LABELS: Record<BeltRank, string> = {
  white: 'Weiß-Gurt',
  yellow: 'Gelb-Gurt',
  orange: 'Orange-Gurt',
  green: 'Grün-Gurt',
  blue: 'Blau-Gurt',
  brown: 'Braun-Gurt',
  black: 'Schwarz-Gurt',
};

export const BELT_HEX: Record<BeltRank, string> = {
  white: '#e8e8e8',
  yellow: '#e8c840',
  orange: '#d4762c',
  green: '#2d8c4e',
  blue: '#2856a8',
  brown: '#6b3a2a',
  black: '#1a1a1a',
};

export interface BeltConfig {
  clues: [number, number];
  timeLimit: number | null; // Sekunden, null = unbegrenzt
  hints: number;
  errorMode: ErrorMode;
  randori: boolean;
  multiplier: number;
}

export const BELT_CONFIG: Record<BeltRank, BeltConfig> = {
  white:  { clues: [38, 42], timeLimit: null,    hints: 99, errorMode: 'realtime', randori: false, multiplier: 1.0 },
  yellow: { clues: [32, 36], timeLimit: null,    hints: 5,  errorMode: 'realtime', randori: false, multiplier: 1.5 },
  orange: { clues: [28, 32], timeLimit: 15 * 60, hints: 3,  errorMode: 'realtime', randori: false, multiplier: 2.0 },
  green:  { clues: [26, 30], timeLimit: 12 * 60, hints: 2,  errorMode: 'onleave',  randori: false, multiplier: 2.5 },
  blue:   { clues: [24, 28], timeLimit: 10 * 60, hints: 1,  errorMode: 'manual',   randori: false, multiplier: 3.0 },
  brown:  { clues: [22, 26], timeLimit: 8 * 60,  hints: 0,  errorMode: 'none',     randori: false, multiplier: 4.0 },
  black:  { clues: [22, 24], timeLimit: 10 * 60, hints: 0,  errorMode: 'none',     randori: true,  multiplier: 5.0 },
};

const RANDORI_INTERVAL_S = 90;
const PUZZLES_PER_BELT = 3;
const STORAGE_KEY = 'randori-pro-arcade.sudoku.progress';

export interface SudokuState {
  puzzle: Grid;
  solution: Grid;
  userInput: Grid;
  notes: number[][][]; // notes[r][c] = number[]
  selectedCell: [number, number] | null;
  isNotesMode: boolean;
  currentBelt: BeltRank;
  unlockedBelts: BeltRank[];
  beltProgress: Record<BeltRank, number>;
  timeRemaining: number | null;
  totalTime: number | null;
  hintsRemaining: number;
  hintsUsed: number;
  errors: number;
  status: Status;
  score: number;
  rating: Rating | null;
  randoriTimer: number | null;
  removedCells: Array<[number, number]>;
  showCheck: boolean; // für Blau-Gurt manueller Prüfen-Modus
}

type Action =
  | { type: 'NEW_GAME'; belt: BeltRank; puzzle: Grid; solution: Grid }
  | { type: 'GENERATE_START'; belt: BeltRank }
  | { type: 'SET_NUMBER'; row: number; col: number; value: number }
  | { type: 'TOGGLE_NOTE'; row: number; col: number; value: number }
  | { type: 'SELECT_CELL'; row: number; col: number }
  | { type: 'CLEAR_CELL' }
  | { type: 'USE_HINT' }
  | { type: 'CHECK_ERRORS' }
  | { type: 'TICK_TIMER' }
  | { type: 'TICK_RANDORI' }
  | { type: 'TOGGLE_PAUSE' }
  | { type: 'TOGGLE_NOTES_MODE' }
  | { type: 'TIMEOUT' };

function emptyGrid(): Grid {
  return Array.from({ length: 9 }, () => Array(9).fill(0));
}

function emptyNotes(): number[][][] {
  return Array.from({ length: 9 }, () =>
    Array.from({ length: 9 }, () => [] as number[]),
  );
}

function loadProgress(): {
  unlockedBelts: BeltRank[];
  beltProgress: Record<BeltRank, number>;
} {
  const empty = {
    unlockedBelts: ['white'] as BeltRank[],
    beltProgress: BELT_ORDER.reduce(
      (acc, b) => ({ ...acc, [b]: 0 }),
      {} as Record<BeltRank, number>,
    ),
  };
  if (typeof window === 'undefined') return empty;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return empty;
    const data = JSON.parse(raw) as {
      unlockedBelts: BeltRank[];
      beltProgress: Record<BeltRank, number>;
    };
    if (!data.unlockedBelts || !data.beltProgress) return empty;
    // Merge mit allen Belts (falls neue dazukamen)
    const beltProgress = { ...empty.beltProgress, ...data.beltProgress };
    return { unlockedBelts: data.unlockedBelts, beltProgress };
  } catch {
    return empty;
  }
}

function saveProgress(state: SudokuState) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        unlockedBelts: state.unlockedBelts,
        beltProgress: state.beltProgress,
      }),
    );
  } catch {
    // ignorieren
  }
}

function init(): SudokuState {
  const progress = loadProgress();
  return {
    puzzle: emptyGrid(),
    solution: emptyGrid(),
    userInput: emptyGrid(),
    notes: emptyNotes(),
    selectedCell: null,
    isNotesMode: false,
    currentBelt: 'white',
    unlockedBelts: progress.unlockedBelts,
    beltProgress: progress.beltProgress,
    timeRemaining: null,
    totalTime: null,
    hintsRemaining: 0,
    hintsUsed: 0,
    errors: 0,
    status: 'idle',
    score: 0,
    rating: null,
    randoriTimer: null,
    removedCells: [],
    showCheck: false,
  };
}

function isFullyCorrect(
  puzzle: Grid,
  user: Grid,
  solution: Grid,
): boolean {
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const v = puzzle[r][c] !== 0 ? puzzle[r][c] : user[r][c];
      if (v !== solution[r][c]) return false;
    }
  }
  return true;
}

function computeRating(
  errors: number,
  hintsUsed: number,
  timeRemaining: number | null,
  totalTime: number | null,
): Rating {
  const usedHalf =
    totalTime !== null && timeRemaining !== null
      ? timeRemaining < totalTime * 0.5
      : false;
  if (hintsUsed === 0 && errors === 0 && (totalTime === null || !usedHalf)) {
    return 'kata';
  }
  if (hintsUsed === 0 && errors <= 3) return 'technique';
  return 'passed';
}

function computeScore(
  belt: BeltRank,
  rating: Rating,
  errors: number,
  hintsUsed: number,
  timeRemaining: number | null,
): number {
  const cfg = BELT_CONFIG[belt];
  let score = 1000 * cfg.multiplier;
  if (timeRemaining !== null) score += timeRemaining * 2;
  if (rating === 'kata') score += 500;
  else if (rating === 'technique') score += 250;
  score -= hintsUsed * 50;
  score -= errors * 25;
  return Math.max(0, Math.round(score));
}

function isInSameUnit(
  r1: number,
  c1: number,
  r2: number,
  c2: number,
): boolean {
  if (r1 === r2 || c1 === c2) return true;
  return Math.floor(r1 / 3) === Math.floor(r2 / 3) &&
    Math.floor(c1 / 3) === Math.floor(c2 / 3);
}

function pruneNotes(
  notes: number[][][],
  row: number,
  col: number,
  value: number,
): number[][][] {
  if (value === 0) return notes;
  const next = notes.map((row) => row.map((cell) => [...cell]));
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (r === row && c === col) {
        next[r][c] = [];
        continue;
      }
      if (isInSameUnit(row, col, r, c)) {
        next[r][c] = next[r][c].filter((n) => n !== value);
      }
    }
  }
  return next;
}

function pickRandoriCell(
  puzzle: Grid,
  user: Grid,
  solution: Grid,
): [number, number] | null {
  const candidates: Array<[number, number]> = [];
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (puzzle[r][c] === 0 && user[r][c] === solution[r][c] && user[r][c] !== 0) {
        candidates.push([r, c]);
      }
    }
  }
  if (!candidates.length) return null;
  return candidates[Math.floor(Math.random() * candidates.length)];
}

function reducer(state: SudokuState, action: Action): SudokuState {
  switch (action.type) {
    case 'GENERATE_START':
      return { ...state, status: 'generating', currentBelt: action.belt };

    case 'NEW_GAME': {
      const cfg = BELT_CONFIG[action.belt];
      return {
        ...state,
        puzzle: action.puzzle,
        solution: action.solution,
        userInput: emptyGrid(),
        notes: emptyNotes(),
        selectedCell: null,
        isNotesMode: false,
        currentBelt: action.belt,
        timeRemaining: cfg.timeLimit,
        totalTime: cfg.timeLimit,
        hintsRemaining: cfg.hints,
        hintsUsed: 0,
        errors: 0,
        status: 'playing',
        score: 0,
        rating: null,
        randoriTimer: cfg.randori ? RANDORI_INTERVAL_S : null,
        removedCells: [],
        showCheck: false,
      };
    }

    case 'SELECT_CELL':
      if (state.status !== 'playing') return state;
      return { ...state, selectedCell: [action.row, action.col], showCheck: false };

    case 'TOGGLE_PAUSE':
      if (state.status === 'playing') return { ...state, status: 'paused' };
      if (state.status === 'paused') return { ...state, status: 'playing' };
      return state;

    case 'TOGGLE_NOTES_MODE':
      if (state.status !== 'playing') return state;
      return { ...state, isNotesMode: !state.isNotesMode };

    case 'CLEAR_CELL': {
      if (state.status !== 'playing' || !state.selectedCell) return state;
      const [r, c] = state.selectedCell;
      if (state.puzzle[r][c] !== 0) return state;
      const userInput = state.userInput.map((row) => [...row]);
      userInput[r][c] = 0;
      const notes = state.notes.map((row) => row.map((cell) => [...cell]));
      notes[r][c] = [];
      return { ...state, userInput, notes };
    }

    case 'TOGGLE_NOTE': {
      if (state.status !== 'playing' || !state.selectedCell) return state;
      const [r, c] = state.selectedCell;
      if (state.puzzle[r][c] !== 0) return state;
      if (state.userInput[r][c] !== 0) return state; // erst leeren
      const cellNotes = state.notes[r][c];
      const next = state.notes.map((row) => row.map((cell) => [...cell]));
      next[r][c] = cellNotes.includes(action.value)
        ? cellNotes.filter((n) => n !== action.value)
        : [...cellNotes, action.value].sort();
      return { ...state, notes: next };
    }

    case 'SET_NUMBER': {
      if (state.status !== 'playing' || !state.selectedCell) return state;
      const [r, c] = state.selectedCell;
      if (state.puzzle[r][c] !== 0) return state;
      const v = action.value;
      const userInput = state.userInput.map((row) => [...row]);
      userInput[r][c] = v;
      let notes = state.notes.map((row) => row.map((cell) => [...cell]));
      notes[r][c] = [];
      // Notizen in derselben Einheit beschneiden, wenn Wert gesetzt wird
      if (v !== 0) notes = pruneNotes(notes, r, c, v);

      const isWrong = v !== 0 && v !== state.solution[r][c];
      const errors = state.errors + (isWrong ? 1 : 0);

      // Komplett gelöst?
      const fullyCorrect = isFullyCorrect(state.puzzle, userInput, state.solution);
      if (fullyCorrect) {
        const rating = computeRating(
          errors,
          state.hintsUsed,
          state.timeRemaining,
          state.totalTime,
        );
        const score = computeScore(
          state.currentBelt,
          rating,
          errors,
          state.hintsUsed,
          state.timeRemaining,
        );
        // Belt-Fortschritt + Unlock
        const beltProgress = {
          ...state.beltProgress,
          [state.currentBelt]: state.beltProgress[state.currentBelt] + 1,
        };
        let unlockedBelts = state.unlockedBelts;
        if (beltProgress[state.currentBelt] >= PUZZLES_PER_BELT) {
          const idx = BELT_ORDER.indexOf(state.currentBelt);
          const nextBelt = BELT_ORDER[idx + 1];
          if (nextBelt && !unlockedBelts.includes(nextBelt)) {
            unlockedBelts = [...unlockedBelts, nextBelt];
          }
        }
        return {
          ...state,
          userInput,
          notes,
          errors,
          status: 'won',
          score,
          rating,
          beltProgress,
          unlockedBelts,
          randoriTimer: null,
        };
      }

      return { ...state, userInput, notes, errors };
    }

    case 'USE_HINT': {
      if (state.status !== 'playing' || !state.selectedCell) return state;
      if (state.hintsRemaining <= 0) return state;
      const [r, c] = state.selectedCell;
      if (state.puzzle[r][c] !== 0) return state;
      if (state.userInput[r][c] === state.solution[r][c]) return state;
      const userInput = state.userInput.map((row) => [...row]);
      userInput[r][c] = state.solution[r][c];
      let notes = state.notes.map((row) => row.map((cell) => [...cell]));
      notes[r][c] = [];
      notes = pruneNotes(notes, r, c, state.solution[r][c]);
      // Komplettheit nach Hint prüfen
      const fullyCorrect = isFullyCorrect(state.puzzle, userInput, state.solution);
      const newHintsRemaining = state.hintsRemaining - 1;
      const newHintsUsed = state.hintsUsed + 1;
      if (fullyCorrect) {
        const rating = computeRating(
          state.errors,
          newHintsUsed,
          state.timeRemaining,
          state.totalTime,
        );
        const score = computeScore(
          state.currentBelt,
          rating,
          state.errors,
          newHintsUsed,
          state.timeRemaining,
        );
        const beltProgress = {
          ...state.beltProgress,
          [state.currentBelt]: state.beltProgress[state.currentBelt] + 1,
        };
        let unlockedBelts = state.unlockedBelts;
        if (beltProgress[state.currentBelt] >= PUZZLES_PER_BELT) {
          const idx = BELT_ORDER.indexOf(state.currentBelt);
          const nextBelt = BELT_ORDER[idx + 1];
          if (nextBelt && !unlockedBelts.includes(nextBelt)) {
            unlockedBelts = [...unlockedBelts, nextBelt];
          }
        }
        return {
          ...state,
          userInput,
          notes,
          hintsRemaining: newHintsRemaining,
          hintsUsed: newHintsUsed,
          status: 'won',
          rating,
          score,
          beltProgress,
          unlockedBelts,
          randoriTimer: null,
        };
      }
      return {
        ...state,
        userInput,
        notes,
        hintsRemaining: newHintsRemaining,
        hintsUsed: newHintsUsed,
      };
    }

    case 'CHECK_ERRORS':
      if (state.status !== 'playing') return state;
      return { ...state, showCheck: true };

    case 'TICK_TIMER': {
      if (state.status !== 'playing' || state.timeRemaining === null) return state;
      const remaining = state.timeRemaining - 1;
      if (remaining <= 0) {
        return { ...state, timeRemaining: 0, status: 'timeout' };
      }
      return { ...state, timeRemaining: remaining };
    }

    case 'TICK_RANDORI': {
      if (state.status !== 'playing' || state.randoriTimer === null) return state;
      const t = state.randoriTimer - 1;
      if (t > 0) return { ...state, randoriTimer: t };
      // Eine korrekt eingetragene Zahl entfernen
      const cell = pickRandoriCell(state.puzzle, state.userInput, state.solution);
      if (!cell) return { ...state, randoriTimer: RANDORI_INTERVAL_S };
      const [r, c] = cell;
      const userInput = state.userInput.map((row) => [...row]);
      userInput[r][c] = 0;
      return {
        ...state,
        userInput,
        randoriTimer: RANDORI_INTERVAL_S,
        removedCells: [...state.removedCells, [r, c]],
      };
    }

    case 'TIMEOUT':
      return { ...state, status: 'timeout' };
  }
}

export function useSudokuGame() {
  const [state, dispatch] = useReducer(reducer, undefined, init);

  // Persistenz: bei jedem Belt-Progress oder Unlock speichern
  useEffect(() => {
    saveProgress(state);
  }, [state.unlockedBelts, state.beltProgress]);

  // Timer-Tick (1s) — nur im Spielbetrieb
  useEffect(() => {
    if (state.status !== 'playing' || state.timeRemaining === null) return;
    const id = window.setInterval(() => dispatch({ type: 'TICK_TIMER' }), 1000);
    return () => window.clearInterval(id);
  }, [state.status, state.timeRemaining === null]);

  // Randori-Tick (1s) — nur Schwarz-Gurt im Spielbetrieb
  useEffect(() => {
    if (state.status !== 'playing' || state.randoriTimer === null) return;
    const id = window.setInterval(() => dispatch({ type: 'TICK_RANDORI' }), 1000);
    return () => window.clearInterval(id);
  }, [state.status, state.randoriTimer === null]);

  const startGame = useCallback((belt: BeltRank) => {
    dispatch({ type: 'GENERATE_START', belt });
    // Generation in eigener Macrotask — verhindert UI-Block
    window.setTimeout(() => {
      const cfg = BELT_CONFIG[belt];
      const target = pickTargetClues(cfg.clues[0], cfg.clues[1]);
      const { puzzle, solution } = generatePuzzle(target);
      dispatch({ type: 'NEW_GAME', belt, puzzle, solution });
    }, 30);
  }, []);

  const selectCell = useCallback(
    (row: number, col: number) => dispatch({ type: 'SELECT_CELL', row, col }),
    [],
  );
  const setNumber = useCallback(
    (row: number, col: number, value: number) =>
      dispatch({ type: 'SET_NUMBER', row, col, value }),
    [],
  );
  const toggleNote = useCallback(
    (row: number, col: number, value: number) =>
      dispatch({ type: 'TOGGLE_NOTE', row, col, value }),
    [],
  );
  const clearCell = useCallback(() => dispatch({ type: 'CLEAR_CELL' }), []);
  const useHint = useCallback(() => dispatch({ type: 'USE_HINT' }), []);
  const checkErrors = useCallback(() => dispatch({ type: 'CHECK_ERRORS' }), []);
  const togglePause = useCallback(() => dispatch({ type: 'TOGGLE_PAUSE' }), []);
  const toggleNotesMode = useCallback(
    () => dispatch({ type: 'TOGGLE_NOTES_MODE' }),
    [],
  );

  const beltConfig = useMemo(
    () => BELT_CONFIG[state.currentBelt],
    [state.currentBelt],
  );

  return {
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
  };
}
