import { db } from "../firebase.js";
import {
  collection, addDoc, serverTimestamp, query, where, getDocs
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";
import { addMsg } from "../utils/dom.js";

export async function initiateInternationalGreeting(name, mode, city) {
  if (sessionStorage.getItem("greeted")) return;

  await addDoc(collection(db, "analytics"), {
    timestamp: serverTimestamp(),
    user: name,
    platform: "International-Web"
  });

  let memoryRecall = "";
  const email = localStorage.getItem("userEmail");
  if (email && !email.includes("guest")) {
    const q = query(collection(db, "users_list"), where("email", "==", email));
    const snap = await getDocs(q);
    if (!snap.empty && snap.docs[0].data().memories) {
      const memories = snap.docs[0].data().memories;
      memoryRecall = ` Waise yaad hai, tumne kaha tha: "${memories[memories.length-1].text}" 😊`;
    }
  }

  setTimeout(() => {
    const greet = `Hlo **${name}**! ✨ Sab theek in ${city}?${memoryRecall}`;
    addMsg(greet, "bot");
    sessionStorage.setItem("greeted", "true");
  }, 1200);
}
