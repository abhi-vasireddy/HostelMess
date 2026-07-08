// public/firebase-messaging-sw.js

importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

// 👇 Copy these values from your Firebase project settings
firebase.initializeApp({
  apiKey: "AIzaSyBOLlA9Zmet0mQyvPALrN_c5Qtl_0JW8Qg",
  authDomain: "hostel-mess-3939e.firebaseapp.com",
  projectId: "hostel-mess-3939e",
  storageBucket: "hostel-mess-3939e.firebasestorage.app",
  messagingSenderId: "951679310096",
  appId: "1:951679310096:web:3cc6022fe3ff97a52ead95"
});

const messaging = firebase.messaging();

// This handles notifications when app is in BACKGROUND or CLOSED
messaging.onBackgroundMessage(function(payload) {
  console.log('Background message received:', payload);

  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/icons/icon-192x192.png' // 👈 your app icon path
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});