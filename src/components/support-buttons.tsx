"use client";

import { HandHeart } from "lucide-react";
import { useState, useTransition } from "react";
import { sendCheer, sendNudge, sendSos } from "@/app/actions/support";
import { cn } from "@/lib/cn";

/** "Necesito apoyo": asks before sending, since it buzzes everyone's phone right away. */
export function SosButton() {
  const [confirming, setConfirming] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function send() {
    startTransition(async () => {
      const result = await sendSos();
      setConfirming(false);
      setMessage(result.ok ? "Le avisamos a tu grupo. No lo cargas a solas." : result.reason === "limit" ? "Ya le avisaste a tu grupo hace poco." : "No se pudo enviar.");
    });
  }

  if (message) return <p className="text-sm text-muted-foreground" role="status">{message}</p>;

  if (confirming) {
    return (
      <div className="grid gap-2">
        <p className="text-sm text-muted-foreground">Tu grupo recibirá ahora una notificación de que necesitas apoyo.</p>
        <div className="grid grid-cols-2 gap-2">
          <button className="min-h-11 rounded-xl bg-primary px-3 font-semibold text-primary-foreground disabled:opacity-60" disabled={pending} onClick={send} type="button">
            Avisarles
          </button>
          <button className="min-h-11 rounded-xl border border-border px-3 text-muted-foreground" onClick={() => setConfirming(false)} type="button">
            Cancelar
          </button>
        </div>
      </div>
    );
  }

  return (
    <button className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-primary/50 px-4 font-medium text-primary transition hover:bg-primary/10" onClick={() => setConfirming(true)} type="button">
      <HandHeart aria-hidden size={18} /> Necesito apoyo
    </button>
  );
}

/** A one-tap push to one person: encouragement, or a reminder to answer today. */
export function SignalButton({ kind, toUserId, sent }: { kind: "cheer" | "nudge"; toUserId: string; sent: boolean }) {
  const [done, setDone] = useState(sent);
  const [pending, startTransition] = useTransition();

  function send() {
    startTransition(async () => {
      const result = await (kind === "cheer" ? sendCheer(toUserId) : sendNudge(toUserId));
      if (result.ok || result.reason === "limit") setDone(true);
    });
  }

  const label = kind === "cheer" ? (done ? "Ánimo enviado" : "💪 Ánimo") : done ? "Recordado" : "Recordarle";
  return (
    <button
      className={cn("shrink-0 rounded-full border border-border px-3 py-1 text-sm transition hover:bg-white/5 disabled:opacity-60", done && "border-transparent text-muted-foreground")}
      disabled={done || pending}
      onClick={send}
      type="button"
    >
      {label}
    </button>
  );
}
