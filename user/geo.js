import { db } from "../firebase.js";
import {
  query, collection, where, getDocs, addDoc, updateDoc, increment
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

export async function getAndSaveUser(name, email) {
  try {
    const res = await fetch('https://ipapi.co/json/');
    const geo = await res.json();

    localStorage.setItem("userName", name);
    localStorage.setItem("userEmail", email);
    localStorage.setItem("userCity", geo.city || "Global");

    const q = query(collection(db, "users_list"), where("email", "==", email));
    const snap = await getDocs(q);

    if (snap.empty) {
      await addDoc(collection(db, "users_list"), {
        name, email,
        city: geo.city || "Global",
        country: geo.country_name || "Global",
        lat: geo.latitude || 20,
        lng: geo.longitude || 0,
        visitCount: 1,
        joinDate: new Date().toISOString(),
        lastSeen: new Date().toISOString()
      });
    } else {
      await updateDoc(snap.docs[0].ref, {
        visitCount: increment(1),
        lastSeen: new Date().toISOString()
      });
    }
    return geo.city || "Earth";
  } catch (e) { return "Earth"; }
}
