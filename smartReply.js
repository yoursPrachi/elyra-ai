import { db, authReady } from "./firebase.js";
import { collection, query, where, getDocs, limit } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

// Multi-language Greetings & Context
const globalContext = {
    "en": {
        "hello": ["Hello! How can I help you today? 🌎", "Hi! Elyra here, nice to meet you!"],
        "who are you": ["I am Elyra, your global AI friend. ✨"],
        "fallback": "That's interesting! I'm still learning global languages. Can you teach me what that means?"
    },
    "es": { // Spanish
        "hola": ["¡Hola! ¿Cómo estás? 🇪🇸", "¡Hola! Soy Elyra AI."],
        "fallback": "¡Qué interesante! Estoy aprendiendo español. ¿Qué significa eso?"
    },
    "ar": { // Arabic
        "marhaba": ["مرحباً! كيف حالك؟ 🇸🇦", "أهلاً بك، أنا إليرا."],
        "fallback": "هذا ممتع! أنا أتعلم اللغة العربية. ماذا يعني ذلك؟"
    }
};

export async function getSmartReply(text, lang = "hi") {
    try {
        const t = text.toLowerCase().trim();
        await authReady;

        // 1. Global Context Check (If user speaks English/Spanish/Arabic)
        for (let code in globalContext) {
            if (globalContext[code][t]) {
                const res = globalContext[code][t];
                return res[Math.floor(Math.random() * res.length)];
            }
        }

        // 2. Database Brain Search (Local & Global)
        const q = query(collection(db, "brain"), where("question", "==", t), limit(1));
        const snap = await getDocs(q);

        if (!snap.empty) {
            const data = snap.docs[0].data();
            const answers = data.answers || [data.answer];
            return answers[Math.floor(Math.random() * answers.length)];
        }

        // 3. Smart Fallback based on Detection
        return {
            status: "NEED_LEARNING",
            question: t,
            msg: "I'm still learning this part of the world! 🌍 Kya tum mujhe iska sahi jawab bata sakte ho?"
        };
    } catch (e) {
        return "Connecting to global servers... 🛰️";
    }
}
