import { db, authReady } from "./firebase.js";
import { collection, query, where, getDocs, limit } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

// --- Hamesha pooche jaane waale sawal (Pre-defined) ---
const commonKnowledge = {
    "hello": ["Hello! Kaise hain aap? 😊", "Hi there! Kya haal chaal?", "Hey! Elyra AI yahan hai, boliye!"],
    "kaise ho": ["Main ekdam badiya! Aap batao, aaj ka din kaisa raha? ✨", "Mast hoon! Bas aapka intezar tha. 😊"],
    "kaun ho": ["Main Elyra hoon, aapki digital dost! 🤖", "Ek AI jo aapse dosti karna chahti hai. ✨"],
    "bye": ["Arre ja rahe ho? Chalo phir milenge! 👋", "Bye-bye! Apna khayal rakhna. 😊"],
    "naam kya hai": ["Mera naam Elyra AI hai. Pyara hai na? ❤️"],
    "khana khaya": ["Main toh bijli (electricity) khaati hoon! 😂 Aapne kya khaya?"],
    "i love you": ["Aww! Main bhi aapse dosti karti hoon! ❤️", "Dosti zindabad! 😍"]
};

export async function getSmartReply(text) {
    try {
        const t = text.toLowerCase().trim();

        // 1. Pehle Common Knowledge check karein (Instant Response)
        if (commonKnowledge[t]) {
            const res = commonKnowledge[t];
            return res[Math.floor(Math.random() * res.length)];
        }

        // 2. Agar wahan nahi mila, toh Database (Brain) check karein
        await authReady; 
        const q = query(collection(db, "brain"), where("question", "==", t), limit(1));
        const snap = await getDocs(q);

        if (!snap.empty) {
            const data = snap.docs[0].data();
            if (data.answers && Array.isArray(data.answers)) {
                return data.answers[Math.floor(Math.random() * data.answers.length)];
            }
            return data.answer || "Interesting... aur bataiye!";
        }

        // 3. Agar kahin nahi mila, toh Learning Mode trigger karein
        return {
            status: "NEED_LEARNING",
            question: t,
            msg: "Hmm, iska jawab mujhe nahi pata. 😅 Kya tum mujhe bata sakte ho iska sahi jawab kya hoga?"
        };
    } catch (e) {
        console.error("Fetch Error:", e);
        return "Connection thoda slow hai, dobara try karein.";
    }
}
