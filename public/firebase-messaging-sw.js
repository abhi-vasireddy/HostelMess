/**
 * Firebase Messaging Service Worker
 *
 * This file handles background push notifications when the app is:
 *   - Running in the background (PWA or native webview)
 *   - Closed (on Android via browser / FCM push API)
 *
 * Features:
 *   - Renders notification UI from the service worker
 *   - Handles notification click → navigates to the correct app screen
 *   - Reads deep-link route from the notification data payload
 *   - Vibrates on notification reception
 *   - Groups notifications by tag to avoid duplicates
 */

importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js');

// Firebase Configuration (matches services/firebase.ts)
firebase.initializeApp({
  apiKey: "AIzaSyBOLlA9Zmet0mQyvPALrN_c5Qtl_0JW8Qg",
  authDomain: "hostel-mess-3939e.firebaseapp.com",
  projectId: "hostel-mess-3939e",
  storageBucket: "hostel-mess-3939e.firebasestorage.app",
  messagingSenderId: "951679310096",
  appId: "1:951679310096:web:3cc6022fe3ff97a52ead95"
});

const messaging = firebase.messaging();

// ---- Handle Background Messages ----
// This fires when the app is NOT in the foreground (background/closed)
messaging.onBackgroundMessage(function (payload) {
  console.log('[SW] Background message received:', payload);

  const notificationTitle = payload.notification?.title || 'CampDex';
  const route = payload.data?.route || '/';
  const tag = payload.data?.notificationId || 'campdex-notification';

  const notificationOptions = {
    body: payload.notification?.body || '',
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    vibrate: [200, 100, 200],
    data: {
      route: route,
      ...(payload.data || {}),
    },
    tag: tag,
    renotify: true,
    requireInteraction: true,
    actions: [{ action: 'open', title: 'Open' }],
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// ---- Handle Notification Click ----
// When the user taps/click the notification in the system tray
self.addEventListener('notificationclick', function (event) {
  console.log('[SW] Notification clicked:', event);

  event.notification.close();

  // Read deep-link route from notification data
  const route = event.notification.data?.route || '/';

  // Build the full app URL (respecting the hash router)
  const appUrl = self.location.origin + '/#' + route;

  const promiseChain = clients
    .matchAll({ type: 'window', includeUncontrolled: true })
    .then(function (windowClients) {
      // If there's an existing app window, focus and navigate it
      for (var i = 0; i < windowClients.length; i++) {
        var client = windowClients[i];
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus();
          if ('navigate' in client) {
            client.navigate(appUrl);
          }
          return;
        }
      }
      // Otherwise open a new window
      return clients.openWindow(appUrl);
    });

  event.waitUntil(promiseChain);
});
