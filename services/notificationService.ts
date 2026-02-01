import { getToken, onMessage } from "firebase/messaging";
import { messaging, db } from "./firebase";
import { doc, updateDoc, arrayUnion } from "firebase/firestore";

// 1. Request Permission & Save Token
// We pass 'userId' so we know exactly whose document to update
export const requestForToken = async (userId: string) => {
  // Safety check: If messaging isn't supported (e.g., Brave browser), stop here.
  if (!messaging) {
    console.log("Messaging not supported in this browser.");
    return;
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      // Get the token from Firebase
      const token = await getToken(messaging, {
        vapidKey: "BHcvoC8lbRNeFq6LBk_9cKSUvCeBs7_sgRDMp7egp3l9yjENUIWF08s8cCf1Uy0763wxvgn17ZVe3H7XW79dSHY" // 👈 REPLACE THIS WITH YOUR KEY FROM FIREBASE CONSOLE
      });
      
      if (token) {
        console.log("FCM Token Generated:", token);
        
        // Save the token to the user's document in Firestore
        // We use 'arrayUnion' so we don't overwrite previous tokens (e.g. from their phone)
        const userRef = doc(db, "users", userId);
        await updateDoc(userRef, {
          fcmTokens: arrayUnion(token)
        });
        console.log("Token saved to user profile.");
      }
    } else {
      console.log("Notification permission denied.");
    }
  } catch (error) {
    console.error("Error getting token:", error);
  }
};

// 2. Handle Foreground Messages (App is OPEN)
// This listener triggers when the app is active and a message arrives.
export const onMessageListener = () =>
  new Promise((resolve) => {
    if (messaging) {
      onMessage(messaging, (payload) => {
        resolve(payload);
      });
    }
  });