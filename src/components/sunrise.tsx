import { useId } from "react";

/** Days of clean streak at which the sun has fully risen. */
export const FULL_SUNRISE_DAYS = 90;

const HORIZON = 104;
const SUN_X = 236;
const SUN_R = 26;
const GLOW_R = 58;

/**
 * The app's sunrise, drawn for the person's streak, with the streak beside it: the sun starts as a sliver over the
 * horizon and climbs a little each clean day until it's fully up at 90 days. A relapse sets it again.
 */
export function Sunrise({ streak }: { streak: number }) {
  const id = useId();
  const progress = Math.min(streak, FULL_SUNRISE_DAYS) / FULL_SUNRISE_DAYS;
  // From a sliver above the horizon to clear of it; it climbs faster in the first days so they show.
  const sunY = HORIZON + SUN_R - 8 - Math.sqrt(progress) * 64;
  const label = progress === 1 ? "Tu sol ya salió por completo." : `Tu sol va saliendo: ${streak} de ${FULL_SUNRISE_DAYS} días.`;

  return (
    <div className="relative">
      <svg aria-label={label} className="block h-auto w-full" role="img" viewBox="0 0 320 128">
        <defs>
          <radialGradient id={`${id}-glow`}>
            <stop offset="0.4" stopColor="var(--dawn)" stopOpacity={0.15 + progress * 0.25} />
            <stop offset="1" stopColor="var(--dawn)" stopOpacity="0" />
          </radialGradient>
          <clipPath id={`${id}-above`}>
            <rect height={HORIZON} width="320" />
          </clipPath>
        </defs>
        <g clipPath={`url(#${id}-above)`}>
          <circle cx={SUN_X} cy={sunY} fill={`url(#${id}-glow)`} r={GLOW_R} />
          <circle cx={SUN_X} cy={sunY} fill="var(--dawn)" r={SUN_R} />
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
