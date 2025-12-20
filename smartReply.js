import { db } from "./firebase.js";
import { collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

export async function getSmartReply(text) {
    const t = text.toLowerCase().trim();
    const q = query(collection(db, "brain"), where("question", "==", t));
    const snap = await getDocs(q);

    if (!snap.empty) {
        const data = snap.docs[0].data();
        
        // Handle Multiple Answers (Array)
        if (data.answers && Array.isArray(data.answers)) {
            const randomIndex = Math.floor(Math.random() * data.answers.length);
            return data.answers[randomIndex];
        } 
        // Handle Single Answer (String)
        return data.answer || "Main thoda confuse hoon, fir se bolo?";
    }

    // Learning Mode Trigger
    return {
        type: "LEARNING_MODE",
        question: t,
        msg: "Hmm, iska jawab mujhe nahi pata. 😅 Kya tum mujhe bata sakte ho iska sahi jawab kya hoga?"
    };
}
