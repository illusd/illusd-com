/* illusd push service worker */
self.addEventListener("install", (e) => {
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  event.waitUntil(
    (async () => {
      let data = {};
      try {
        data = event.data ? event.data.json() : {};
      } catch {
        data = { title: "illusd", body: event.data ? event.data.text() : "" };
      }

      if (!data.title) {
        try {
          const res = await fetch("/api/public/push/latest", { cache: "no-store" });
          if (res.ok) data = await res.json();
        } catch (error) {
          data = { title: "illusd", body: "新文章已發布", url: "/" };
        }
      }

      const title = data.title || "illusd";
      const options = {
        ...(data.body ? { body: data.body } : {}),
        icon: data.icon || "/icon-192.png",
        badge: data.badge || "/icon-192.png",
        data: { url: data.url || "/" },
        tag: data.tag || "illusd-push",
        renotify: true,
      };
      await self.registration.showNotification(title, options);
    })(),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL((event.notification.data && event.notification.data.url) || "/", self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((wins) => {
      for (const w of wins) {
        if ("focus" in w) {
          w.navigate(url);
          return w.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    }),
  );
});
