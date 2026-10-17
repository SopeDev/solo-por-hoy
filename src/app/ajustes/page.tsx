import type { Metadata } from "next";
import { signOut } from "@/auth";
import { correctCheckIn, leaveGroup, removeMember, renameGroup, resetInviteCode } from "@/app/actions/groups";
import { saveProfile } from "@/app/actions/profile";
import { AppShell, cardClass, inputClass } from "@/components/app-shell";
import { ConfirmSubmit } from "@/components/confirm-submit";
import { DeviceSetup } from "@/components/device-setup";
import { InviteLink } from "@/components/invite-link";
import { db } from "@/db/client";
import { requireUserId } from "@/lib/auth-user";
import { displayName } from "@/lib/check-ins";
import { cn } from "@/lib/cn";
import { addDays, checkInDay, formatDay } from "@/lib/days";
import { getAppTimeZone, getVapidPublicKey } from "@/lib/env";
import { CORRECTION_DAYS, getGroupMembers, getMembership } from "@/lib/queries";

export const metadata: Metadata = { title: "Ajustes · Solo por hoy" };

const linkButtonClass = "text-sm text-muted-foreground underline underline-offset-4";
const secondaryButtonClass = "min-h-11 rounded-xl border border-border px-4 text-sm font-medium transition hover:bg-white/5";

export default async function SettingsPage({ searchParams }: PageProps<"/ajustes">) {
  const userId = await requireUserId("/ajustes");
  const { correccion } = await searchParams;
  const [user, membership] = await Promise.all([
    db.user.findUniqueOrThrow({ where: { id: userId }, select: { name: true, email: true, nickname: true, why: true } }),
    getMembership(userId),
  ]);
  const members = membership ? await getGroupMembers(membership.groupId) : [];
  const isOwner = membership?.group.createdById === userId;
  const today = checkInDay(new Date(), getAppTimeZone());
  const correctableDays = Array.from({ length: CORRECTION_DAYS }, (_, index) => addDays(today, -(index + 1)));
  const othersFirst = [...members.filter((member) => member.id !== userId), ...members.filter((member) => member.id === userId)];

  async function signOutAction() {
    "use server";
    await signOut({ redirectTo: "/entrar" });
  }

  return (
    <AppShell back groupName={membership?.group.name}>
      <h2 className="mb-4 font-display text-2xl">Ajustes</h2>

      <section className={cardClass}>
        <h2 className="font-medium">Tú</h2>
        <form action={saveProfile} className="mt-4 grid gap-4">
          <div className="grid gap-1.5">
            <label className="text-sm text-muted-foreground" htmlFor="nickname">
              Cómo te ve tu grupo
            </label>
            <input className={inputClass} defaultValue={user.nickname ?? ""} id="nickname" maxLength={24} name="nickname" placeholder={displayName({ ...user, nickname: null })} />
          </div>
          <div className="grid gap-1.5">
            <label className="text-sm text-muted-foreground" htmlFor="why">
              Tu porqué
            </label>
            <textarea
              className="min-h-20 w-full rounded-xl border border-border bg-background px-4 py-3 text-base outline-none focus:border-primary"
              defaultValue={user.why ?? ""}
              id="why"
              maxLength={140}
              name="why"
              placeholder="Por mi hija. Para dormir en paz."
            />
            <p className="text-xs text-muted-foreground">Solo tú lo ves, cada noche, bajo la pregunta.</p>
          </div>
          <button className="min-h-12 rounded-xl bg-primary px-4 font-semibold text-primary-foreground transition hover:brightness-110" type="submit">
            Guardar
          </button>
        </form>
      </section>

      {membership ? (
        <section className={cn(cardClass, "mt-4")}>
          <h2 className="font-medium">Grupo</h2>
          {isOwner ? (
            <form action={renameGroup} className="mt-4 flex gap-2">
              <input aria-label="Nombre del grupo" className={inputClass} defaultValue={membership.group.name} maxLength={40} name="name" required />
              <button className={cn(secondaryButtonClass, "shrink-0")} type="submit">
                Cambiar
              </button>
            </form>
          ) : null}

          <ul className="mt-4 grid gap-2">
            {members.map((member) => (
              <li className="flex min-h-10 items-center justify-between gap-3" key={member.id}>
                <span className="truncate">
                  {member.id === userId ? "Tú" : member.name}
                  {member.id === membership.group.createdById ? <span className="ml-2 text-xs text-muted-foreground">creó el grupo</span> : null}
                </span>
                {isOwner && member.id !== userId ? (
                  <form action={removeMember.bind(null, member.id)}>
                    <ConfirmSubmit className={linkButtonClass} confirmLabel={`Sí, quitar a ${member.name}`} label="Quitar" />
                  </form>
                ) : null}
              </li>
            ))}
          </ul>

          <div className="mt-4 grid gap-3 border-t border-border pt-4">
            <InviteLink code={membership.group.inviteCode} groupName={membership.group.name} />
            {isOwner ? (
              <form action={resetInviteCode}>
                <ConfirmSubmit className={linkButtonClass} confirmLabel="Sí, crear uno nuevo" label="Crear un enlace nuevo (el anterior deja de servir)" />
              </form>
            ) : null}
            <form action={leaveGroup}>
              <ConfirmSubmit
                className={linkButtonClass}
                confirmLabel={members.length === 1 ? "Sí, salir y borrar el grupo" : "Sí, salir del grupo"}
                label="Salir del grupo"
              />
            </form>
          </div>
        </section>
      ) : null}

      {membership && isOwner ? (
        <section className={cn(cardClass, "mt-4")} id="corregir">
          <h2 className="font-medium">Corregir un día</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Si alguien olvidó responder o se equivocó, anota la respuesta que te dio. El grupo verá que fue corregida.
          </p>
          <form action={correctCheckIn} className="mt-4 grid gap-3">
            <select aria-label="Persona" className={inputClass} defaultValue={othersFirst[0]?.id} name="member">
              {othersFirst.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.id === userId ? "Tú" : member.name}
                </option>
              ))}
            </select>
            <select aria-label="Día" className={cn(inputClass, "capitalize")} defaultValue={correctableDays[0]} name="day">
              {correctableDays.map((day, index) => (
                <option key={day} value={day}>
                  {index === 0 ? `Ayer, ${formatDay(day)}` : formatDay(day)}
                </option>
              ))}
            </select>
            <div className="grid grid-cols-2 gap-2">
              <label className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-border px-3 has-checked:border-clean has-checked:bg-clean/10 has-checked:text-clean">
                <input className="sr-only" defaultChecked name="answer" type="radio" value="clean" />
                Se mantuvo
              </label>
              <label className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-border px-3 has-checked:border-relapse has-checked:bg-relapse/10 has-checked:text-relapse">
                <input className="sr-only" name="answer" type="radio" value="relapsed" />
                Recayó
              </label>
            </div>
            <button className={secondaryButtonClass} type="submit">
              Guardar corrección
            </button>
            {correccion === "ok" ? (
              <p className="text-sm text-clean" role="status">
                Listo, quedó anotado.
              </p>
            ) : correccion === "error" ? (
              <p className="text-sm text-relapse" role="status">
                No se pudo: ese día es de antes de que se uniera, o aún está abierto.
              </p>
            ) : null}
          </form>
        </section>
      ) : null}

      <DeviceSetup vapidPublicKey={getVapidPublicKey()} />

      <form action={signOutAction} className="mt-10 text-center">
        <button className={linkButtonClass} type="submit">
          Cerrar sesión
        </button>
      </form>
    </AppShell>
  );
}
