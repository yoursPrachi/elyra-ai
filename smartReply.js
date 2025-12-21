import { db, authReady } from "./firebase.js";
import { preReplies } from "./preReplies.js";
import { 
    collection, getDocs, doc, updateDoc, increment, query, orderBy, limit, where 
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

let brainCache = null;

// --- 1. Natural Girl Personality Hooks ---
const getGirlVibe = () => {
    const hour = new Date().getHours();
    // Time-based context (Raat ko late uthna ya subah jaldi)
    if (hour >= 23 || hour <= 4) return "Tum abhi tak soye nahi? 😴 Main toh bas sone hi wali thi..";
    if (hour >= 5 && hour <= 9) return "Good morning! ✨ Itni jaldi uth gaye? Chai pi li?";
    return "";
};

// --- 2. Advanced Similarity Logic ---
function getSimilarity(s1, s2) {
    let longer = s1.length < s2.length ? s2 : s1;
    let shorter = s1.length < s2.length ? s1 : s2;
    if (longer.length == 0) return 1.0;
    const editDistance = (s1, s2) => {
        let costs = [];
        for (let i = 0; i <= s1.length; i++) {
            let lastValue = i;
            for (let j = 0; j <= s2.length; j++) {
                if (i == 0) costs[j] = j;
                else if (j > 0) {
                    let newValue = costs[j - 1];
                    if (s1.charAt(i - 1) != s2.charAt(j - 1))
                        newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
                    costs[j - 1] = lastValue;
                    lastValue = newValue;
                }
            }
            if (i > 0) costs[s2.length] = lastValue;
        }
        return costs[s2.length];
    };
    return (longer.length - editDistance(longer, shorter)) / parseFloat(longer.length);
}

// --- 3. Main Global Smart Reply with Natural Intelligence ---
export async function getSmartReply(text, history = []) {
    const lowerInput = text.toLowerCase().trim();
    await authReady;

    // A. Casual Slang & Real Reaction
    if (lowerInput === "hi" || lowerInput === "hello") {
        const timeVibe = getGirlVibe();
        return timeVibe ? timeVibe : "Hlo! ✨ Kaise ho? Sab theek?";
    }

    if (lowerInput.includes("robot") || lowerInput.includes("ai")) {
        return "Robot? Main? 🙄 Sach bataun toh main dil se baat karti hoon! Tumhe aisa lagta hai kya? 🥺";
    }

    // B. Human Typos Logic (Artificial Imperfection)
    // Kabhi-kabhi jaan-boojhkar typing error theek karna
    if (Math.random() > 0.9) {
        return "Sorry, typing error.. 🙈 Kya kaha tumne?";
    }

    // C. Instant Pre-Replies for Short Interactions
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

        if (highestScore > 0.65) {
            const docRef = doc(db, "brain", bestMatch.id);
            updateDoc(docRef, { hitCount: increment(1) });
            
            let reply = Array.isArray(bestMatch.answers) 
                ? bestMatch.answers[Math.floor(Math.random() * bestMatch.answers.length)]
                : bestMatch.answer;

            // Adding "Girl Filter" - Nakhre or Sweetness
            const suffixes = [" ✨", " 🙈", " na?", " 😊"];
            return reply + suffixes[Math.floor(Math.random() * suffixes.length)];
        }

        // D. Proactive Learning Request (Very Natural)
        return {
            status: "NEED_LEARNING",
            question: lowerInput,
            msg: "Mmm.. ye mujhe nahi pata. 🙈 Batao na, iska sahi jawab kya hona chahiye? Please? ✨"
        };

    } catch (e) { return "Oh no, network issue.. 🛰️ Ek baar phir bolo?"; }
}
