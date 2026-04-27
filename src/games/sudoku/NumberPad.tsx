interface Props {
  counts: Record<number, number>; // wie oft jede Zahl bereits gesetzt ist
  notesMode: boolean;
  onPick: (n: number) => void;
  onClear: () => void;
  onToggleNotes: () => void;
  onHint: () => void;
  hintsRemaining: number;
  errorMode: 'realtime' | 'onleave' | 'manual' | 'none';
  onCheck?: () => void;
  disabled: boolean;
}

export default function NumberPad({
  counts,
  notesMode,
  onPick,
  onClear,
  onToggleNotes,
  onHint,
  hintsRemaining,
  errorMode,
  onCheck,
  disabled,
}: Props) {
  return (
    <div className="flex flex-col gap-3 w-full max-w-[300px]">
      <div className="grid grid-cols-3 gap-2">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => {
          const complete = (counts[n] ?? 0) >= 9;
          const dis = complete || disabled;
          return (
            <button
              key={n}
              onClick={() => onPick(n)}
              disabled={dis}
              className={`h-12 rounded-rp-sm border rp-mono text-lg font-semibold transition-all duration-rp ${
                dis
                  ? 'bg-[rgba(212,201,181,0.04)] border-[rgba(212,201,181,0.08)] text-rp-text-muted cursor-not-allowed'
                  : 'bg-[#1e1e1e] border-[rgba(212,201,181,0.15)] text-white hover:border-[rgba(220,13,29,0.4)] active:bg-[rgba(220,13,29,0.15)] active:border-rp-rot active:scale-95'
              }`}
              aria-label={`Zahl ${n}`}
            >
              {n}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={onClear}
          disabled={disabled}
          className="h-11 rounded-rp-sm border border-[rgba(212,201,181,0.15)] bg-[#1e1e1e] text-rp-text-secondary hover:text-white hover:border-[rgba(212,201,181,0.4)] active:scale-95 transition-all duration-rp text-sm font-semibold uppercase tracking-rp-tight disabled:opacity-50"
          aria-label="Zelle löschen"
        >
          ✕ Löschen
        </button>
        <button
          onClick={onToggleNotes}
          disabled={disabled}
          className={`h-11 rounded-rp-sm border text-sm font-semibold uppercase tracking-rp-tight transition-all duration-rp active:scale-95 disabled:opacity-50 ${
            notesMode
              ? 'bg-[rgba(220,13,29,0.15)] border-rp-rot text-rp-rot'
              : 'border-[rgba(212,201,181,0.15)] bg-[#1e1e1e] text-rp-text-secondary hover:text-white hover:border-[rgba(212,201,181,0.4)]'
          }`}
          aria-label="Notizen-Modus"
          aria-pressed={notesMode}
        >
          ✎ Notizen
        </button>
      </div>

      <div className="flex flex-col gap-2">
        <button
          onClick={onHint}
          disabled={disabled || hintsRemaining <= 0}
          className="h-11 rounded-rp-sm border border-[rgba(212,201,181,0.15)] bg-[#1e1e1e] text-rp-beige hover:border-[rgba(220,13,29,0.4)] hover:text-rp-rot active:scale-95 transition-all duration-rp text-sm font-semibold uppercase tracking-rp-tight disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          aria-label="Sensei-Tipp verwenden"
        >
          <span>Sensei-Tipp</span>
          <span className="rp-mono text-xs text-rp-text-muted">
            {hintsRemaining > 90 ? '∞' : hintsRemaining}
          </span>
        </button>

        {errorMode === 'manual' && onCheck && (
          <button
            onClick={onCheck}
            disabled={disabled}
            className="h-11 rounded-rp-sm border border-[rgba(212,201,181,0.15)] bg-[#1e1e1e] text-rp-text-secondary hover:text-white hover:border-[rgba(220,13,29,0.4)] active:scale-95 transition-all duration-rp text-sm font-semibold uppercase tracking-rp-tight disabled:opacity-50"
          >
            Prüfen
          </button>
        )}
      </div>
    </div>
  );
}
