/**
 * Notification data payload sent from the backend.
 * These are received in both foreground and background.
 */
export interface NotificationPayload {
  title: string;
  body: string;
  /** Optional deep-link route to navigate to on tap (e.g. "/hostel" or "/hostel?tab=issues") */
  route?: string;
  /** Custom data sent alongside the notification */
  data?: Record<string, string>;
  /** Unique ID to deduplicate or group notifications */
  notificationId?: string;
}

/**
 * Normalized notification shape used internally by the app.
 */
export interface AppNotification {
  id: string;
  title: string;
  body: string;
  route?: string;
  data?: Record<string, string>;
  timestamp: number;
  /** Whether the user has tapped/interacted with this notification */
  read: boolean;
}

/**
 * Permission states the app tracks internally.
 */
export type NotificationPermissionStatus =
  | 'default'   // Not yet asked
  | 'granted'   // User allowed notifications
  | 'denied'    // User blocked notifications
  | 'unavailable'; // Environment doesn't support notifications

/**
 * Result from the native Capacitor push registration.
 */
export interface CapacitorRegistrationResult {
  token: string;
  platform: 'ios' | 'android' | 'web';
}

/**
 * A normalized notification event from either source (FCM or Capacitor).
 */
export interface NotificationEvent {
  /** The push payload */
  payload: NotificationPayload;
  /** Where it came from */
  source: 'fcm' | 'capacitor' | 'background';
  /** Whether the user tapped the notification to open the app */
  userTapped: boolean;
}
