import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ErrorBoundary } from './src/ErrorBoundary';
// Optional: Performance monitoring
// import { reportWebVitals } from './src/reportWebVitals';

const rootElement = document.getElementById('root');

if (!rootElement) {
  // If we can't find root, we are in trouble.
  // Create one and append to body as fallback? No, just throw.
  throw new Error("CRITICAL: DOM Root element not found.");
}

// Loader is handled by index.html script for the "Super Slow" effect

const root = ReactDOM.createRoot(rootElement);

// Strict Mode + Error Boundary = Production Ready
root.render(
  <React.StrictMode>
    <ErrorBoundary>
        <App />
    </ErrorBoundary>
  </React.StrictMode>
);

// Report successful boot logic has been moved to App.tsx via SecurityService

// Performance logging (only if needed)
// reportWebVitals(console.log);
