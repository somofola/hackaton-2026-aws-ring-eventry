// Pass Mobile Extreme — Firebase Messaging Service Worker
importScripts('https://www.gstatic.com/firebasejs/10.13.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.13.0/firebase-messaging-compat.js');

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(clients.claim()));

// TODO: replace with new Pass Mobile Extreme Firebase project values
// (Firebase Console → Project Settings → General → Your apps → Web app → SDK setup and configuration)
firebase.initializeApp({
  apiKey:            "AIzaSyDHT2yI7oblVB1eXdRCCJSnBGgvxiKWPHw",
  authDomain:        "pass-mobile-extreme.firebaseapp.com",
  projectId:         "pass-mobile-extreme",
  storageBucket:     "pass-mobile-extreme.firebasestorage.app",
  messagingSenderId: "112102968133",
  appId:             "1:112102968133:web:75300f8a81c3ec7df10c2c",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const { title = 'Pass Mobile Extreme', body = '' } = payload.notification ?? {};
  self.registration.showNotification(title, {
    body,
    icon:    payload.notification?.icon ?? '/logo-mobile.png',
    badge:   '/logo-mobile.png',
    tag:     'pass-mobile-extreme-notification',
    data:    { url: payload.data?.url ?? '/user/notifications' },
    actions: [
      { action: 'view',    title: 'View' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
  });
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action === 'dismiss') return;

  const url = event.notification.data?.url ?? '/user/notifications';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return clients.openWindow?.(url);
    })
  );
});
