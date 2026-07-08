# CampDex → React Native (Expo) Migration

## App Overview
**CampDex** — Hostel campus coordination platform (mess, hostel, sports, canteen, laundry)
- **Framework:** Vite + React 19 + TypeScript
- **Styling:** Tailwind CSS (CDN)
- **Backend:** Firebase Firestore + Firebase Admin SDK (Cloud Functions)
- **Auth:** Firestore-based mock auth (password in DB)
- **Notifications:** Firebase Cloud Messaging
- **AI:** Google Gemini API
- **Routing:** React Router DOM (HashRouter)
- **Charts:** Recharts
- **Icons:** Lucide React
- **Animations:** Lottie React
- **PWA:** vite-plugin-pwa
- **Mobile wrapper:** Capacitor (already present but unused effectively)

## Backend Decision
✅ **Keep Firebase deployed** — The native app becomes an HTTP/Firestore client. Firebase config is already present.

## Screen Buckets

| Screen | Bucket | Priority | Notes |
|--------|--------|----------|-------|
| Login | **nativize-now** | High | ✅ Done |
| HomeHub (Service Grid) | **nativize-now** | High | ✅ Done |
| StudentDashboard (Mess) | **nativize-now** | High | ✅ Done |
| AdminDashboard | **nativize-now** | High | 🚧 In progress (agent) |
| HostelDashboard | **nativize-now** | Medium | ✅ Done |
| SportsDashboard | **nativize-now** | Medium | ✅ Done |
| AdminChatBot | **nativize-now** | Medium | ⬜ Pending |
| ComingSoon | **port-as-is** | Low | ⬜ Pending |

## Framework Signals
- **Tailwind CDN** → React Native styling (StyleSheet)
- **Lucide React** → `@expo/vector-icons` (Ionicons)
- **Recharts** → Simple View-based charts / react-native-chart-kit
- **React Router** → Expo Router (file-based)
- **Lottie React** → `lottie-react-native`
- **localStorage** → `AsyncStorage`
- **Capacitor** → Removed
- **import.meta.env** → `process.env.EXPO_PUBLIC_*`

## Third-Party SDKs
- **Firebase** → Firebase web SDK (works in Expo)
- **Gemini** → `fetch`-based (keeps working in RN)
- **Notifications** → `expo-notifications` + FCM

## Progress

- [x] Assessment & worklist (this file)
- [x] Scaffold Expo shell with Expo Router
- [x] Port services layer (types, firebase, mockDb, timeUtils)
- [x] Login screen
- [x] HomeHub (service grid)
- [x] Mess module (StudentDashboard)
- [x] Hostel module
- [x] Sports module
- [ ] Admin Dashboard (agent working)
- [ ] Admin ChatBot
- [ ] Wire data, auth, and storage
- [ ] Test & polish
