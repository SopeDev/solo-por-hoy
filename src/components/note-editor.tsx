"use client";

import { useState, useTransition } from "react";
import { saveNote } from "@/app/actions/check-in";
import type { DayKey } from "@/lib/days";

/** An optional note about the day. The group sees it once the day closes, like the answer. */
export function NoteEditor({ day, note }: { day: DayKey; note?: string }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(note ?? "");
  const [pending, startTransition] = useTransition();

  function save() {
    startTransition(async () => {
      const result = await saveNote(day, text);
      if (result.ok) setEditing(false);
    });
  }

  if (!editing) {
    return note ? (
      <button className="mt-3 block w-full rounded-xl bg-white/5 px-3 py-2 text-left text-sm text-muted-foreground" onClick={() => setEditing(true)} type="button">
        “{note}” <span className="underline underline-offset-4">Editar</span>
      </button>
    ) : (
      <button className="mt-3 block text-sm text-muted-foreground underline underline-offset-4" onClick={() => setEditing(true)} type="button">
        Agregar una nota sobre el día
      </button>
    );
  }

  return (
    <div className="mt-3 grid gap-2">
      <textarea
        aria-label="Nota sobre el día"
        autoFocus
        className="min-h-20 w-full rounded-xl border border-border bg-background px-3 py-2 text-base outline-none focus:border-primary"
        maxLength={280}
        onChange={(event) => setText(event.target.value)}
        placeholder="¿Cómo estuvo el día? Tu grupo lo leerá cuando cierre el día."
        value={text}
      />
      <div className="flex gap-2">
        <button className="min-h-10 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-60" disabled={pending} onClick={save} type="button">
          Guardar
        </button>
        <button className="min-h-10 px-3 text-sm text-muted-foreground" onClick={() => setEditing(false)} type="button">
          Cancelar
        </button>
      </div>
    </div>
  );
}
