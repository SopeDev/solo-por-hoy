import { redirect } from "next/navigation";
import { signIn } from "@/auth";
import { getCurrentUserId } from "@/lib/auth-user";

/** Only paths inside the app, so a crafted link can't send someone elsewhere after signing in. */
function safeNext(value: string | string[] | undefined) {
  return typeof value === "string" && value.startsWith("/") && !value.startsWith("//") ? value : "/";
}

export default async function SignInPage({ searchParams }: PageProps<"/entrar">) {
  const { error, next } = await searchParams;
  const redirectTo = safeNext(next);
  if (await getCurrentUserId()) redirect(redirectTo);

  async function signInWithGoogle() {
    "use server";
    await signIn("google", { redirectTo });
  }

  return (
    <main className="flex min-h-svh flex-col items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm text-center">
        {/* eslint-disable-next-line @next/next/no-img-element -- a static SVG needs no optimization */}
        <img alt="" className="mx-auto size-24" src="/icons/icon-source.svg" />
        <h1 className="mt-8 font-display text-4xl">Solo por hoy</h1>
        <p className="mt-3 text-muted-foreground">Cada noche, una pregunta. Cada mañana, tu grupo sabe cómo les fue.</p>

        {error ? (
          <p className="mt-6 rounded-xl border border-relapse/40 bg-relapse/10 px-4 py-3 text-sm text-relapse" role="alert">
            Esta cuenta no tiene acceso. Pide que te agreguen.
          </p>
        ) : null}

        <form action={signInWithGoogle} className="mt-10">
          <button className="flex min-h-12 w-full items-center justify-center rounded-xl bg-primary px-4 font-semibold text-primary-foreground transition hover:brightness-110" type="submit">
            Entrar con Google
          </button>
        </form>
      </div>
    </main>
  );
}
