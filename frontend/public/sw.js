// Legacy service worker — push notifications now handled by firebase-messaging-sw.js
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(clients.claim()));
