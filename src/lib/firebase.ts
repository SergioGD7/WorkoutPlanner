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

const app: FirebaseApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const auth: Auth = getAuth(app);
const db: Firestore = getFirestore(app);

export { app, auth, db };
