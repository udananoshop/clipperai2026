import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCmugJFvpo5UuyV0BIBugOjR3u9zeV81Tk",
  authDomain: "clipperai2026-ec527.firebaseapp.com",
  projectId: "clipperai2026-ec527",
  storageBucket: "clipperai2026-ec527.firebasestorage.app",
  messagingSenderId: "632179419953",
  appId: "1:632179419953:web:0daaf27086c2f2e9139e10"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);