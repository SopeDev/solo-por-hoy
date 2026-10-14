/** Days of clean streak at which the sun has fully risen. */
export const FULL_SUNRISE_DAYS = 90;

/**
 * The app's sunrise, drawn for the person's streak: the sun starts just under the horizon and climbs a little each
 * clean day until it's fully up at 90 days. A relapse sets it again.
 */
export function Sunrise({ streak }: { streak: number }) {
  const progress = Math.min(streak, FULL_SUNRISE_DAYS) / FULL_SUNRISE_DAYS;
  const horizon = 92;
  // From mostly hidden (a sliver at day 0) to well above the horizon.
  const sunY = horizon + 22 - progress * 70;
  const label = progress === 1 ? "Tu sol ya salió por completo." : `Tu sol va saliendo: ${streak} de ${FULL_SUNRISE_DAYS} días.`;

  return (
    <svg aria-label={label} className="block h-auto w-full" role="img" viewBox="0 0 320 120">
      <defs>
        <linearGradient id="sunrise-sky" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="var(--night)" />
          <stop offset="1" stopColor="var(--dawn)" stopOpacity={0.08 + progress * 0.37} />
        </linearGradient>
        <radialGradient id="sunrise-glow">
          <stop offset="0" stopColor="var(--dawn)" stopOpacity={0.15 + progress * 0.35} />
          <stop offset="1" stopColor="var(--dawn)" stopOpacity="0" />
        </radialGradient>
        <clipPath id="sunrise-above">
          <rect height={horizon} width="320" />
        </clipPath>
      </defs>
      <rect fill="url(#sunrise-sky)" height={horizon} rx="16" width="320" />
      <g clipPath="url(#sunrise-above)">
        <circle cx="160" cy={sunY} fill="url(#sunrise-glow)" r="80" />
        <circle cx="160" cy={sunY} fill="var(--dawn)" r="30" />
      </g>
      <rect fill="var(--dawn)" height="5" opacity=".55" rx="2.5" width="220" x="50" y={horizon + 4} />
      <rect fill="var(--dawn)" height="5" opacity=".3" rx="2.5" width="140" x="90" y={horizon + 15} />
    </svg>
  );
}
