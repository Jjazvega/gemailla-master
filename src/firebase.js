import { initializeApp } from 'firebase/app';
import { connectAuthEmulator, getAuth } from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore';
import { connectStorageEmulator, getStorage } from 'firebase/storage';

const runtimeConfig = typeof window !== 'undefined' ? window.GEMAILLA_FIREBASE_CONFIG || {} : {};

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || runtimeConfig.apiKey,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || runtimeConfig.authDomain,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || runtimeConfig.projectId,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || runtimeConfig.storageBucket,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || runtimeConfig.messagingSenderId,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || runtimeConfig.appId,
};

function shouldUseFirebaseEmulators() {
  if (typeof window === 'undefined') return false;
  const setting = window.GEMAILLA_USE_FIREBASE_EMULATORS;
  if (setting === true || setting === 'true') return true;
  if (setting === false || setting === 'false') return false;
  return ['localhost', '127.0.0.1'].includes(window.location.hostname);
}

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

if (shouldUseFirebaseEmulators() && !globalThis.__GEMAILLA_FIREBASE_EMULATORS__) {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
  connectStorageEmulator(storage, '127.0.0.1', 9199);
  globalThis.__GEMAILLA_FIREBASE_EMULATORS__ = true;
}

export default app;
