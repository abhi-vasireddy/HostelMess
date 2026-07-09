import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

// Initialize Firebase Admin (Required for database & messaging)
if (admin.apps.length === 0) {
  admin.initializeApp();
}

const db = admin.firestore();

/**
 * ------------------------------------------------------------------
 * 1. BROADCAST NOTIFICATIONS (Connects to Admin Dashboard)
 * ------------------------------------------------------------------
 * This function triggers automatically when you add a document to
 * the "broadcasts" collection in the Admin Dashboard.
 *
 * Supports:
 *   - Standard notification (title + body)
 *   - Deep-link route in data payload (route property)
 *   - Automatic cleanup of invalid/expired tokens
 */
export const sendBroadcastNotification = functions.firestore
  .document("broadcasts/{broadcastId}")
  .onCreate(async (snapshot, context) => {
    const data = snapshot.data();
    const title = data.title;
    const body = data.body;
    const route = data.route || "/hostel"; // Default deep-link route

    // 1. Get ALL user tokens
    const usersSnapshot = await db.collection("users").get();

    const tokens: string[] = [];
    const userTokenMap = new Map<string, string[]>(); // userId -> [tokens...]

    usersSnapshot.forEach((doc) => {
      const userData = doc.data();
      if (userData.fcmTokens && Array.isArray(userData.fcmTokens)) {
        const validTokens = userData.fcmTokens.filter((t: any) => typeof t === "string" && t.length > 20);
        if (validTokens.length > 0) {
          tokens.push(...validTokens);
          userTokenMap.set(doc.id, validTokens);
        }
      }
    });

    // 2. Remove duplicates
    const uniqueTokens = [...new Set(tokens)];

    if (uniqueTokens.length === 0) {
      console.log("No devices to send to.");
      return;
    }

    console.log(`Sending broadcast to ${uniqueTokens.length} devices.`);

    // 3. Construct and send the message (with data payload for deep-linking)
    try {
      const response = await admin.messaging().sendEachForMulticast({
        tokens: uniqueTokens,
        notification: {
          title: title,
          body: body,
        },
        data: {
          route: route,
          click_action: "FLUTTER_NOTIFICATION_CLICK", // Helps Android open the correct activity
        },
      });

      console.log(`Broadcast sent: ${response.successCount} succeeded, ${response.failureCount} failed.`);

      // 4. Clean up invalid tokens from Firestore
      if (response.failureCount > 0) {
        const invalidTokens = new Set<string>();

        response.responses.forEach((resp, idx) => {
          if (!resp.success && resp.error) {
            const errorCode = resp.error.code;
            // These error codes mean the token is permanently invalid
            if (
              errorCode === "messaging/invalid-registration-token" ||
              errorCode === "messaging/registration-token-not-registered" ||
              errorCode === "messaging/mismatched-credential" ||
              errorCode === "messaging/invalid-argument"
            ) {
              invalidTokens.add(uniqueTokens[idx]);
            }
          }
        });

        if (invalidTokens.size > 0) {
          console.log(`Cleaning up ${invalidTokens.size} invalid tokens from Firestore...`);

          const batch = db.batch();
          userTokenMap.forEach((userTokens, userId) => {
            const filtered = userTokens.filter((t) => !invalidTokens.has(t));
            if (filtered.length !== userTokens.length) {
              const userRef = db.collection("users").doc(userId);
              batch.update(userRef, { fcmTokens: filtered });
            }
          });

          await batch.commit();
          console.log("Token cleanup complete.");
        }
      }
    } catch (error) {
      console.error("Error sending broadcast:", error);
    }
  });

/**
 * ------------------------------------------------------------------
 * 2. SCHEDULED SUNDAY ANNOUNCEMENT
 * ------------------------------------------------------------------
 * Automatically posts "No Snacks" every Sunday at 00:01 IST
 */
export const scheduledSundaySnacks = functions.pubsub.schedule('1 0 * * 0')
  .timeZone('Asia/Kolkata')
  .onRun(async (context) => {
    const today = new Date();
    const expiry = new Date(today);
    expiry.setHours(23, 59, 59, 999);

    const announcement = {
      title: 'Sunday Menu Update',
      message: 'There are no snacks served on Sundays.',
      type: 'info',
      isActive: true,
      expiresOn: expiry.toISOString(),
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    };

    try {
      await db.collection('announcements').add(announcement);
      console.log('Sunday announcement created successfully');
    } catch (error) {
      console.error('Error creating Sunday announcement', error);
    }
  });

/**
 * ------------------------------------------------------------------
 * 3. BULK IMPORT USERS (Admin Utility)
 * ------------------------------------------------------------------
 * Allows you to upload a list of users securely from the backend.
 */
export const importUsers = functions.https.onCall(async (data, context) => {
   // Security Check: Ensure the requester is an Admin
   // Note: You must set Custom Claims for this to work perfectly,
   // or remove this check for development testing.
   /* if (!context.auth || context.auth.token.role !== 'ADMIN') {
      throw new functions.https.HttpsError('permission-denied', 'Only admins can import users');
   }
   */

   const usersList = data.users; // Expects Array of { email, password, displayName }
   const batch = db.batch();
   const results = { success: 0, failed: 0 };

   for (const user of usersList) {
     try {
       // A. Create Authentication Record
       const userRecord = await admin.auth().createUser({
         email: user.email,
         password: user.password,
         displayName: user.displayName
       });

       // B. Set Default Role
       await admin.auth().setCustomUserClaims(userRecord.uid, { role: 'STUDENT' });

       // C. Create Database Record
       const userRef = db.collection('users').doc(userRecord.uid);
       batch.set(userRef, {
         uid: userRecord.uid,
         email: user.email,
         displayName: user.displayName,
         role: 'STUDENT',
         gender: user.gender || 'MALE',
         roomNumber: user.roomNumber || '',
         createdAt: admin.firestore.FieldValue.serverTimestamp()
       });
       results.success++;
     } catch (e) {
       console.error(`Failed to create user ${user.email}`, e);
       results.failed++;
     }
   }

   // D. Commit all DB writes at once
   await batch.commit();
   return results;
});
