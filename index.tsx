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

// Remove loader if it exists (React 18 usually handles hydration, but we want a clean swap)
const loader = document.getElementById('initial-loader');
if (loader) {
    // We can add a transition class here if we want a fade out effect
    loader.style.opacity = '0';
    setTimeout(() => loader.remove(), 500);
}

const root = ReactDOM.createRoot(rootElement);

// Strict Mode + Error Boundary = Production Ready
root.render(
  <React.StrictMode>
    <ErrorBoundary>
        <App />
    </ErrorBoundary>
  </React.StrictMode>
);

// Performance logging (only if needed)
// reportWebVitals(console.log);
