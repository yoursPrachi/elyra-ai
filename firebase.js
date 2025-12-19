// Firebase CDN imports
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-analytics.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

// Your Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyCQCf2VcKQQ0C-cdon9SgSWwk0eC6Db1xk",
  authDomain: "elyra-ai-prod.firebaseapp.com",
  projectId: "elyra-ai-prod",
  storageBucket: "elyra-ai-prod.appspot.com",
  messagingSenderId: "29921626188",
  appId: "1:29921626188:web:89b20e940c233e4d3f0ce9",
  measurementId: "G-WPGZMCHN7M"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// Auth + DB
const auth = getAuth(app);
export const db = getFirestore(app);

// Anonymous login
signInAnonymously(auth)
  .then(() => console.log("Firebase Auth Connected"))
  .catch(err => console.error(err));
