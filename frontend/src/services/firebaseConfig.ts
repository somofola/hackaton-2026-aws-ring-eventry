import { initializeApp, getApps, FirebaseOptions, FirebaseApp } from 'firebase/app';

export const firebaseConfig: FirebaseOptions = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
};

export const firebaseApp: FirebaseApp =
  getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

/** Firebase Web Push VAPID key (from Firebase Console → Project Settings → Cloud Messaging) */
export const VAPID_KEY: string = import.meta.env.VITE_FIREBASE_VAPID_KEY ?? '';
