import { db } from "./firebase.js";
import { collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

export async function getSmartReply(text) {
    try {
        const t = text.toLowerCase().trim();
        const q = query(collection(db, "brain"), where("question", "==", t));
        const snap = await getDocs(q);

        if (!snap.empty) {
            const data = snap.docs[0].data();
            
            // Check for Multiple Answers (Array)
            if (data.answers && Array.isArray(data.answers)) {
                return data.answers[Math.floor(Math.random() * data.answers.length)];
            } 
            // Fallback for single answer
            return data.answer || "Bataiye, main aapki kya madad kar sakti hoon?";
        }

        // Agar database mein nahi hai, toh learning object return karein
        return {
            status: "NEED_LEARNING",
            question: t,
            msg: "Hmm, iska jawab mujhe nahi pata. 😅 Kya tum mujhe bata sakte ho iska sahi jawab kya hoga?"
        };
    } catch (e) {
        console.error("Database Error:", e);
        return "Connection thoda slow hai, dobara try karein.";
    }
}
