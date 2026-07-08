// src/services/firebase.ts
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getMessaging, Messaging } from "firebase/messaging"; // 👈 Import Messaging type

// PASTE YOUR CONFIG FROM FIREBASE CONSOLE HERE
const firebaseConfig = {
  apiKey: "AIzaSyBOLlA9Zmet0mQyvPALrN_c5Qtl_0JW8Qg",
  authDomain: "hostel-mess-3939e.firebaseapp.com",
  projectId: "hostel-mess-3939e",
  storageBucket: "hostel-mess-3939e.firebasestorage.app",
  messagingSenderId: "951679310096",
  appId: "1:951679310096:web:3cc6022fe3ff97a52ead95"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Services
export const db = getFirestore(app);
export const auth = getAuth(app);

// 👇 SAFE INITIALIZATION OF MESSAGING
let messaging: Messaging | null = null;
try {
  // Only initialize if we are in a browser environment
  if (typeof window !== "undefined") {
    messaging = getMessaging(app);
  }
} catch (error) {
  console.warn("Firebase Messaging is not supported in this browser/environment.", error);
  // App continues working without notifications
}

export { messaging };