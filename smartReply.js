import { preReplies } from "./preReplies.js";
import { db } from "./firebase.js";
import { 
  collection, addDoc, getDocs, query, where, updateDoc, doc, serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

export async function getSmartReply(text) {
  const t = text.toLowerCase().trim();

  // --- STEP 1: STATIC PRE-REPLIES (Priority #1) ---
  // Sabse pehle 'hi', 'hello' jaise fix answers check karo
  if (preReplies[t]) {
    return preReplies[t];
  }

  // --- STEP 2: LEARNED BRAIN (Priority #2) ---
  // Fir wo check karo jo aapne admin panel se sikhaya hai
  try {
    const qBrain = query(collection(db, "brain"), where("question", "==", t));
    const snapBrain = await getDocs(qBrain);
    if (!snapBrain.empty) {
      return snapBrain.docs[0].data().answer;
    }
  } catch (e) {
    console.error("Brain search error:", e);
  }

  // --- STEP 3: AUTO-SAVE TO QUEUE (Last Resort) ---
  // Agar upar dono mein nahi mila, tabhi queue mein daalo
  try {
    const qQueue = query(collection(db, "learningQueue"), where("question", "==", t));
    const snapQueue = await getDocs(qQueue);

    if (!snapQueue.empty) {
      const existingDoc = snapQueue.docs[0];
      const newCount = (existingDoc.data().count || 1) + 1;
      await updateDoc(doc(db, "learningQueue", existingDoc.id), {
        count: newCount,
        lastAsked: serverTimestamp()
      });
    } else {
      await addDoc(collection(db, "learningQueue"), {
        question: t,
        count: 1,
        status: "unlearned",
        lastAsked: serverTimestamp()
      });
    }
  } catch (e) {
    console.error("Queue save error:", e);
  }

  // Fallback Response
  const fallbacks = [
    "Hmm, interesting 🤔 Iske baare mein aur batao.",
    "Achha sawal hai 👀 Main ise seekhne ki koshish karungi!",
    "Ispe thoda sochna padega 😄 Wese aapka din kaisa ja raha hai?"
  ];
  return fallbacks[Math.floor(Math.random() * fallbacks.length)];
}
