// Backtracking Sudoku-Generator + Uniqueness-Check (Constraint-Solver mit Limit 2)

export type Grid = number[][]; // 9x9, 0 = leer

const SIZE = 9;
const BOX = 3;

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function isValid(g: Grid, r: number, c: number, n: number): boolean {
  for (let i = 0; i < SIZE; i++) {
    if (g[r][i] === n) return false;
    if (g[i][c] === n) return false;
  }
  const br = Math.floor(r / BOX) * BOX;
  const bc = Math.floor(c / BOX) * BOX;
  for (let i = 0; i < BOX; i++) {
    for (let j = 0; j < BOX; j++) {
      if (g[br + i][bc + j] === n) return false;
    }
  }
  return true;
}

function fillSolved(g: Grid): boolean {
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (g[r][c] === 0) {
        const nums = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);
        for (const n of nums) {
          if (isValid(g, r, c, n)) {
            g[r][c] = n;
            if (fillSolved(g)) return true;
            g[r][c] = 0;
          }
        }
        return false;
      }
    }
  }
  return true;
}

export function generateSolvedGrid(): Grid {
  const g: Grid = Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
  fillSolved(g);
  return g;
}

// Zählt Lösungen bis zu `limit` (für Eindeutigkeits-Check reicht limit=2)
function countSolutions(g: Grid, limit: number): number {
  let count = 0;
  function solve(): boolean {
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        if (g[r][c] === 0) {
          for (let n = 1; n <= 9; n++) {
            if (isValid(g, r, c, n)) {
              g[r][c] = n;
              if (solve()) {
                g[r][c] = 0;
                return true; // limit reached → unwind
              }
              g[r][c] = 0;
            }
          }
          return false;
        }
      }
    }
    count++;
    return count >= limit;
  }
  solve();
  return count;
}

export function hasUniqueSolution(puzzle: Grid): boolean {
  const g = puzzle.map((r) => [...r]);
  return countSolutions(g, 2) === 1;
}

export function clueCount(g: Grid): number {
  let n = 0;
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (g[r][c] !== 0) n++;
    }
  }
  return n;
}

/**
 * Erzeugt ein Puzzle mit so wenig Hinweisen wie möglich, mindestens aber
 * `targetClues` (versucht Zellen symmetrisch in zufälliger Reihenfolge zu
 * entfernen, Eindeutigkeits-Check nach jedem Entfernen).
 */
export function generatePuzzle(targetClues: number): {
  puzzle: Grid;
  solution: Grid;
} {
  const solution = generateSolvedGrid();
  const puzzle = solution.map((r) => [...r]);

  const positions: Array<[number, number]> = [];
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) positions.push([r, c]);
  }
  const order = shuffle(positions);

  let clues = SIZE * SIZE;
  for (const [r, c] of order) {
    if (clues <= targetClues) break;
    if (puzzle[r][c] === 0) continue;
    const backup = puzzle[r][c];
    puzzle[r][c] = 0;
    if (!hasUniqueSolution(puzzle)) {
      puzzle[r][c] = backup;
    } else {
      clues--;
    }
  }

  return { puzzle, solution };
}

export function pickTargetClues(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}
