/**
 * ============================================================
 * notificationService.ts — Production Push Notification Service
 * ============================================================
 *
 * Supports TWO environments:
 *   1. **Web / PWA** – uses Firebase Cloud Messaging (FCM) via the
 *      Firebase JS SDK (getToken, onMessage).
 *   2. **Android Native (Capacitor)** – uses @capacitor/push-notifications
 *      to get the native FCM token and listen for native events.
 *
 * The service handles:
 *   - Permission request with graceful fallback
 *   - Token generation (FCM web + Capacitor native)
 *   - Secure token storage in Firestore (per-user fcmTokens array)
 *   - Token refresh detection and re-registration
 *   - Foreground message listener (web: onMessage, native: pushNotificationReceived)
 *   - Background notification tap handling (notificationActionPerformed / onBackgroundMessage)
 *   - Proper listener cleanup to prevent memory leaks
 *   - Logout cleanup (token removal)
 * ============================================================
 */

import { getToken, onMessage } from 'firebase/messaging';
import { messaging, db } from './firebase';
import {
  doc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  getDoc,
  collection,
  addDoc,
} from 'firebase/firestore';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import type { NotificationPayload, NotificationEvent } from './notificationTypes';

// ──────────────────────────────────────────────────────
//  CONSTANTS
// ──────────────────────────────────────────────────────

/** Replace with your VAPID key from Firebase Console > Cloud Messaging */
const VAPID_KEY = 'BHcvoC8lbRNeFq6LBk_9cKSUvCeBs7_sgRDMp7egp3l9yjENUIWF08s8cCf1Uy0763wxvgn17ZVe3H7XW79dSHY';

/** Sub-collection under each user doc for notification history */
const NOTIFICATIONS_COLLECTION = 'notifications';

// ──────────────────────────────────────────────────────
//  TYPES
// ──────────────────────────────────────────────────────

export type ForegroundCallback = (event: NotificationEvent) => void;
export type TapCallback = (event: NotificationEvent) => void;

interface ListenerRegistrations {
  fcm: boolean;
  capacitorReceive: string | null;
  capacitorAction: string | null;
  capacitorRegister: string | null;
  capacitorError: string | null;
}

// ──────────────────────────────────────────────────────
//  STATE (module-level, not exported directly)
// ──────────────────────────────────────────────────────

let foregroundCallback: ForegroundCallback | null = null;
let tapCallback: TapCallback | null = null;
let listeners: ListenerRegistrations = {
  fcm: false,
  capacitorReceive: null,
  capacitorAction: null,
  capacitorRegister: null,
  capacitorError: null,
};
let isSetup = false;

// ──────────────────────────────────────────────────────
//  1. PLATFORM DETECTION
// ──────────────────────────────────────────────────────

/** Are we running inside a Capacitor native wrapper? */
export const isNativePlatform = (): boolean => Capacitor.isNativePlatform();

/** Is the current environment capable of push notifications at all? */
export const isPushSupported = (): boolean => {
  if (isNativePlatform()) return true;
  return typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator;
};

// ──────────────────────────────────────────────────────
//  2. PERMISSION
// ──────────────────────────────────────────────────────

/**
 * Request notification permission.
 *
 * On web/PWA: uses the Notification API.
 * On native: uses Capacitor PushNotifications.requestPermissions().
 *
 * Returns one of: 'granted' | 'denied' | 'default' | 'unavailable'.
 */
export const requestPermission = async (): Promise<NotificationPermission | 'unavailable'> => {
  if (!isPushSupported()) return 'unavailable';

  try {
    if (isNativePlatform()) {
      const permResult = await PushNotifications.requestPermissions();
      return permResult.receive === 'granted' ? 'granted' : 'denied';
    }

    // Web / PWA
    const permission = await Notification.requestPermission();
    return permission;
  } catch (error) {
    console.warn('[Notifications] Permission request failed:', error);
    return 'unavailable';
  }
};

/**
 * Check current permission status without prompting.
 */
export const checkPermission = async (): Promise<NotificationPermission | 'unavailable'> => {
  if (!isPushSupported()) return 'unavailable';

  try {
    if (isNativePlatform()) {
      const permResult = await PushNotifications.checkPermissions();
      if (permResult.receive === 'granted') return 'granted';
      if (permResult.receive === 'denied') return 'denied';
      return 'default';
    }

    return Notification.permission;
  } catch {
    return 'unavailable';
  }
};

// ──────────────────────────────────────────────────────
//  3. TOKEN MANAGEMENT (FCM Web)
// ──────────────────────────────────────────────────────

/**
 * Retrieve the FCM token for the web/PWA environment.
 * Returns null if messaging is unsupported or permission denied.
 */
