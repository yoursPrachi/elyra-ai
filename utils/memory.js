import { db } from "../firebase.js";
import {
  query, collection, where, getDocs, updateDoc, arrayUnion
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

export function initMemory() {}

export async function saveToGlobalMemory(text) {
  const email = localStorage.getItem("userEmail");
  if (!email || email.includes("guest")) return;
  const triggers = ["rehta hoon", "pasand hai", "born in", "my name is"];
  if (triggers.some(t => text.toLowerCase().includes(t))) {
    const q = query(collection(db, "users_list"), where("email", "==", email));
    const snap = await getDocs(q);
    if (!snap.empty) {
      await updateDoc(snap.docs[0].ref, {
        memories: arrayUnion({ text, date: new Date().toISOString() })
      });
    }
  }
}
