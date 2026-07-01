import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
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
const auth: Auth = getAuth(app);

let db: Firestore;
if (typeof window !== 'undefined') {
  try {
    db = initializeFirestore(app, {
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
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
