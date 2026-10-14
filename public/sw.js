// Solo por hoy service worker: shows the nightly question, the morning report and messages from the group, and answers the question
// straight from the notification's buttons. Payloads are described by `PushPayload` in src/lib/push.ts.

const ICON = "/icons/icon-192.png";
const BADGE = "/icons/badge-96.png";

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  if (!event.data) return;
  const data = event.data.json();

  if (data.type === "prompt") {
    event.waitUntil(
      self.registration.showNotification(data.title, {
        body: data.body,
        icon: ICON,
        badge: BADGE,
        tag: "prompt",
        renotify: true,
        requireInteraction: true,
        data,
        actions: [
          { action: "clean", title: "Sí, me mantuve" },
          { action: "relapsed", title: "No, recaí" },
        ],
      }),
    );
    return;
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: ICON,
      badge: BADGE,
      tag: data.tag || "report",
      data,
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  const notification = event.notification;
  const data = notification.data || {};
  notification.close();

  if (data.type === "prompt" && (event.action === "clean" || event.action === "relapsed")) {
    event.waitUntil(answer(data.day, event.action === "relapsed"));
    return;
  }
  event.waitUntil(openApp());
});

async function answer(day, relapsed) {
  try {
    const response = await fetch("/api/check-in", {
      method: "POST",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ day, relapsed }),
    });
    if (!response.ok) throw new Error(`Check-in failed: ${response.status}`);
    await self.registration.showNotification(relapsed ? "Anotado. Mañana es otro día." : "Anotado. Un día más. 💪", {
      body: "Solo por hoy.",
      icon: ICON,
      badge: BADGE,
      tag: "answered",
    });
    await refreshOpenWindows();
  } catch {
    // Signed out, the day already closed, or offline: let the app sort it out.
    await openApp();
  }
}

async function openApp() {
  const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
  const open = windows[0];
  if (open) {
    await open.focus();
    open.postMessage({ type: "refresh" });
    return;
  }
  await self.clients.openWindow("/");
}

async function refreshOpenWindows() {
  const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
  for (const client of windows) client.postMessage({ type: "refresh" });
}
