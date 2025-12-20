import { db, authReady } from "./firebase.js";
import { collection, query, where, getDocs, limit } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

// Unknown questions ke liye smart responses
const smartFallbacks = [
    "Hmm, ye sawal thoda gehra hai! 🤔 Kya tum mujhe iska sahi jawab bata sakte ho?",
    "Arre! Iska jawab toh mere digital dimaag se nikal gaya. 😅 Tum hi sikha do na?",
    "Interesting sawal hai! ✨ Par afsos mujhe iska jawab nahi pata. Batao iska reply kya hona chahiye?",
    "Oh! Lagta hai main ye wali class miss kar gayi. 😂 Kya tum mujhe iska answer bataoge?",
    "Tumhari baatein hamesha dimag ghumane wali hoti hain! 🧠 Iska jawab kya hoga?"
];

export async function getSmartReply(text) {
    try {
        const t = text.toLowerCase().trim();
        await authReady; 

        // 1. Brain search
        const q = query(collection(db, "brain"), where("question", "==", t), limit(1));
        const snap = await getDocs(q);

        if (!snap.empty) {
            const data = snap.docs[0].data();
            const answers = data.answers || [data.answer];
            return answers[Math.floor(Math.random() * answers.length)];
        }

        // 2. Fallback: Agar jawab nahi mila toh random smart reply pick karein
        const fallbackMsg = smartFallbacks[Math.floor(Math.random() * smartFallbacks.length)];
        
        return {
            status: "NEED_LEARNING",
            question: t,
            msg: fallbackMsg
        };
    } catch (e) {
        console.error("Fetch Error:", e);
        return "Network thoda nakhre kar raha hai, phir se try karo! 📶";
    }
}
