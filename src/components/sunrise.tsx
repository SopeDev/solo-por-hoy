import { useId } from "react";

/** Days of clean streak at which the sun has fully risen. */
export const FULL_SUNRISE_DAYS = 90;

const HORIZON = 104;
const SUN_X = 236;
const SUN_R = 26;
const GLOW_R = 58;
/** Where the sun's center sits: a sliver showing on day 0, almost all out by day 7, near the top by day 90. */
const SUN_Y_START = HORIZON + SUN_R - 8;
const SUN_Y_WEEK = HORIZON - SUN_R + 4;
const SUN_Y_FULL = SUN_R + 4;
const WEEK = 7;

/** The sun's height for a streak: quickly out over the first week, then a slower climb to the top. */
export function sunY(streak: number) {
  const days = Math.min(Math.max(streak, 0), FULL_SUNRISE_DAYS);
  if (days <= WEEK) return SUN_Y_START + (SUN_Y_WEEK - SUN_Y_START) * (days / WEEK);
  const rest = (days - WEEK) / (FULL_SUNRISE_DAYS - WEEK);
  // Eases out, so the days right after the first week still visibly move it.
  return SUN_Y_WEEK + (SUN_Y_FULL - SUN_Y_WEEK) * Math.sqrt(rest);
}

/**
 * The app's sunrise, drawn for the person's streak, with the streak beside it: the sun starts as a sliver over the
 * horizon, is almost all out after a week, and keeps climbing until it's near the top at 90 days. A relapse sets it
 * again.
 */
export function Sunrise({ streak }: { streak: number }) {
  const id = useId();
  const progress = Math.min(streak, FULL_SUNRISE_DAYS) / FULL_SUNRISE_DAYS;
  const y = sunY(streak);
  const label = progress === 1 ? "Tu sol ya salió por completo." : `Tu sol va saliendo: ${streak} de ${FULL_SUNRISE_DAYS} días.`;

  return (
    <div className="relative">
      {/* The glow may spill softly above the drawing near the top. */}
      <svg aria-label={label} className="block h-auto w-full overflow-visible" role="img" viewBox="0 0 320 128">
        <defs>
          <radialGradient id={`${id}-glow`}>
            <stop offset="0.4" stopColor="var(--dawn)" stopOpacity={0.15 + progress * 0.25} />
            <stop offset="1" stopColor="var(--dawn)" stopOpacity="0" />
          </radialGradient>
          <clipPath id={`${id}-above`}>
            <rect height={HORIZON + GLOW_R} width="320" y={-GLOW_R} />
          </clipPath>
        </defs>
        <g clipPath={`url(#${id}-above)`}>
          <circle cx={SUN_X} cy={y} fill={`url(#${id}-glow)`} r={GLOW_R} />
          <circle cx={SUN_X} cy={y} fill="var(--dawn)" r={SUN_R} />
        </g>
        <rect fill="var(--dawn)" height="5" opacity=".55" rx="2.5" width="300" x="10" y={HORIZON + 4} />
        <rect fill="var(--dawn)" height="5" opacity=".3" rx="2.5" width="200" x="60" y={HORIZON + 15} />
      </svg>
      <p className="absolute top-4 left-0">
        {streak > 0 ? (
          <>
            <span className="block font-display text-4xl leading-none">{streak}</span>
            <span className="mt-1 block text-sm text-muted-foreground">{streak === 1 ? "día limpio" : "días limpios"}</span>
          </>
        ) : (
          <span className="block max-w-36 text-sm text-muted-foreground">Hoy empieza tu racha.</span>
        )}
      </p>
    </div>
  );
}
