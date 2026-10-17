import { createGroup, joinGroup } from "@/app/actions/groups";
import { AppShell, cardClass, inputClass } from "@/components/app-shell";
import { CheckInButtons } from "@/components/check-in-buttons";
import { DeviceSetup } from "@/components/device-setup";
import { GroupWeek } from "@/components/group-week";
import { InviteLink } from "@/components/invite-link";
import { NoteEditor } from "@/components/note-editor";
import { SignalButton, SosButton } from "@/components/support-buttons";
import { db } from "@/db/client";
import { requireUserId } from "@/lib/auth-user";
import { Sunrise } from "@/components/sunrise";
import { cleanRate, cleanStreak, groupStreak, longestStreak, statusOf, totalCleanDays } from "@/lib/check-ins";
import { cn } from "@/lib/cn";
import { addDays, checkInDay, daysEndingOn, formatDay } from "@/lib/days";
import { getAppTimeZone, getVapidPublicKey } from "@/lib/env";
import { getMembership, isNightlyPromptSent, isYesterdayOpen, loadGroupHome } from "@/lib/queries";

const HISTORY_DAYS = 7;

export default async function HomePage() {
  const userId = await requireUserId();
  const [membership, me] = await Promise.all([getMembership(userId), db.user.findUnique({ where: { id: userId }, select: { why: true } })]);

  if (!membership) {
    return (
      <AppShell>
        <section className={cardClass}>
          <h2 className="font-display text-2xl">Empieza con tu gente</h2>
          <p className="mt-2 text-muted-foreground">
            Cada noche respondes con honestidad. Cada mañana tu grupo sabe cómo vas, y tú sabes cómo van ellos.
          </p>
          <form action={createGroup} className="mt-5 grid gap-3">
            <label className="text-sm text-muted-foreground" htmlFor="group-name">
              Nombre del grupo
            </label>
            <input className={inputClass} defaultValue="Los de siempre" id="group-name" maxLength={40} name="name" required />
            <button className="min-h-12 rounded-xl bg-primary px-4 font-semibold text-primary-foreground transition hover:brightness-110" type="submit">
              Crear grupo
            </button>
          </form>
        </section>

        <section className={cn(cardClass, "mt-4")}>
          <h2 className="font-medium">¿Te invitaron?</h2>
          <p className="mt-1 text-sm text-muted-foreground">Abre el enlace que te mandaron, o escribe el código.</p>
          <form action={joinGroup} className="mt-4 flex gap-2">
            <input aria-label="Código de invitación" autoCapitalize="characters" className={inputClass} name="code" placeholder="Código" required />
            <button className="min-h-12 shrink-0 rounded-xl border border-border px-4 font-medium transition hover:bg-white/5" type="submit">
              Unirme
            </button>
          </form>
        </section>
      </AppShell>
    );
  }

  const today = checkInDay(new Date(), getAppTimeZone());
  const yesterday = addDays(today, -1);
  const [{ members, myAnswers }, yesterdayOpen, askedTonight] = await Promise.all([
    loadGroupHome(userId, membership.groupId, today),
    isYesterdayOpen(today),
    isNightlyPromptSent(today),
  ]);
  const self = members.find((member) => member.isMe)!;
  const streak = cleanStreak(myAnswers, today);
  const best = longestStreak(myAnswers);
  const rate = cleanRate(myAnswers, today);
  const total = totalCleanDays(myAnswers);
  const together = members.length > 1 ? groupStreak(members, yesterday) : 0;
  const others = members.filter((member) => !member.isMe);
  const yesterdayMembers = members.filter((member) => member.joinedDay <= yesterday);
  const missedYesterday = yesterdayOpen && self.joinedDay <= yesterday && !myAnswers.has(yesterday);
  // Reminders only once tonight's question has gone out; in the morning nobody is expected to have answered.
  const pendingToday = askedTonight ? others.filter((member) => !member.answers.has(today)) : [];

  return (
    <AppShell groupName={membership.group.name}>
      {missedYesterday ? (
        <section className={cn(cardClass, "mb-4 border-primary/40")}>
          <p className="text-sm capitalize text-muted-foreground">{formatDay(yesterday)}</p>
          <h2 className="mt-1 font-display text-2xl">¿Y ayer, te mantuviste?</h2>
          <p className="mt-1 text-sm text-muted-foreground">Se te pasó responder. Aún puedes, hasta que salga el reporte de la mañana.</p>
          <CheckInButtons answer={undefined} changeable={false} day={yesterday} />
        </section>
      ) : null}

      <section className={cardClass}>
        <p className="text-sm capitalize text-muted-foreground">{formatDay(today)}</p>
        <h2 className="mt-1 font-display text-3xl">¿Te mantuviste hoy?</h2>
        {me?.why ? <p className="mt-2 text-sm italic text-muted-foreground">“{me.why}”</p> : null}
        <CheckInButtons answer={myAnswers.get(today)} day={today} note={self.notes.today} />
        <div className="mt-5 border-t border-border pt-4">
          <Sunrise streak={streak} />
          {rate !== null ? (
            <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
              {[
                { label: "limpios en total", value: total },
                { label: "mejor racha", value: best },
                { label: "de días limpios", value: `${Math.round(rate * 100)}%` },
              ].map((stat) => (
                <div className="flex flex-col-reverse rounded-2xl bg-white/5 px-2 py-3" key={stat.label}>
                  <dt className="mt-0.5 text-xs leading-tight text-muted-foreground">{stat.label}</dt>
                  <dd className="font-display text-2xl">{stat.value}</dd>
                </div>
              ))}
            </dl>
          ) : null}
        </div>
      </section>

      {others.length > 0 ? (
        <section className="mt-4 rounded-3xl border border-border bg-surface px-5 py-3">
          <SosButton />
        </section>
      ) : null}

      {yesterdayMembers.length > 0 ? (
        <section className={cn(cardClass, "mt-4")}>
          <h2 className="font-medium">Ayer</h2>
          <ul className="mt-3 grid gap-3">
            {yesterdayMembers.map((member) => {
              const status = statusOf(member.answers.get(yesterday));
              return (
                <li key={member.id}>
                  <div className="flex items-center justify-between gap-3">
                    <span className="min-w-0 flex-1 truncate">{member.isMe ? "Tú" : member.name}</span>
                    {!member.isMe ? <SignalButton kind="cheer" sent={member.cheered} status={status} toName={member.name} toUserId={member.id} /> : null}
                    <span
                      className={cn(
                        "shrink-0 rounded-full px-3 py-1 text-sm",
                        status === "clean" && "bg-clean/15 text-clean",
                        status === "relapsed" && "bg-relapse/15 text-relapse",
                        status === "silent" && "bg-silent/15 text-muted-foreground",
                      )}
                    >
                      {{ clean: "Se mantuvo", relapsed: "Recayó", silent: "No respondió" }[status]}
                      {member.corrected.has(yesterday) ? <span className="ml-1 text-xs opacity-70">· corregido</span> : null}
                    </span>
                  </div>
                  {member.isMe && yesterdayOpen && status !== "silent" ? (
                    <NoteEditor day={yesterday} note={member.notes.yesterday} />
                  ) : member.notes.yesterday ? (
                    <p className="mt-1 text-sm text-muted-foreground">“{member.notes.yesterday}”</p>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      <section className={cn(cardClass, "mt-4")}>
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="font-medium">Esta semana</h2>
          {together > 0 ? (
            <p className="text-sm text-primary">
              🔥 {together} {together === 1 ? "día" : "días"} todos limpios
            </p>
          ) : null}
        </div>
        <div className="mt-2">
          <GroupWeek days={daysEndingOn(today, HISTORY_DAYS)} members={members} today={today} />
        </div>
        {pendingToday.length > 0 ? (
          <ul className="mt-4 grid gap-2 border-t border-border pt-4">
            {pendingToday.map((member) => (
              <li className="flex items-center justify-between gap-3 text-sm" key={member.id}>
                <span className="truncate text-muted-foreground">{member.name} aún no responde hoy</span>
                <SignalButton kind="nudge" sent={member.nudged} toName={member.name} toUserId={member.id} />
              </li>
            ))}
          </ul>
        ) : null}
        <div className="mt-4">
          <InviteLink code={membership.group.inviteCode} groupName={membership.group.name} />
        </div>
      </section>

      <DeviceSetup hideWhenReady vapidPublicKey={getVapidPublicKey()} />
    </AppShell>
  );
}
