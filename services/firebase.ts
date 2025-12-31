// src/services/firebase.ts
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

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
export const db = getFirestore(app); // The Database
export const auth = getAuth(app);    // The Authentication (Login system)