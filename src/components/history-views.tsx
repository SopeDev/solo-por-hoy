import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { cardClass } from "@/components/app-shell";
import { countStatuses, type CalendarStatus } from "@/lib/check-ins";
import { cn } from "@/lib/cn";
import { addDays, formatMonth, formatWeek, monthOf, monthWeeks, weekStart, type DayKey, type MonthKey } from "@/lib/days";

const WEEKDAYS = ["L", "M", "X", "J", "V", "S", "D"];

const DOT: Record<CalendarStatus, string> = {
  clean: "bg-clean",
  relapsed: "bg-relapse",
  silent: "border border-silent/70",
  hidden: "bg-foreground/40",
  before: "",
  future: "",
};

const LABEL: Record<CalendarStatus, string> = {
  clean: "Se mantuvo",
  relapsed: "Recayó",
  silent: "No respondió",
  hidden: "Ya respondió (se ve mañana)",
  before: "Aún no estaba",
  future: "",
};

/** A month as a calendar, with its counts and arrows to the months around it. */
export function MonthView({
  month,
  today,
  status,
  corrected,
  previous,
  next,
}: {
  month: MonthKey;
  today: DayKey;
  status: (day: DayKey) => CalendarStatus;
  corrected: ReadonlySet<DayKey>;
  previous: string | null;
  next: string | null;
}) {
  const weeks = monthWeeks(month);
  const inMonth = weeks.flat().filter((day) => monthOf(day) === month);
  const counts = countStatuses(inMonth.map(status));
  const arrowClass = "flex size-10 items-center justify-center rounded-full text-muted-foreground transition hover:bg-white/5 hover:text-foreground";

  return (
    <section className={cardClass}>
      <div className="flex items-center justify-between gap-2">
        {previous ? (
          <Link aria-label="Mes anterior" className={arrowClass} href={previous}>
            <ChevronLeft aria-hidden size={20} />
          </Link>
        ) : (
          <span className="size-10" />
        )}
        <h3 className="font-medium">{formatMonth(month)}</h3>
        {next ? (
          <Link aria-label="Mes siguiente" className={arrowClass} href={next}>
            <ChevronRight aria-hidden size={20} />
          </Link>
        ) : (
          <span className="size-10" />
        )}
      </div>

      <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
        {[
          { label: "limpios", value: counts.clean, className: "text-clean" },
          { label: "recaídas", value: counts.relapsed, className: "text-relapse" },
          { label: "sin respuesta", value: counts.silent, className: "text-muted-foreground" },
        ].map((stat) => (
          <div className="flex flex-col-reverse rounded-2xl bg-white/5 px-2 py-2.5" key={stat.label}>
            <dt className="text-xs text-muted-foreground">{stat.label}</dt>
            <dd className={cn("font-display text-2xl", stat.className)}>{stat.value}</dd>
          </div>
        ))}
      </dl>

      <table className="mt-4 w-full table-fixed text-center text-sm">
        <thead>
          <tr className="text-xs text-muted-foreground">
            {WEEKDAYS.map((weekday) => (
              <th className="pb-2 font-normal" key={weekday} scope="col">
                {weekday}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {weeks.map((week) => (
            <tr key={week[0]}>
              {week.map((day) => {
                const outside = monthOf(day) !== month;
                const dayStatus = status(day);
                const label = [LABEL[dayStatus], corrected.has(day) ? "corregido" : ""].filter(Boolean).join(", ");
                return (
                  <td className="py-1" key={day}>
                    <div
                      className={cn(
                        "mx-auto flex size-10 flex-col items-center justify-center gap-1 rounded-xl",
                        day === today && "ring-1 ring-primary",
                        outside && "opacity-30",
                      )}
                      title={label || undefined}
                    >
                      <span className={cn("text-xs leading-none", day === today ? "text-primary" : "text-muted-foreground")}>{Number(day.slice(8))}</span>
                      <span aria-label={label || undefined} className={cn("block size-3 rounded-full", DOT[dayStatus])} role={label ? "img" : undefined} />
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

/** Every week from the first day to this one, newest first: seven dots and how many were clean. */
export function WeeksView({ firstDay, today, status }: { firstDay: DayKey; today: DayKey; status: (day: DayKey) => CalendarStatus }) {
  const starts: DayKey[] = [];
  for (let start = weekStart(today); start >= weekStart(firstDay); start = addDays(start, -7)) starts.push(start);

  return (
    <section className={cardClass}>
      <div className="mb-2 grid grid-cols-[6.5rem_1fr_auto] items-center gap-3 text-xs text-muted-foreground">
        <span />
        <span className="grid grid-cols-7 text-center">
          {WEEKDAYS.map((weekday) => (
            <span key={weekday}>{weekday}</span>
          ))}
        </span>
        <span className="w-12 text-right">limpios</span>
      </div>
      <ul className="grid gap-3">
        {starts.map((start) => {
          const days = Array.from({ length: 7 }, (_, index) => addDays(start, index));
          const statuses = days.map(status);
          const counted = statuses.filter((value) => value === "clean" || value === "relapsed" || value === "silent").length;
          const clean = countStatuses(statuses).clean;
          return (
            <li className="grid grid-cols-[6.5rem_1fr_auto] items-center gap-3" key={start}>
              <span className="text-sm">{start === weekStart(today) ? "Esta semana" : formatWeek(start)}</span>
              <span className="grid grid-cols-7">
                {days.map((day, index) => (
                  <span
                    aria-label={LABEL[statuses[index]] || undefined}
                    className={cn("mx-auto block size-3.5 rounded-full", DOT[statuses[index]], day === today && statuses[index] === "future" && "border border-primary/60")}
                    key={day}
                    role={LABEL[statuses[index]] ? "img" : undefined}
                    title={LABEL[statuses[index]] || undefined}
                  />
                ))}
              </span>
              <span className="w-12 text-right text-sm text-muted-foreground">{counted > 0 ? `${clean}/${counted}` : "–"}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function Legend() {
  return (
    <p className="mt-4 flex flex-wrap gap-x-4 gap-y-1 px-1 text-xs text-muted-foreground">
      <span className="flex items-center gap-1.5">
        <span className="size-2.5 rounded-full bg-clean" /> Se mantuvo
      </span>
      <span className="flex items-center gap-1.5">
        <span className="size-2.5 rounded-full bg-relapse" /> Recayó
      </span>
      <span className="flex items-center gap-1.5">
        <span className="size-2.5 rounded-full border border-silent/70" /> Sin respuesta
      </span>
      <span className="flex items-center gap-1.5">
        <span className="size-2.5 rounded-full bg-foreground/40" /> Respondió hoy (se ve mañana)
      </span>
    </p>
  );
}