const getWebFCMToken = async (): Promise<string | null> => {
  if (!messaging) {
    console.log('[Notifications] Firebase Messaging not available.');
    return null;
  }

  if (!isNativePlatform() && Notification.permission !== 'granted') {
    console.log('[Notifications] Permission not granted for FCM.');
    return null;
  }

  try {
    const token = await getToken(messaging, { vapidKey: VAPID_KEY });
    return token || null;
  } catch (error) {
    console.error('[Notifications] FCM token generation failed:', error);
    return null;
  }
};

// ──────────────────────────────────────────────────────
//  4. FIRESTORE TOKEN PERSISTENCE
// ──────────────────────────────────────────────────────

const TOKEN_CACHE_KEY = 'hft_fcm_token';

/**
 * Save a token to the user's Firestore document.
 * Uses `arrayUnion` so multiple devices don't overwrite each other.
 */
const saveTokenToFirestore = async (token: string, userId: string): Promise<boolean> => {
  try {
    const userRef = doc(db, 'users', userId);

    // Check existing tokens to avoid duplicates
    const snap = await getDoc(userRef);
    const existingTokens: string[] = snap.data()?.fcmTokens ?? [];
    if (existingTokens.includes(token)) {
      return true; // Already saved
    }

    await updateDoc(userRef, {
      fcmTokens: arrayUnion(token),
      fcmTokenUpdatedAt: Date.now(),
    });

    // Cache the token locally for quick comparison
    localStorage.setItem(TOKEN_CACHE_KEY, JSON.stringify({ token, userId }));
    console.log('[Notifications] Token saved to Firestore.');
    return true;
  } catch (error) {
    console.error('[Notifications] Failed to save token to Firestore:', error);
    return false;
  }
};

/**
 * Remove a token from Firestore (called on logout or token revocation).
 */
export const removeTokenFromFirestore = async (token: string, userId: string): Promise<void> => {
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      fcmTokens: arrayRemove(token),
    });
    localStorage.removeItem(TOKEN_CACHE_KEY);
    console.log('[Notifications] Token removed from Firestore.');
  } catch (error) {
    console.error('[Notifications] Failed to remove token:', error);
  }
};

/**
 * Check whether the locally-cached token has changed (e.g., due to app reinstall).
 */
const hasTokenChanged = (newToken: string, userId: string): boolean => {
  try {
    const cached = localStorage.getItem(TOKEN_CACHE_KEY);
    if (!cached) return true;
    const { token, userId: cachedUserId } = JSON.parse(cached);
    return token !== newToken || cachedUserId !== userId;
  } catch {
    return true;
  }
};

// ──────────────────────────────────────────────────────
//  5. CAPACITOR (Native Android) PUSH SETUP
// ──────────────────────────────────────────────────────

/**
 * Register for push notifications on native Android via Capacitor.
 */
const setupCapacitorPush = async (userId: string): Promise<void> => {
  if (!isNativePlatform()) return;

  try {
    // Register the device with FCM via Capacitor
    await PushNotifications.register();

    // Listen for the registration token
    listeners.capacitorRegister = 'registration';
    PushNotifications.addListener('registration', async (regResult) => {
      const token = regResult.value;
      console.log('[Notifications] Capacitor registration token:', token);
      if (token) {
        await saveTokenToFirestore(token, userId);
      }
    });

    // Listen for registration errors
    listeners.capacitorError = 'registrationError';
    PushNotifications.addListener('registrationError', (err) => {
      console.error('[Notifications] Capacitor registration error:', err.error);
    });

    // Listen for foreground messages on native
    listeners.capacitorReceive = 'pushNotificationReceived';
    PushNotifications.addListener('pushNotificationReceived', (notification) => {
      console.log('[Notifications] Native foreground push received:', notification);
      const payload = buildPayloadFromCapacitor(notification);
      if (payload && foregroundCallback) {
        foregroundCallback({ payload, source: 'capacitor', userTapped: false });
      }
    });

    // Listen for notification tap (user opened the app via notification)
    listeners.capacitorAction = 'pushNotificationActionPerformed';
    PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
      console.log('[Notifications] Native notification tapped:', action);
      const payload = buildPayloadFromCapacitor(action.notification);
      if (payload && tapCallback) {
        tapCallback({ payload, source: 'capacitor', userTapped: true });
      }
    });
  } catch (error) {
    console.error('[Notifications] Capacitor push setup failed:', error);
  }
};

/**
 * Convert a Capacitor push notification into our standard NotificationPayload.
 */
const buildPayloadFromCapacitor = (notification: any): NotificationPayload | null => {
  if (!notification) return null;
  return {
    title: notification.title || 'Notification',
    body: notification.body || '',
    route: notification.data?.route || undefined,
    data: notification.data || undefined,
    notificationId: notification.id?.toString() || undefined,
  };
};

// ──────────────────────────────────────────────────────
//  6. FCM WEB FOREGROUND LISTENER
// ──────────────────────────────────────────────────────

/**
 * Subscribe to foreground messages from FCM (web).
 * Must be called after requestForToken.
 */
