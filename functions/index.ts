// This file is intended for the Firebase Functions environment.
// It will not run in the browser but provides the required backend logic.

/**
 * NOTE: To deploy this, you would run `firebase deploy --only functions`.
 * Required dependencies in package.json: firebase-admin, firebase-functions
 */

/* eslint-disable @typescript-eslint/no-var-requires */
/*
const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

const db = admin.firestore();

// 1. Scheduled Sunday Announcement
// "There are no snacks on Sundays"
// Scheduled every Sunday at 00:01 IST
exports.scheduledSundaySnacks = functions.pubsub.schedule('1 0 * * 0')
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
      console.log('Sunday announcement created');
    } catch (error) {
      console.error('Error creating Sunday announcement', error);
    }
  });


// 2. Submit Feedback with Time Validation (Server-Side Enforcement)
exports.submitFeedback = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be logged in');
  }

  const { dishId, rating, comment, mealType } = data;
  const uid = context.auth.uid;

  // Timezone Helper
  const getISTTime = () => {
    const d = new Date();
    const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
    return new Date(utc + (3600000 * 5.5));
  };

  const now = getISTTime();
  const currentHour = now.getHours() + (now.getMinutes() / 60);

  // Define Lock Times
  // Breakfast > 8:00, Lunch > 13:00, Snacks > 16:45, Dinner > 19:30
  let allowed = false;
  if (mealType === 'Breakfast' && currentHour >= 8) allowed = true;
  else if (mealType === 'Lunch' && currentHour >= 13) allowed = true;
  else if (mealType === 'Snacks' && currentHour >= 16.75) allowed = true;
  else if (mealType === 'Dinner' && currentHour >= 19.5) allowed = true;

  if (!allowed) {
    throw new functions.https.HttpsError('failed-precondition', 'Feedback is not yet open for this meal.');
  }

  // Check if already submitted today
  const todayStr = now.toISOString().split('T')[0];
  const query = await db.collection('feedback')
    .where('userId', '==', uid)
    .where('dishId', '==', dishId)
    .where('date', '==', todayStr)
    .get();

  if (!query.empty) {
    throw new functions.https.HttpsError('already-exists', 'You have already rated this dish today.');
  }

  // Save Feedback
  await db.collection('feedback').add({
    dishId,
    mealType,
    userId: uid,
    rating,
    comment,
    date: todayStr,
    timestamp: admin.firestore.FieldValue.serverTimestamp()
  });

  return { success: true };
});

// 3. Bulk Import Users (Admin Only)
exports.importUsers = functions.https.onCall(async (data, context) => {
   if (!context.auth || context.auth.token.role !== 'ADMIN') {
      throw new functions.https.HttpsError('permission-denied', 'Only admins can import users');
   }

   const usersList = data.users; // Array of { email, password, displayName }
   const batch = db.batch();
   const results = { success: 0, failed: 0 };

   for (const user of usersList) {
     try {
       const userRecord = await admin.auth().createUser({
         email: user.email,
         password: user.password,
         displayName: user.displayName
       });
       
       await admin.auth().setCustomUserClaims(userRecord.uid, { role: 'STUDENT' });
       
       const userRef = db.collection('users').doc(userRecord.uid);
       batch.set(userRef, {
         email: user.email,
         displayName: user.displayName,
         role: 'STUDENT',
         createdAt: admin.firestore.FieldValue.serverTimestamp()
       });
       results.success++;
     } catch (e) {
       console.error(`Failed to create user ${user.email}`, e);
       results.failed++;
     }
   }

   await batch.commit();
   return results;
});
*/
