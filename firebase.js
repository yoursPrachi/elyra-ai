import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCQCf2VcKQQ0C-cdon9SgSWwk0eC6Db1xk",
  authDomain: "elyra-ai-prod.firebaseapp.com",
  projectId: "elyra-ai-prod",
  storageBucket: "elyra-ai-prod.appspot.com",
  messagingSenderId: "29921626188",
  appId: "1:29921626188:web:89b20e940c233e4d3f0ce9"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
export const db = getFirestore(app);

// Auth ensure karne ke liye global promise
export const authReady = signInAnonymously(auth);
