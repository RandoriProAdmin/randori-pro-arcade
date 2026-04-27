import {
  BELT_HEX,
  BELT_LABELS,
  BELT_ORDER,
  type BeltRank,
} from './useSudokuGame';

interface Props {
  current: BeltRank;
  unlocked: BeltRank[];
  progress: Record<BeltRank, number>;
  onPick: (belt: BeltRank) => void;
}

function LockIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden>
      <path
        d="M3 5V3.5a2 2 0 0 1 4 0V5"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
      <rect
        x="2"
        y="5"
        width="6"
        height="4"
        rx="1"
        stroke="currentColor"
        strokeWidth="1.2"
      />
    </svg>
  );
}

export default function BeltProgress({
  current,
  unlocked,
  progress,
  onPick,
}: Props) {
  return (
    <div
      className="rp-panel p-3 sm:p-4"
      role="tablist"
      aria-label="Gürtel auswählen"
    >
      <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
        {BELT_ORDER.map((belt) => {
          const isUnlocked = unlocked.includes(belt);
          const isCurrent = belt === current;
          const hex = BELT_HEX[belt];
          return (
            <button
              key={belt}
              onClick={() => isUnlocked && onPick(belt)}
              disabled={!isUnlocked}
              role="tab"
              aria-selected={isCurrent}
              className={`relative flex flex-col items-center gap-1 p-1.5 sm:p-2 rounded-rp-sm transition-all duration-rp ${
                isUnlocked ? 'cursor-pointer hover:bg-white/5' : 'cursor-not-allowed'
              }`}
              style={{
                background: isCurrent ? 'rgba(220, 13, 29, 0.08)' : undefined,
                border: isCurrent
                  ? '1px solid rgba(220, 13, 29, 0.4)'
                  : '1px solid transparent',
              }}
              title={
                isUnlocked
                  ? BELT_LABELS[belt]
                  : `${BELT_LABELS[belt]} (gesperrt)`
              }
            >
              <span
                className={`block w-full h-2 rounded-full transition-all duration-rp ${
                  isCurrent && isUnlocked ? 'rp-pulse-glow' : ''
                }`}
                style={{
                  background: hex,
                  border: belt === 'black' ? '1px solid #d4c9b5' : 'none',
                  opacity: isUnlocked ? 1 : 0.25,
                  boxShadow:
                    isUnlocked && isCurrent ? `0 0 12px ${hex}80` : 'none',
                }}
              />
              <span
                className={`text-[9px] sm:text-[10px] uppercase tracking-rp-tight font-semibold flex items-center gap-1 ${
                  isUnlocked ? 'text-rp-text-secondary' : 'text-rp-text-muted'
                }`}
              >
                {!isUnlocked && <LockIcon />}
                <span className="hidden sm:inline">
                  {belt.charAt(0).toUpperCase() + belt.slice(1)}
                </span>
                <span className="sm:hidden">{belt.charAt(0).toUpperCase()}</span>
              </span>
              {isUnlocked && (
                <span className="text-[9px] rp-mono text-rp-text-muted">
                  {Math.min(progress[belt], 3)}/3
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
