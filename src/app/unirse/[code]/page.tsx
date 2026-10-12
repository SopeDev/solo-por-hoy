import Link from "next/link";
import { redirect } from "next/navigation";
import { joinGroup } from "@/app/actions/groups";
import { db } from "@/db/client";
import { requireUserId } from "@/lib/auth-user";
import { displayName, joinNames } from "@/lib/check-ins";
import { getMembership } from "@/lib/queries";

export default async function JoinPage({ params }: PageProps<"/unirse/[code]">) {
  const code = (await params).code.toUpperCase();
  const userId = await requireUserId(`/unirse/${code}`);

  const [group, current] = await Promise.all([
    db.group.findUnique({
      where: { inviteCode: code },
      include: { memberships: { include: { user: { select: { name: true, email: true } } }, orderBy: { joinedAt: "asc" } } },
    }),
    getMembership(userId),
  ]);
  if (group && current?.groupId === group.id) redirect("/");

  return (
    <main className="flex min-h-svh flex-col items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm rounded-3xl border border-border bg-surface p-6 text-center">
        {group ? (
          <>
            <p className="text-sm text-muted-foreground">Te invitaron a</p>
            <h1 className="mt-1 font-display text-3xl">{group.name}</h1>
            <p className="mt-3 text-muted-foreground">Con {joinNames(group.memberships.map((membership) => displayName(membership.user)))}.</p>
            {current ? <p className="mt-4 text-sm text-muted-foreground">Saldrás de “{current.group.name}”.</p> : null}
            <form action={joinGroup} className="mt-6">
              <input name="code" type="hidden" value={code} />
              <button className="min-h-12 w-full rounded-xl bg-primary px-4 font-semibold text-primary-foreground transition hover:brightness-110" type="submit">
                Unirme
              </button>
            </form>
          </>
        ) : (
          <>
            <h1 className="font-display text-2xl">Esa invitación no existe</h1>
            <p className="mt-3 text-muted-foreground">Revisa el enlace o pide uno nuevo.</p>
          </>
        )}
        <Link className="mt-6 inline-block text-sm text-muted-foreground underline underline-offset-4" href="/">
          Ir al inicio
        </Link>
      </div>
    </main>
  );
}
