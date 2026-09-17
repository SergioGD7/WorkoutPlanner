import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, initializeAuth, indexedDBLocalPersistence, Auth } from 'firebase/auth';
import { Capacitor } from '@capacitor/core';
import { getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager, Firestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBOwRa8RCeLKIvJ9E5cbkq0SsrpnFCjt_w",
  authDomain: "workout-warrior-xsbv1.firebaseapp.com",
  projectId: "workout-warrior-xsbv1",
  storageBucket: "workout-warrior-xsbv1.firebasestorage.app",
  messagingSenderId: "286877296059",
  appId: "1:286877296059:web:46e38d13e30a9d8c60509e",
};

const app: FirebaseApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

/**
 * Auth is wired differently inside the native shells.
 *
 * `getAuth()` bundles the popup/redirect resolver, which on start-up loads an
 * iframe from `authDomain` to prepare for `signInWithRedirect`. On Android the
 * WebView serves the app from `https://localhost`, so that works. On iOS the
 * origin is `capacitor://localhost`, the iframe never finishes, initialisation
 * never completes, and `onAuthStateChanged` never fires — the app sat on its
 * loading spinner forever with no error anywhere. This app only signs in with
 * email and password, so the resolver has nothing to do in any case.
 *
 * `initializeAuth` with an explicit persistence and no resolver is the
 * arrangement Capacitor documents for exactly this.
 */
function createAuth(): Auth {
  if (typeof window !== 'undefined' && Capacitor.isNativePlatform()) {
    return initializeAuth(app, { persistence: indexedDBLocalPersistence });
  }
  return getAuth(app);
}

const auth: Auth = createAuth();

let db: Firestore;
if (typeof window !== 'undefined') {
  try {
    db = initializeFirestore(app, {
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
      // Optional fields on sets (rpe, duration, notes) are simply absent when
      // unset; without this a single `undefined` would reject the whole write.
      ignoreUndefinedProperties: true,
    });
  } catch (error) {
    // Fallback if already initialized (e.g., during Next.js HMR)
    db = getFirestore(app);
  }
} else {
  // Fallback for Server-Side Rendering
  db = getFirestore(app);
}

export { app, auth, db };
