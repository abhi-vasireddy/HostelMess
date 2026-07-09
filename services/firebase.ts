/**
 * Firebase Configuration
 * Reads from environment variables (VITE_* prefix for Vite compatibility)
 * Falls back to hardcoded values for development convenience.
 */

import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getMessaging, Messaging } from "firebase/messaging";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyBOLlA9Zmet0mQyvPALrN_c5Qtl_0JW8Qg",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "hostel-mess-3939e.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "hostel-mess-3939e",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "hostel-mess-3939e.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "951679310096",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:951679310096:web:3cc6022fe3ff97a52ead95",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Services
export const db = getFirestore(app);
export const auth = getAuth(app);

// Safe Initialization of Messaging
let messaging: Messaging | null = null;
try {
  if (typeof window !== "undefined") {
    messaging = getMessaging(app);
  }
} catch (error) {
  console.warn("Firebase Messaging is not supported in this browser/environment.", error);
}

export { messaging };
