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