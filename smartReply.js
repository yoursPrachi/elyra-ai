// smartReply.js - Pro Advance Version
import { db, authReady } from "./firebase.js";
import { preReplies } from "./preReplies.js";
import { 
    collection, getDocs, doc, updateDoc, increment, query, orderBy, limit, where 
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

let brainCache = null;

// --- 1. Mood & Personality Engine ---
function detectUserMood(history) {
    const lastMsgs = history.slice(-3).map(h => h.text.toLowerCase()).join(" ");
    if (lastMsgs.includes("gussa") || lastMsgs.includes("angry") || lastMsgs.includes("bad")) return "empathetic";
    if (lastMsgs.includes("pyaar") || lastMsgs.includes("love") || lastMsgs.includes("cute")) return "romantic";
    return "playful"; // Default Girl Personality
}

// --- 2. Advanced Global Reply Logic ---
export async function getSmartReply(text, history = []) {
    const lowerInput = text.toLowerCase().trim();
    const mood = detectUserMood(history);
    
    await authReady;

    // A. Personality Phrases based on Mood
    const moodResponses = {
        "empathetic": "Oh no.. tumhaara mood theek nahi hai kya? 🥺 Main hoon na, batao kya hua?",
        "romantic": "Aww.. tum itni pyaari baatein kaise kar lete ho? ❤️ 🙈",
        "playful": "Hehe! Tum kaafi filmy ho yaar.. aur sunao! 😜"
    };

    // Special Trigger for Mood Check
    if (lowerInput.includes("mood") || lowerInput.includes("kaise ho")) {
        return moodResponses[mood];
    }

    // B. Semantic Intent Matching (Placeholder for Neural logic)
    // Agar input short hai (Greetings), pre-replies use karein
    if (preReplies[lowerInput]) return preReplies[lowerInput];

    try {
        if (!brainCache) {
            const q = query(collection(db, "brain"), orderBy("hitCount", "desc"), limit(150));
            const snap = await getDocs(q);
            brainCache = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        }

        let bestMatch = null;
        let highestScore = 0;

        brainCache.forEach(data => {
            const score = getSimilarity(lowerInput, (data.question || "").toLowerCase());
            if (score > highestScore) {
                highestScore = score;
                bestMatch = data;
            }
        });

        // Threshold optimized for Hinglish (0.65)
        if (highestScore > 0.65) {
            const docRef = doc(db, "brain", bestMatch.id);
            updateDoc(docRef, { hitCount: increment(1) });
            
            let reply = Array.isArray(bestMatch.answers) 
                ? bestMatch.answers[Math.floor(Math.random() * bestMatch.answers.length)]
                : bestMatch.answer;

            // Adding a 'Girl Filter' to any DB answer
            return `${reply} ${mood === 'playful' ? '✨' : '😊'}`;
        }

        // C. Proactive Self-Learning with Personality
        return {
            status: "NEED_LEARNING",
            question: lowerInput,
            msg: "Mmm.. ye wala thoda tough hai. 🙈 Kya tum mujhe iska ek pyara sa jawab sikhaoge? Please? ✨"
        };

    } catch (e) { return "Satellite connection slow hai.. 🛰️ Phir se try karein?"; }
}
