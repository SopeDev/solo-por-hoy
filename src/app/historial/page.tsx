import type { Metadata } from "next";
import Link from "next/link";
import { AppShell, cardClass } from "@/components/app-shell";
import { Legend, MonthView, WeeksView } from "@/components/history-views";
import { requireUserId } from "@/lib/auth-user";
import { calendarStatus } from "@/lib/check-ins";
import { cn } from "@/lib/cn";
import { addMonths, checkInDay, isMonthKey, monthOf, type DayKey, type MonthKey } from "@/lib/days";
import { getAppTimeZone } from "@/lib/env";
import { getMembership, loadHistory } from "@/lib/queries";

export const metadata: Metadata = { title: "Historial · Solo por hoy" };

type View = "mes" | "semanas";

/** Someone's whole history, by month (a calendar) or by week (a list). */
export default async function HistoryPage({ searchParams }: PageProps<"/historial">) {
  const userId = await requireUserId("/historial");
  const params = await searchParams;
  const membership = await getMembership(userId);
  const today = checkInDay(new Date(), getAppTimeZone());

  if (!membership) {
    return (
      <AppShell back>
        <section className={cardClass}>
          <p className="text-muted-foreground">Únete a un grupo para empezar tu historial.</p>
        </section>
      </AppShell>
    );
  }

  const personId = typeof params.persona === "string" ? params.persona : undefined;
  const { people, person, answers, corrected } = await loadHistory(userId, membership.groupId, personId);
  const view: View = params.vista === "semanas" ? "semanas" : "mes";

  if (!person) {
    return (
      <AppShell back groupName={membership.group.name}>
        <h2 className="mb-4 font-display text-2xl">Historial</h2>
        <section className={cardClass}>
          <p className="text-muted-foreground">Aún no hay nadie haciendo el reto en tu grupo.</p>
        </section>
      </AppShell>
    );
  }

  const firstAnswer = [...answers.keys()].sort()[0];
  const firstDay = firstAnswer && firstAnswer < person.startDay ? firstAnswer : person.startDay;
  const firstMonth = monthOf(firstDay);
  const currentMonth = monthOf(today);
  const requested = isMonthKey(params.mes) ? params.mes : currentMonth;
  const month = requested < firstMonth ? firstMonth : requested > currentMonth ? currentMonth : requested;
  const status = (day: DayKey) => calendarStatus(day, { answers, startDay: person.startDay, isMe: person.isMe }, today);
  const href = (changes: { persona?: string; vista?: View; mes?: MonthKey }) => {
    const query = new URLSearchParams({ persona: changes.persona ?? person.id, vista: changes.vista ?? view, mes: changes.mes ?? month });
    return `/historial?${query}`;
  };

  return (
    <AppShell back groupName={membership.group.name}>
      <h2 className="mb-4 font-display text-2xl">Historial</h2>

      {people.length > 1 ? (
        <nav aria-label="Persona" className="mb-3 flex flex-wrap gap-2">
          {people.map((candidate) => (
            <Link
              aria-current={candidate.id === person.id ? "page" : undefined}
              className={cn(
                "rounded-full border px-3 py-1.5 text-sm transition",
                candidate.id === person.id ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground hover:bg-white/5",
              )}
              href={href({ persona: candidate.id, mes: currentMonth })}
              key={candidate.id}
            >
              {candidate.name}
            </Link>
          ))}
        </nav>
      ) : null}

      <nav aria-label="Vista" className="mb-4 grid grid-cols-2 gap-1 rounded-full border border-border p-1 text-sm">
        {(["mes", "semanas"] as const).map((option) => (
          <Link
            aria-current={option === view ? "page" : undefined}
            className={cn("rounded-full py-1.5 text-center transition", option === view ? "bg-surface text-foreground" : "text-muted-foreground")}
            href={href({ vista: option })}
            key={option}
          >
            {option === "mes" ? "Por mes" : "Por semana"}
          </Link>
        ))}
      </nav>

      {view === "mes" ? (
        <MonthView
          corrected={corrected}
          month={month}
          next={month < currentMonth ? href({ mes: addMonths(month, 1) }) : null}
          previous={month > firstMonth ? href({ mes: addMonths(month, -1) }) : null}
          status={status}
          today={today}
        />
      ) : (
        <WeeksView firstDay={firstDay} status={status} today={today} />
      )}

      <Legend />
    </AppShell>
  );
}
