import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.passmobilegeneral.app',
  appName: 'Pass Mobile Extreme',
  webDir: 'dist',
  plugins: {
    Filesystem: {
      directory: 'DOCUMENTS'
    },
    Share: {
      // no extra config needed, just enabled
    },
    Contacts: {
      // only needed if you want defaults (some plugins require it)
    }
  }
};

export default config;
