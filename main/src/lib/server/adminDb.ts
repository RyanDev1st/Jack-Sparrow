import { getApps, initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

type Runtime = {
  process?: {
    env?: Record<string, string | undefined>;
  };
};

const readEnv = (key: string): string => {
  const value = (globalThis as Runtime).process?.env?.[key];
  if (!value) {
    throw new Error(`Missing server env: ${key}`);
  }
  return value;
};

const app =
  getApps()[0] ??
  initializeApp({
    credential: cert({
      projectId: readEnv('FIREBASE_PROJECT_ID'),
      clientEmail: readEnv('FIREBASE_CLIENT_EMAIL'),
      privateKey: readEnv('FIREBASE_PRIVATE_KEY').replace(/\\n/g, '\n'),
    }),
  });

export const adminDb = getFirestore(app, 'jacksparrow01');