const setupFCMForegroundListener = (): void => {
  if (!messaging || listeners.fcm) return;

  try {
    listeners.fcm = true;
    onMessage(messaging, (payload) => {
      console.log('[Notifications] FCM foreground message:', payload);
      const notification = payload.notification;
      const data = payload.data as Record<string, string> | undefined;

      const appPayload: NotificationPayload = {
        title: notification?.title || 'Notification',
        body: notification?.body || '',
        route: data?.route || undefined,
        data: data || undefined,
      };

      if (foregroundCallback) {
        foregroundCallback({ payload: appPayload, source: 'fcm', userTapped: false });
      }
    });
    console.log('[Notifications] FCM foreground listener registered.');
  } catch (error) {
    console.error('[Notifications] Failed to register FCM listener:', error);
  }
};

// ──────────────────────────────────────────────────────
//  7. MAIN ENTRY POINT
// ──────────────────────────────────────────────────────

/**
 * Register for push notifications:
 *   1. Check/skip environment support
 *   2. Request permission (prompts user on first call)
 *   3. Generate FCM token (web) / register Capacitor (native)
 *   4. Save token to Firestore
 *   5. Set up foreground and tap listeners
 *
 * Call this once after the user logs in.
 */
export const registerForNotifications = async (userId: string): Promise<void> => {
  if (!isPushSupported()) {
    console.log('[Notifications] Push not supported on this device/browser.');
    return;
  }

  console.log('[Notifications] Registering for userId:', userId);

  // ── A. Request Permission ──
  const permission = await requestPermission();
  if (permission !== 'granted') {
    console.log('[Notifications] Permission denied or unavailable:', permission);
    return;
  }

  // ── B. Get & Save Tokens ──
  // Web/PWA: FCM token
  if (!isNativePlatform()) {
    const fcmToken = await getWebFCMToken();
    if (fcmToken) {
      if (hasTokenChanged(fcmToken, userId)) {
        await saveTokenToFirestore(fcmToken, userId);
      } else {
        console.log('[Notifications] Token unchanged, skipping Firestore write.');
      }
    }
  }

  // Native: Capacitor Push (also works on Android)
  if (isNativePlatform()) {
    await setupCapacitorPush(userId);
  }

  // ── C. Set up Foreground Listener ──
  setupFCMForegroundListener();

  isSetup = true;
};

// ──────────────────────────────────────────────────────
//  8. CALLBACKS
// ──────────────────────────────────────────────────────

/**
 * Set the callback for when a foreground notification arrives
 * (app is open and visible).
 */
export const setForegroundCallback = (cb: ForegroundCallback): void => {
  foregroundCallback = cb;
};

/**
 * Set the callback for when a notification is tapped by the user
 * (app was in background or closed, user taps it to open).
 */
export const setTapCallback = (cb: TapCallback): void => {
  tapCallback = cb;
};

// ──────────────────────────────────────────────────────
//  9. NOTIFICATION HISTORY (Firestore)
// ──────────────────────────────────────────────────────

/**
 * Save a notification to the user's notification history sub-collection.
 */
export const saveNotificationToHistory = async (
  userId: string,
  notification: NotificationPayload
): Promise<void> => {
  try {
    const colRef = collection(db, 'users', userId, 'notifications');
    await addDoc(colRef, {
      title: notification.title,
      body: notification.body,
      route: notification.route || null,
      data: notification.data || null,
      timestamp: Date.now(),
      read: false,
    });
  } catch (error) {
    console.warn('[Notifications] Failed to save notification history:', error);
  }
};

// ──────────────────────────────────────────────────────
//  10. CLEANUP
// ──────────────────────────────────────────────────────

/**
 * Remove all notification listeners to prevent memory leaks.
 * Call this on logout or component unmount.
 */
export const cleanupNotifications = async (userId?: string): Promise<void> => {
  // Remove FCM listener (we can't actually remove the onMessage listener,
  // but we nullify the callback so it becomes a no-op)
  foregroundCallback = null;
  tapCallback = null;
  listeners.fcm = false;
  isSetup = false;

  // Remove Capacitor listeners (native)
  if (isNativePlatform()) {
    try {
      if (listeners.capacitorReceive) {
        await PushNotifications.removeAllListeners();
      }
    } catch {
      // Ignore
    }
  }

  listeners.capacitorReceive = null;
  listeners.capacitorAction = null;
  listeners.capacitorRegister = null;
  listeners.capacitorError = null;

  // Optionally remove token from Firestore
  if (userId) {
    const cached = localStorage.getItem(TOKEN_CACHE_KEY);
    if (cached) {
      try {
        const { token } = JSON.parse(cached);
        await removeTokenFromFirestore(token, userId);
      } catch {
        // Ignore
      }
    }
  }

  console.log('[Notifications] Cleanup complete.');
};

/**
 * Check if notifications have already been set up in this session.
 */
export const isNotificationSetupComplete = (): boolean => isSetup;
