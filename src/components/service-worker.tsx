"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Registers the service worker, and refreshes the screen when it records an answer from a notification. */
export function ServiceWorker() {
  const router = useRouter();

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch((error) => console.error("Service worker registration failed", error));

    function onMessage(event: MessageEvent) {
      if (event.data?.type === "refresh") router.refresh();
    }
    navigator.serviceWorker.addEventListener("message", onMessage);
    return () => navigator.serviceWorker.removeEventListener("message", onMessage);
  }, [router]);

  return null;
}
