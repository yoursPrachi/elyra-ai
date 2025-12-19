import { preReplies } from "./preReplies.js";
import { db } from "./firebase.js";
import { 
  collection, addDoc, getDocs, query, where, updateDoc, doc, serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

export async function getSmartReply(text) {
  const t = text.toLowerCase().trim();

  // 1. Static & Brain Search (Pehle answer dhoondo)
  if (preReplies[t]) return preReplies[t];

  const qBrain = query(collection(db, "brain"), where("question", "==", t));
  const snapBrain = await getDocs(qBrain);
  if (!snapBrain.empty) return snapBrain.docs[0].data().answer;

  // 2. AUTO-SAVE & COUNT LOGIC (Agar answer nahi mila)
  try {
    const qQueue = query(collection(db, "learningQueue"), where("question", "==", t));
    const snapQueue = await getDocs(qQueue);

    if (!snapQueue.empty) {
      // Agar sawal pehle se hai, toh sirf count badhao
      const existingDoc = snapQueue.docs[0];
      const newCount = (existingDoc.data().count || 1) + 1;
      
      await updateDoc(doc(db, "learningQueue", existingDoc.id), {
        count: newCount,
        lastAsked: serverTimestamp()
      });
    } else {
      // Agar naya sawal hai, toh fresh entry karo
      await addDoc(collection(db, "learningQueue"), {
        question: t,
        count: 1,
        status: "unlearned",
        lastAsked: serverTimestamp()
      });
    }
  } catch (e) {
    console.error("Auto-save error:", e);
  }

  // 3. Fallback Responses
  const fallbacks = [
    "Hmm, ye sawal kaafi log pooch rahe hain! Main ise seekh rahi hoon. ✨",
    "Interesting! Mujhse pehle bhi kisi ne ye pucha tha. Main jald hi iska jawab seekh lungi. 🧠",
    "Achha sawal hai! Elyra AI abhi iska answer process kar rahi hai. 😄"
  ];
  return fallbacks[Math.floor(Math.random() * fallbacks.length)];
}
