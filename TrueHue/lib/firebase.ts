import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Firebase web config is public by design; access is governed by security rules.
const firebaseConfig = {
  apiKey: "AIzaSyA0EqeGBEsiQXmRw4hL6mT49SWj0-jGb5c",
  authDomain: "colorvalidation.firebaseapp.com",
  projectId: "colorvalidation",
  storageBucket: "colorvalidation.firebasestorage.app",
  messagingSenderId: "564628036503",
  appId: "1:564628036503:web:2e03fc06e4da0eac25c2d2",
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const storage = getStorage(app);
