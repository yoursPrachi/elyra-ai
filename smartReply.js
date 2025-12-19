import { preReplies } from "./preReplies.js";
import { db } from "./firebase.js";
import { 
  collection, addDoc, getDocs, query, where, updateDoc, doc, serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

export async function getSmartReply(text) {
  const t = text.toLowerCase().trim();

  // 1. Pehle Pre-replies check karo
  if (preReplies[t]) return preReplies[t];

  // 2. Fir Brain (Learned answers) check karo
  try {
    const qBrain = query(collection(db, "brain"), where("question", "==", t));
    const snapBrain = await getDocs(qBrain);
    if (!snapBrain.empty) return snapBrain.docs[0].data().answer;
  } catch (e) { console.error(e); }

  // 3. AGAR NAHI MILA -> Save or Update in Queue
  await handleDuplicateQuestion(t);

  // Fallback return karo
  return {
    type: "LEARNING_MODE",
    question: t,
    msg: "Hmm, iska jawab mujhe nahi pata. 😅 Kya tum mujhe bata sakte ho iska sahi jawab kya hoga?"
  };
}

// --- Duplicate Check Function ---
async function handleDuplicateQuestion(question) {
  try {
    const qQueue = query(collection(db, "learningQueue"), where("question", "==", question));
    const snapQueue = await getDocs(qQueue);

    if (!snapQueue.empty) {
      // Agar sawal pehle se hai, toh duplicate create mat karo, sirf count badhao
      const existingDoc = snapQueue.docs[0];
      const newCount = (existingDoc.data().count || 1) + 1;
      
      await updateDoc(doc(db, "learningQueue", existingDoc.id), {
        count: newCount,
        lastAsked: serverTimestamp() // Time update karo
      });
      console.log("Count updated for existing question.");
    } else {
      // Agar bilkul naya hai, tabhi addDoc karo
      await addDoc(collection(db, "learningQueue"), {
        question: question,
        count: 1,
        status: "unlearned",
        createdAt: serverTimestamp()
      });
      console.log("New question saved to queue.");
    }
  } catch (e) {
    console.error("Queue management error:", e);
  }
}
