import { initializeApp } from 'firebase/app';
import { getFirestore, initializeFirestore, type Firestore } from 'firebase/firestore';

const readEnv = (key: keyof ImportMetaEnv): string => {
  const valueFromMeta = import.meta.env?.[key];
  const valueFromProcess = typeof process !== 'undefined' ? process.env?.[key] : undefined;
  const value = valueFromMeta ?? valueFromProcess;
  if (!value) {
    throw new Error(`Missing environment variable: ${key}`);
  }
  return value;
};

const firebaseConfig = {
  apiKey: readEnv('VITE_FIREBASE_API_KEY'),
  authDomain: readEnv('VITE_FIREBASE_AUTH_DOMAIN'),
  projectId: readEnv('VITE_FIREBASE_PROJECT_ID'),
  storageBucket: readEnv('VITE_FIREBASE_STORAGE_BUCKET'),
  messagingSenderId: readEnv('VITE_FIREBASE_MESSAGING_SENDER_ID'),
  appId: readEnv('VITE_FIREBASE_APP_ID'),
};

const app = initializeApp(firebaseConfig);

const firestoreSettings = {
  experimentalForceLongPolling: true,
};

let dbInstance: Firestore;
try {
  dbInstance = initializeFirestore(app, firestoreSettings, 'jacksparrow01');
} catch {
  dbInstance = getFirestore(app, 'jacksparrow01');
}

export const db = dbInstance;
