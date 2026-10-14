import { ArrowLeft, Settings } from "lucide-react";
import Link from "next/link";

export const cardClass = "rounded-3xl border border-border bg-surface p-5";
export const inputClass = "min-h-12 w-full rounded-xl border border-border bg-background px-4 text-base outline-none focus:border-primary";

/** The page frame: logo, app name and group, and a link to settings (or back home from settings). */
export function AppShell({ children, groupName, back = false }: { children: React.ReactNode; groupName?: string; back?: boolean }) {
  return (
    <main className="mx-auto w-full max-w-md px-4 pt-[max(1.5rem,env(safe-area-inset-top))] pb-[max(2rem,env(safe-area-inset-bottom))]">
      <header className="mb-6 flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element -- a tiny static SVG needs no optimization */}
        <img alt="" className="size-9" src="/icons/icon-source.svg" />
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-xl leading-tight">Solo por hoy</h1>
          {groupName ? <p className="truncate text-sm text-muted-foreground">{groupName}</p> : null}
        </div>
        <Link
          aria-label={back ? "Volver al inicio" : "Ajustes"}
          className="flex size-11 items-center justify-center rounded-full text-muted-foreground transition hover:bg-white/5 hover:text-foreground"
          href={back ? "/" : "/ajustes"}
        >
          {back ? <ArrowLeft aria-hidden size={22} /> : <Settings aria-hidden size={22} />}
        </Link>
      </header>
      {children}
    </main>
  );
}
