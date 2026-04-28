import { memo } from 'react';
import type { Grid } from './sudokuGenerator';

interface CellProps {
  row: number;
  col: number;
  value: number;
  isGiven: boolean;
  isError: boolean;
  isSelected: boolean;
  isInUnit: boolean;
  isSameNumber: boolean;
  notes: number[];
  onClick: (row: number, col: number) => void;
  paused: boolean;
}

const SudokuCell = memo(function SudokuCell(props: CellProps) {
  const {
    row,
    col,
    value,
    isGiven,
    isError,
    isSelected,
    isInUnit,
    isSameNumber,
    notes,
    onClick,
    paused,
  } = props;

  const thickRight = (col + 1) % 3 === 0 && col !== 8;
  const thickBottom = (row + 1) % 3 === 0 && row !== 8;

  // Tatami: alternierende Box-Hintergründe als zwei Grautöne
  const boxParity = (Math.floor(row / 3) + Math.floor(col / 3)) % 2;
  const baseBg = boxParity === 0 ? '#5a6166' : '#525a5f';

  // Highlights als Layer über dem Tatami-Grund
  let overlay: string | null = null;
  if (isSelected) overlay = 'rgba(220, 13, 29, 0.18)';
  else if (isSameNumber && !isSelected && value !== 0)
    overlay = 'rgba(220, 13, 29, 0.10)';
  else if (isInUnit) overlay = 'rgba(255, 255, 255, 0.05)';

  const bg = overlay
    ? `linear-gradient(${overlay}, ${overlay}), ${baseBg}`
    : baseBg;

  const textColor = isError
    ? '#dc0d1d'
    : isGiven
      ? '#d4c9b5'
      : '#ffffff';

  return (
    <button
      type="button"
      onClick={() => onClick(row, col)}
      className="relative flex items-center justify-center font-semibold rp-mono select-none transition-colors duration-150"
      style={{
        background: bg,
        color: textColor,
        fontSize: 'clamp(16px, 4vw, 22px)',
        fontWeight: isGiven ? 700 : 500,
        textShadow: isError ? '0 0 8px rgba(220, 13, 29, 0.4)' : undefined,
        borderRight: thickRight
          ? '1.5px solid rgba(212, 201, 181, 0.30)'
          : '1px solid rgba(212, 201, 181, 0.12)',
        borderBottom: thickBottom
          ? '1.5px solid rgba(212, 201, 181, 0.30)'
          : '1px solid rgba(212, 201, 181, 0.12)',
        outline: isSelected ? '2px solid #dc0d1d' : 'none',
        outlineOffset: '-2px',
        zIndex: isSelected ? 1 : 0,
      }}
      aria-label={`Zelle ${row + 1}, ${col + 1}${value ? `: ${value}` : ''}`}
    >
      {paused ? null : value !== 0 ? (
        value
      ) : notes.length > 0 ? (
        <div
          className="grid grid-cols-3 grid-rows-3 w-full h-full"
          style={{ fontSize: '9px', lineHeight: '1', padding: '2px' }}
        >
          {Array.from({ length: 9 }).map((_, i) => (
            <span
              key={i}
              className="flex items-center justify-center text-rp-grau font-medium"
            >
              {notes.includes(i + 1) ? i + 1 : ''}
            </span>
          ))}
        </div>
      ) : null}
    </button>
  );
});

interface Props {
  puzzle: Grid;
  userInput: Grid;
  solution: Grid;
  notes: number[][][];
  selectedCell: [number, number] | null;
  errorCells: boolean[][];
  paused: boolean;
  onSelectCell: (row: number, col: number) => void;
}

function isInUnit(
  r1: number,
  c1: number,
  r2: number,
  c2: number,
): boolean {
  if (r1 === r2 || c1 === c2) return true;
  return Math.floor(r1 / 3) === Math.floor(r2 / 3) &&
    Math.floor(c1 / 3) === Math.floor(c2 / 3);
}

export default function SudokuGrid(props: Props) {
  const {
    puzzle,
    userInput,
    notes,
    selectedCell,
    errorCells,
    paused,
    onSelectCell,
  } = props;

  const selectedValue =
    selectedCell !== null
      ? puzzle[selectedCell[0]][selectedCell[1]] || userInput[selectedCell[0]][selectedCell[1]]
      : 0;

  return (
    <div
      className="relative grid grid-cols-9 grid-rows-9 aspect-square w-full bg-[#474e52] border border-[rgba(107,58,42,0.35)] rounded-rp-md overflow-hidden"
      role="grid"
      aria-label="Sudoku-Grid"
    >
      {/* Enso-Kreis im Hintergrund (heller auf dem grauen Tatami) */}
      <svg
        viewBox="0 0 100 100"
        className="absolute inset-0 w-full h-full pointer-events-none"
        aria-hidden
      >
        <path
          d="M 50 10 A 40 40 0 1 1 30 14"
          fill="none"
          stroke="rgba(220, 13, 29, 0.09)"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      </svg>

      {Array.from({ length: 9 }).flatMap((_, r) =>
        Array.from({ length: 9 }).map((_, c) => {
          const value = puzzle[r][c] !== 0 ? puzzle[r][c] : userInput[r][c];
          const isGiven = puzzle[r][c] !== 0;
          const isSelected =
            selectedCell !== null && selectedCell[0] === r && selectedCell[1] === c;
          const inUnit =
            selectedCell !== null
              ? isInUnit(selectedCell[0], selectedCell[1], r, c)
              : false;
          const isSame =
            selectedValue !== 0 && value === selectedValue && !isSelected;
          return (
            <SudokuCell
              key={`${r}-${c}`}
              row={r}
              col={c}
              value={value}
              isGiven={isGiven}
              isError={errorCells[r][c]}
              isSelected={isSelected}
              isInUnit={inUnit && !isSelected}
              isSameNumber={isSame}
              notes={notes[r][c]}
              onClick={onSelectCell}
              paused={paused}
            />
          );
        }),
      )}
    </div>
  );
}
