"use client";

import { Bell, BellOff, Download } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { removeSubscription, saveSubscription, sendTestPrompt } from "@/app/actions/push";

type BeforeInstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

type PushState = "loading" | "unsupported" | "denied" | "off" | "on";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  return Uint8Array.from(raw, (char) => char.charCodeAt(0));
}

function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches;
}

/** This phone: installing the app and turning on the nightly question and morning report. */
export function DeviceSetup({ vapidPublicKey }: { vapidPublicKey: string | null }) {
  const [push, setPush] = useState<PushState>("loading");
  const [installed, setInstalled] = useState(true);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    async function check() {
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
        setPush("unsupported");
        return;
      }
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      // Keeps the server's copy current: the browser can renew a subscription on its own.
      if (subscription) await saveSubscription(subscription.toJSON()).catch(() => undefined);
      setPush(subscription ? "on" : Notification.permission === "denied" ? "denied" : "off");
      setInstalled(isStandalone());
    }
    void check();

    function onInstallPrompt(event: Event) {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    }
    function onInstalled() {
      setInstalled(true);
      setInstallPrompt(null);
    }
    window.addEventListener("beforeinstallprompt", onInstallPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onInstallPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  function enable() {
    if (!vapidPublicKey) return;
    startTransition(async () => {
      setMessage(null);
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setPush(permission === "denied" ? "denied" : "off");
        return;
      }
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) });
      await saveSubscription(subscription.toJSON());
      setPush("on");
    });
  }

  function disable() {
    startTransition(async () => {
      setMessage(null);
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await removeSubscription(subscription.endpoint);
        await subscription.unsubscribe();
      }
      setPush("off");
    });
  }

  function test() {
    startTransition(async () => {
      setMessage((await sendTestPrompt()) ? "Listo: te debe llegar en unos segundos." : "No se pudo enviar. Desactiva y vuelve a activar los recordatorios.");
    });
  }

  async function install() {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === "accepted") setInstalled(true);
    setInstallPrompt(null);
  }

  return (
    <div className="grid gap-3">
      {!installed ? (
        installPrompt ? (
          <button className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-border px-4 font-medium transition hover:bg-white/5" onClick={install} type="button">
            <Download aria-hidden size={18} /> Instalar la app
          </button>
        ) : (
          <p className="text-sm text-muted-foreground">Para instalarla, abre el menú ⋮ de Chrome y elige “Instalar app” o “Agregar a la pantalla principal”.</p>
        )
      ) : null}

      {push === "unsupported" ? <p className="text-sm text-muted-foreground">Este navegador no admite notificaciones. Abre la app en Chrome en tu Android.</p> : null}
      {push !== "unsupported" && push !== "loading" && !vapidPublicKey ? <p className="text-sm text-muted-foreground">Las notificaciones aún no están configuradas en el servidor.</p> : null}
      {push === "denied" ? <p className="text-sm text-muted-foreground">Bloqueaste las notificaciones. Actívalas en los ajustes del sitio (🔒 junto a la dirección) y vuelve aquí.</p> : null}

      {push === "off" && vapidPublicKey ? (
        <button className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-primary px-4 font-semibold text-primary-foreground transition hover:brightness-110 disabled:opacity-60" disabled={pending} onClick={enable} type="button">
          <Bell aria-hidden size={18} /> Activar recordatorios
        </button>
      ) : null}

      {push === "on" ? (
        <>
          <p className="flex items-center gap-2 text-sm text-clean">
            <Bell aria-hidden size={16} /> Recordatorios activados en este dispositivo.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <button className="min-h-11 rounded-xl border border-border px-3 text-sm font-medium transition hover:bg-white/5 disabled:opacity-60" disabled={pending} onClick={test} type="button">
              Enviar prueba
            </button>
            <button className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border px-3 text-sm text-muted-foreground transition hover:bg-white/5 disabled:opacity-60" disabled={pending} onClick={disable} type="button">
              <BellOff aria-hidden size={16} /> Desactivar
            </button>
          </div>
        </>
      ) : null}

      {message ? <p className="text-sm text-muted-foreground" role="status">{message}</p> : null}
    </div>
  );
}
