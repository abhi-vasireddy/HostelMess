// src/services/notificationService.ts
import { getToken, onMessage } from "firebase/messaging";
import { messaging } from "./firebase";

// 1. Request Permission & Get Token
export const requestForToken = async () => {
  // 👇 Safety Check: If messaging failed to load, stop here.
  if (!messaging) {
    console.log("Messaging not supported, skipping token request.");
    return null;
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      const token = await getToken(messaging, {
        vapidKey: "BHcvoC8lbRNeFq6LBk_9cKSUvCeBs7_sgRDMp7egp3l9yjENUIWF08s8cCf1Uy0763wxvgn17ZVe3H7XW79dSHY" // 👈 Check you have your Key here
      });
      
      if (token) {
        console.log("FCM Token:", token);
        // TODO: Save this token to your user's document in Firestore
        return token;
      }
    } else {
      console.log("Notification permission denied.");
    }
  } catch (error) {
    console.error("An error occurred while retrieving token. ", error);
  }
  return null;
};

// 2. Handle Foreground Messages (App is OPEN)
export const onMessageListener = () =>
  new Promise((resolve) => {
    // 👇 Safety Check
    if (messaging) {
      onMessage(messaging, (payload) => {
        resolve(payload);
      });
    }
  });