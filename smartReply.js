import { preReplies } from "./preReplies.js";
import { db } from "./firebase.js";
import { collection, addDoc } from
"https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

export async function getSmartReply(text) {
  const t = text.toLowerCase();

  for (let r of preReplies) {
    if (r.q.some(w => t.includes(w))) return r.a;
  }

  await addDoc(collection(db, "learningQueue"), {
    question: text,
    time: Date.now()
  });

  const fallback = [
    "Interesting 🤔 aur batao",
    "Achha sawal hai 👀",
    "Ispe sochna padega 😄"
  ];
  return fallback[Math.floor(Math.random() * fallback.length)];
}
