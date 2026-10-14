"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { cn } from "@/lib/cn";

/** A submit button that asks once before acting, for things that are hard to undo. */
export function ConfirmSubmit({ label, confirmLabel, className }: { label: string; confirmLabel: string; className?: string }) {
  const [confirming, setConfirming] = useState(false);
  const { pending } = useFormStatus();

  if (!confirming) {
    return (
      <button className={className} onClick={() => setConfirming(true)} type="button">
        {label}
      </button>
    );
  }
  return (
    <span className="flex flex-wrap items-center gap-2">
      <button className={cn(className, "text-relapse")} disabled={pending} type="submit">
        {confirmLabel}
      </button>
      <button className="text-sm text-muted-foreground" onClick={() => setConfirming(false)} type="button">
        Cancelar
      </button>
    </span>
  );
}
