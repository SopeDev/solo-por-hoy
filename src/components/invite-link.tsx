"use client";

import { Check, Share2 } from "lucide-react";
import { useState } from "react";

export function InviteLink({ code, groupName }: { code: string; groupName: string }) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = `${location.origin}/unirse/${code}`;
    const text = `Únete a "${groupName}" en Solo por hoy`;
    if (navigator.share) {
      // Closing the share sheet rejects; nothing to do then.
      await navigator.share({ title: "Solo por hoy", text, url }).catch(() => undefined);
      return;
    }
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-border px-4 font-medium transition hover:bg-white/5" onClick={share} type="button">
      {copied ? <Check aria-hidden size={18} /> : <Share2 aria-hidden size={18} />}
      {copied ? "Enlace copiado" : "Invitar a alguien"}
    </button>
  );
}
