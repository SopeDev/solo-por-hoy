"use client";

import { useState, useTransition } from "react";
import { answerToday } from "@/app/actions/check-in";
import { cn } from "@/lib/cn";

/** Once answered here, tonight's question no longer needs to sit in the notification shade. */
async function closePromptNotifications() {
  if (!("serviceWorker" in navigator)) return;
  const registration = await navigator.serviceWorker.getRegistration();
  const notifications = (await registration?.getNotifications({ tag: "prompt" })) ?? [];
  notifications.forEach((notification) => notification.close());
}

export function CheckInButtons({ answer }: { answer: boolean | undefined }) {
  const [pending, startTransition] = useTransition();
  const [changing, setChanging] = useState(false);

  function choose(relapsed: boolean) {
    startTransition(async () => {
      await answerToday(relapsed);
      setChanging(false);
      void closePromptNotifications();
    });
  }

  if (answer !== undefined && !changing) {
    return (
      <div className="mt-4">
        <p className={cn("text-lg font-medium", answer ? "text-relapse" : "text-clean")}>
          {answer ? "Recaíste hoy. Mañana es otro día." : "Hoy te mantuviste. Un día más."}
        </p>
        <button className="mt-3 text-sm text-muted-foreground underline underline-offset-4" onClick={() => setChanging(true)} type="button">
          Cambiar respuesta
        </button>
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
        No, me mantuve
      </button>
      <button
        className="min-h-14 rounded-2xl border border-relapse/50 bg-relapse/10 px-4 text-lg font-semibold text-relapse transition active:scale-[.98] disabled:opacity-60"
        disabled={pending}
        onClick={() => choose(true)}
        type="button"
      >
        Sí, recaí
      </button>
      {changing ? (
        <button className="text-sm text-muted-foreground underline underline-offset-4" onClick={() => setChanging(false)} type="button">
          Cancelar
        </button>
      ) : null}
    </div>
  );
}
