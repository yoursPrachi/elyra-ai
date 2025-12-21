import { db, authReady } from "./firebase.js";
import { collection, query, where, getDocs, limit } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

// --- 1. Language Detection & Contextual Fallbacks ---
const languageLogic = {
    detect: (text) => {
        if (/[\u0600-\u06FF]/.test(text)) return "ar"; // Arabic
        if (/[a-zA-Z]/.test(text)) {
            // Check for Spanish common words as example
            if (/\b(hola|como|gracias|buenos)\b/i.test(text)) return "es"; 
            return "en"; // English/International
        }
        return "hi"; // Default Hinglish/Hindi
    },
    getFallback: (lang) => {
        const msgs = {
            "hi": "Hmm, mujhe iska jawab nahi pata. 😅 Kya tum mujhe sikha sakte ho?",
            "en": "That's interesting! I don't know the answer yet. 🌎 Can you teach me?",
            "es": "¡Qué interesante! No sé la respuesta. ¿Podrías enseñarme? 🇪🇸",
            "ar": "هذا ممتع! أنا لا أزال أتعلم. هل يمكنك تعليمي؟ 🇸🇦"
        };
        return msgs[lang] || msgs["en"];
    }
};

export async function getSmartReply(text) {
    try {
        const t = text.toLowerCase().trim();
        const userLang = languageLogic.detect(t);
        
        await authReady;

        // --- 2. Brain Search ---
        // Hum simple query rakhenge taaki aapko DB update na karna pade
        const q = query(collection(db, "brain"), where("question", "==", t), limit(1));
        const snap = await getDocs(q);

        if (!snap.empty) {
            const data = snap.docs[0].data();
            const answers = data.answers || [data.answer];
            return answers[Math.floor(Math.random() * answers.length)];
        }

        // --- 3. Smart Fallback (Unknown Question) ---
        // Agar DB mein nahi mila, toh bhasha ke hisab se reply karega
        return {
            status: "NEED_LEARNING",
            question: t,
            msg: languageLogic.getFallback(userLang)
        };

    } catch (e) {
        console.error("Global Brain Error:", e);
        return "System update ho raha hai... 🛰️✨";
    }
}
