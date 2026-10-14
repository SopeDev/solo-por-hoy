"use client";

import { useState, useTransition } from "react";
import { answerDay } from "@/app/actions/check-in";
import { NoteEditor } from "@/components/note-editor";
import { cn } from "@/lib/cn";
import type { DayKey } from "@/lib/days";

/** Once answered here, the question no longer needs to sit in the notification shade. */
async function closePromptNotifications() {
  if (!("serviceWorker" in navigator)) return;
  const registration = await navigator.serviceWorker.getRegistration();
  const notifications = (await registration?.getNotifications({ tag: "prompt" })) ?? [];
  notifications.forEach((notification) => notification.close());
}

/**
 * Sí / No for a day, then the answer with an optional note. Today's answer can be changed until the day closes;
 * a missed yesterday is answered once.
 */
export function CheckInButtons({ day, answer, note, changeable = true }: { day: DayKey; answer: boolean | undefined; note?: string; changeable?: boolean }) {
  const [pending, startTransition] = useTransition();
  const [changing, setChanging] = useState(false);
  const [error, setError] = useState(false);

  function choose(relapsed: boolean) {
    startTransition(async () => {
      const result = await answerDay(day, relapsed);
      setError(!result.ok);
      setChanging(false);
      if (result.ok) void closePromptNotifications();
    });
  }

  if (answer !== undefined && !changing) {
    return (
      <div className="mt-4">
        <p className={cn("text-lg font-medium", answer ? "text-relapse" : "text-clean")}>
          {answer ? "Gracias por tu honestidad. Mañana empiezas de nuevo." : "Te mantuviste. Un día más."}
        </p>
        <NoteEditor day={day} note={note} />
        {changeable ? (
          <button className="mt-3 text-sm text-muted-foreground underline underline-offset-4" onClick={() => setChanging(true)} type="button">
            Cambiar respuesta
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="mt-5 grid gap-3" aria-busy={pending}>
      <button
        className="min-h-14 rounded-2xl bg-clean px-4 text-lg font-semibold text-background transition active:scale-[.98] disabled:opacity-60"
        disabled={pending}
        onClick={() => choose(false)}
        type="button"
      >
        Sí, me mantuve
      </button>
      <button
        className="min-h-14 rounded-2xl border border-relapse/50 bg-relapse/10 px-4 text-lg font-semibold text-relapse transition active:scale-[.98] disabled:opacity-60"
        disabled={pending}
        onClick={() => choose(true)}
        type="button"
      >
        No, recaí
      </button>
      {error ? (
        <p className="text-sm text-muted-foreground" role="status">
          Ese día ya cerró. Recarga la página.
        </p>
      ) : null}
      {changing ? (
        <button className="text-sm text-muted-foreground underline underline-offset-4" onClick={() => setChanging(false)} type="button">
          Cancelar
        </button>
      ) : null}
    </div>
  );
}
