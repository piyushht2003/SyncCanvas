import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAhw47zazhifjdgk3Fr6H1ToMVIkOkhXzI",
  authDomain: "sync-canvas-8d67a.firebaseapp.com",
  projectId: "sync-canvas-8d67a",
  storageBucket: "sync-canvas-8d67a.firebasestorage.app",
  messagingSenderId: "431158838150",
  appId: "1:431158838150:web:0bc78392604788aa376207"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
