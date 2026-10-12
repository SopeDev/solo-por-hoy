import { signOut } from "@/auth";
import { createGroup, joinGroup } from "@/app/actions/groups";
import { CheckInButtons } from "@/components/check-in-buttons";
import { DeviceSetup } from "@/components/device-setup";
import { GroupWeek } from "@/components/group-week";
import { InviteLink } from "@/components/invite-link";
import { requireUserId } from "@/lib/auth-user";
import { cleanStreak, statusOf } from "@/lib/check-ins";
import { cn } from "@/lib/cn";
import { addDays, checkInDay, daysEndingOn, formatDay } from "@/lib/days";
import { getAppTimeZone, getVapidPublicKey } from "@/lib/env";
import { getMembership, loadGroupHome } from "@/lib/queries";

const HISTORY_DAYS = 7;

const inputClass = "min-h-12 w-full rounded-xl border border-border bg-background px-4 text-base outline-none focus:border-primary";
const cardClass = "rounded-3xl border border-border bg-surface p-5";

export default async function HomePage() {
  const userId = await requireUserId();
  const membership = await getMembership(userId);

  async function signOutAction() {
    "use server";
    await signOut({ redirectTo: "/entrar" });
  }

  const footer = (
    <form action={signOutAction} className="mt-10 text-center">
      <button className="text-sm text-muted-foreground underline underline-offset-4" type="submit">
        Cerrar sesión
      </button>
    </form>
  );

  if (!membership) {
    return (
      <Shell>
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
        {footer}
      </Shell>
    );
  }

  const today = checkInDay(new Date(), getAppTimeZone());
  const yesterday = addDays(today, -1);
  const { members, myAnswers } = await loadGroupHome(userId, membership.groupId, today, HISTORY_DAYS);
  const streak = cleanStreak(myAnswers, today);
  const yesterdayMembers = members.filter((member) => member.joinedDay <= yesterday);

  return (
    <Shell groupName={membership.group.name}>
      <section className={cardClass}>
        <p className="text-sm capitalize text-muted-foreground">{formatDay(today)}</p>
        <h2 className="mt-1 font-display text-3xl">¿Recaíste hoy?</h2>
        <CheckInButtons answer={myAnswers.get(today)} />
        <p className="mt-5 border-t border-border pt-4 text-sm text-muted-foreground">
          {streak > 0 ? (
            <>
              Racha: <span className="font-semibold text-foreground">{streak} {streak === 1 ? "día" : "días"}</span> limpio
            </>
          ) : (
            "Hoy empieza tu racha."
          )}
        </p>
      </section>

      {yesterdayMembers.length > 0 ? (
        <section className={cn(cardClass, "mt-4")}>
          <h2 className="font-medium">Ayer</h2>
          <ul className="mt-3 grid gap-2">
            {yesterdayMembers.map((member) => {
              const status = statusOf(member.answers.get(yesterday));
              return (
                <li className="flex items-center justify-between gap-3" key={member.id}>
                  <span className="truncate">{member.isMe ? "Tú" : member.name}</span>
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-3 py-1 text-sm",
                      status === "clean" && "bg-clean/15 text-clean",
                      status === "relapsed" && "bg-relapse/15 text-relapse",
                      status === "silent" && "bg-silent/15 text-muted-foreground",
                    )}
                  >
                    {{ clean: "Se mantuvo", relapsed: "Recayó", silent: "No respondió" }[status]}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      <section className={cn(cardClass, "mt-4")}>
        <h2 className="font-medium">Esta semana</h2>
        <div className="mt-2">
          <GroupWeek days={daysEndingOn(today, HISTORY_DAYS)} members={members} today={today} />
        </div>
        <div className="mt-4">
          <InviteLink code={membership.group.inviteCode} groupName={membership.group.name} />
        </div>
      </section>

      <section className={cn(cardClass, "mt-4")}>
        <h2 className="font-medium">Este dispositivo</h2>
        <p className="mt-1 mb-4 text-sm text-muted-foreground">Te preguntamos cada noche y te contamos cómo le fue al grupo cada mañana.</p>
        <DeviceSetup vapidPublicKey={getVapidPublicKey()} />
      </section>
      {footer}
    </Shell>
  );
}

function Shell({ children, groupName }: { children: React.ReactNode; groupName?: string }) {
  return (
    <main className="mx-auto w-full max-w-md px-4 pt-[max(1.5rem,env(safe-area-inset-top))] pb-[max(2rem,env(safe-area-inset-bottom))]">
      <header className="mb-6 flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element -- a tiny static SVG needs no optimization */}
        <img alt="" className="size-9" src="/icons/icon-source.svg" />
        <div className="min-w-0">
          <h1 className="font-display text-xl leading-tight">Solo por hoy</h1>
          {groupName ? <p className="truncate text-sm text-muted-foreground">{groupName}</p> : null}
        </div>
      </header>
      {children}
    </main>
  );
}
