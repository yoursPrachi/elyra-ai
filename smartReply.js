import { preReplies } from "./preReplies.js";
import { db } from "./firebase.js";
import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

export async function getSmartReply(text) {
  const t = text.toLowerCase().trim();

  // 1. Direct Object Lookup (Sabse fast)
  if (preReplies[t]) {
    return preReplies[t];
  }

  // 2. Keyword Search (Agar pura sentence match na ho, to main word dhoondo)
  const keys = Object.keys(preReplies);
  for (let key of keys) {
    if (t.includes(key)) {
      return preReplies[key];
    }
  }

  // 3. Learning Queue (Firebase mein save karo taaki aap baad mein sikha sakein)
  try {
    await addDoc(collection(db, "learningQueue"), {
      question: text,
      status: "unlearned",
      time: serverTimestamp() // Date.now() ki jagah serverTimestamp better hai
    });
  } catch (e) {
    console.error("Firebase Error:", e);
  }

  // 4. Fallback (Jab bot ko kuch samajh na aaye)
  const fallback = [
    "Hmm, interesting 🤔 Iske baare mein aur batao.",
    "Achha sawal hai 👀 Main ise seekhne ki koshish karunga!",
    "Ispe thoda sochna padega 😄 Wese aapka din kaisa ja raha hai?",
    "Elyra AI abhi ye seekh rahi hai... ✨ Kuch aur puchiye?"
  ];
  
  return fallback[Math.floor(Math.random() * fallback.length)];
}
