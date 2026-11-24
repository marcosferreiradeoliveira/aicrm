import { initializeApp } from "firebase/app";
import { getAnalytics, isSupported, type Analytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyA3ZGeInWidbKoNmhL-vc11PiqCq3wCPto",
  authDomain: "aicrm-7246d.firebaseapp.com",
  projectId: "aicrm-7246d",
  storageBucket: "aicrm-7246d.firebasestorage.app",
  messagingSenderId: "633094936643",
  appId: "1:633094936643:web:b872c1eff09ae9f24f9cf6",
  measurementId: "G-XZ3ERWFNC8",
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

export const analytics: Promise<Analytics | null> = isSupported().then(
  (supported) => (supported ? getAnalytics(app) : null),
);
