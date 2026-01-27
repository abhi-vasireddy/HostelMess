// public/firebase-messaging-sw.js
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

const firebaseConfig = {
  apiKey: "AIzaSyBOLlA9Zmet0mQyvPALrN_c5Qtl_0JW8Qg",
  authDomain: "hostel-mess-3939e.firebaseapp.com",
  projectId: "hostel-mess-3939e",
  storageBucket: "hostel-mess-3939e.firebasestorage.app",
  messagingSenderId: "951679310096",
  appId: "1:951679310096:web:3cc6022fe3ff97a52ead95"
};

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

// This handles the background notification
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/pwa-192x192.png' // using your PWA icon
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});