import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBOwRa8RCeLKIvJ9E5cbkq0SsrpnFCjt_w",
  authDomain: "workout-warrior-xsbv1.firebaseapp.com",
  projectId: "workout-warrior-xsbv1",
  storageBucket: "workout-warrior-xsbv1.firebasestorage.app",
  messagingSenderId: "286877296059",
  appId: "1:286877296059:web:46e38d13e30a9d8c60509e",
};

let app: FirebaseApp;
let auth: Auth;
let db: Firestore;

if (typeof window !== 'undefined' && !getApps().length) {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
} else {
  app = getApp();
  auth = getAuth(app);
  db = getFirestore(app);
}

export { app, auth, db };
