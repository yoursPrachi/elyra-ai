import { db } from "./firebase.js";
import { collection, query, where, getDocs, limit } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

export async function getSmartReply(text) {
    try {
        const t = text.toLowerCase().trim();
        const q = query(collection(db, "brain"), where("question", "==", t), limit(1));
        const snap = await getDocs(q);

        if (!snap.empty) {
            const data = snap.docs[0].data();
            // Multiple answers handle karein agar array hai
            if (data.answers && Array.isArray(data.answers)) {
                return data.answers[Math.floor(Math.random() * data.answers.length)];
            }
            return data.answer || "Bataiye, main aapki kya madad kar sakti hoon?";
        }

        // Agar database mein nahi hai
        return {
            status: "NEED_LEARNING",
            question: t,
            msg: "Hmm, iska jawab mujhe nahi pata. 😅 Kya tum mujhe bata sakte ho iska sahi jawab kya hoga?"
        };
    } catch (e) {
        console.error("Firestore Error:", e);
        // Error hone par direct retry ya simple msg
        return "Network thoda busy hai, ek baar phir try karein.";
    }
}
