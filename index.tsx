import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
// 👇 1. Import the ErrorBoundary
import { ErrorBoundary } from './components/ErrorBoundary';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    {/* 👇 2. Wrap App inside ErrorBoundary */}
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);

// Register Service Workers
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // 3a. Register PWA Workbox Service Worker (from vite-plugin-pwa)
    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => console.log('✅ PWA Service Worker registered:', reg.scope))
      .catch((err) => console.error('❌ PWA Service Worker failed:', err));

    // 3b. Register Firebase Messaging Service Worker (for background push)
    navigator.serviceWorker
      .register('/firebase-messaging-sw.js')
      .then((reg) => console.log('✅ Firebase Messaging SW registered:', reg.scope))
      .catch((err) => console.error('❌ Firebase Messaging SW failed:', err));
  });
}
