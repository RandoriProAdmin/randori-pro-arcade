interface Props {
  remaining: number | null; // Sekunden
  total: number | null;
}

function formatTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

export default function BreathTimer({ remaining, total }: Props) {
  if (remaining === null || total === null) {
    return (
      <div className="flex flex-col items-center gap-2">
        <div
          className="relative flex items-center justify-center"
          style={{ width: '120px', height: '120px' }}
        >
          <svg width="120" height="120" viewBox="0 0 120 120">
            <circle
              cx="60"
              cy="60"
              r="52"
              fill="none"
              stroke="rgba(212, 201, 181, 0.15)"
              strokeWidth="2"
            />
            <circle
              cx="60"
              cy="60"
              r="52"
              fill="none"
              stroke="#d4c9b5"
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray="326.7"
              strokeDashoffset="0"
              transform="rotate(-90 60 60)"
              opacity="0.5"
            />
          </svg>
          <span className="absolute rp-mono text-rp-text-secondary text-sm">
            ∞
          </span>
        </div>
        <p className="text-[11px] uppercase tracking-rp-tight text-rp-text-muted text-center">
          Unbegrenzte Zeit
        </p>
      </div>
    );
  }

  const ratio = Math.max(0, Math.min(1, remaining / total));
  const circumference = 2 * Math.PI * 52; // r=52
  const dashOffset = circumference * (1 - ratio);

  let strokeColor = '#d4c9b5';
  let label = 'Atem kontrollieren';
  let pulse = false;
  if (ratio < 0.25) {
    strokeColor = '#dc0d1d';
    label = 'Letzte Chance';
    pulse = true;
  } else if (ratio < 0.5) {
    strokeColor = '#aa1a1d';
    label = 'Fokus halten';
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className={`relative flex items-center justify-center ${
          pulse ? 'rp-pulse-glow' : ''
        }`}
        style={{ width: '120px', height: '120px' }}
      >
        <svg width="120" height="120" viewBox="0 0 120 120">
          <circle
            cx="60"
            cy="60"
            r="52"
            fill="none"
            stroke="rgba(212, 201, 181, 0.15)"
            strokeWidth="2"
          />
          <circle
            cx="60"
            cy="60"
            r="52"
            fill="none"
            stroke={strokeColor}
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            transform="rotate(-90 60 60)"
            style={{ transition: 'stroke-dashoffset 0.6s linear, stroke 0.4s ease' }}
          />
        </svg>
        <span
          className="absolute rp-mono font-semibold"
          style={{ color: strokeColor, fontSize: '20px' }}
        >
          {formatTime(remaining)}
        </span>
      </div>
      <p className="text-[11px] uppercase tracking-rp-tight text-rp-text-muted text-center">
        {label}
      </p>
    </div>
  );
}
