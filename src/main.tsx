import { Buffer } from 'buffer';
if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).Buffer = Buffer;
  (globalThis as unknown as Record<string, unknown>).Buffer = Buffer;
}

import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import {TonConnectUIProvider} from '@tonconnect/ui-react';
import App from './App.tsx';
import './index.css';

// Silently handle background TonConnect analytics/bridge fetch failures in sandboxed previews
if (typeof window !== 'undefined') {
  const originalError = console.error;
  console.error = (...args: unknown[]) => {
    const errorMsg = args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ');
    if (errorMsg.includes('TON_CONNECT_SDK') || errorMsg.includes('analytics API error')) {
      return;
    }
    originalError.apply(console, args);
  };

  window.addEventListener('unhandledrejection', (event) => {
    const reasonStr = String(event.reason?.message || event.reason || '');
    if (
      reasonStr.includes('TON_CONNECT_SDK') ||
      reasonStr.includes('analytics')
    ) {
      event.preventDefault();
    }
  });
}

const manifestUrl = 'https://familiei.netlify.app/tonconnect-manifest.json';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <TonConnectUIProvider manifestUrl={manifestUrl}>
      <App />
    </TonConnectUIProvider>
  </StrictMode>,
);

