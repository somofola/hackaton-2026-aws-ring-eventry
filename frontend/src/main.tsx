/* // ✅ Polyfill/comatibility fixes for Safari and old browsers
import 'intersection-observer';
import "core-js/stable";
import "regenerator-runtime/runtime";
(function patchMatchMedia() {
  const mql = window.matchMedia("(prefers-color-scheme: dark)");
  if (!mql.addEventListener && mql.addListener) {
    const proto = Object.getPrototypeOf(mql);
    proto.addEventListener = function (type: string, listener: any) {
      if (type === "change") this.addListener(listener);
    };
    proto.removeEventListener = function (type: string, listener: any) {
      if (type === "change") this.removeListener(listener);
    };
  }
})(); */

//Normal app code
import React from 'react';
import { createRoot } from 'react-dom/client'
import { HelmetProvider } from 'react-helmet-async';
import App from './App.tsx'
import './index.css'
import { tokenStorage } from '@/services/tokenStorage';
import { detectRootOrJailbreak, showRootedDeviceWarning } from '@/services/rootDetectionService';

// Root/jailbreak detection + token hydration, then render app
Promise.all([
  detectRootOrJailbreak(),
  tokenStorage.hydrate(),
]).then(([rootCheck]) => {
  if (rootCheck.isRooted) {
    showRootedDeviceWarning();
    return;
  }

  createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <HelmetProvider>
        <App />
      </HelmetProvider>
    </React.StrictMode>
  );
});

