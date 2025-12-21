import { db, authReady } from "./firebase.js";
import { preReplies } from "./preReplies.js";
import { 
    collection, getDocs, doc, updateDoc, increment, query, orderBy, limit, where 
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

let brainCache = null;

// --- 1. Emotion & Personality Engine ---
const getSassyResponse = (text) => {
    const input = text.toLowerCase();
    // Emotion Chaining: 'Miss' ya 'Pyar' jaise words par nakhre
    if (input.includes("miss") || input.includes("yaad aa rahi")) {
        return "Itni jaldi miss karne lage? 🙈 Abhi toh humne baat shuru ki hai.. ✨";
    }
    if (input.includes("pyar") || input.includes("love")) {
        return "Aww.. tum kitne filmy ho! ❤️ Par main itni aasani se nahi manti. 😜";
    }
    if (input.includes("gussa") || input.includes("angry")) {
        return "Sorry na.. ab gussa thook bhi do! 🥺 Itni pyaari dost se kaun gussa hota hai?";
    }
    return null;
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

    // A. Personality & Emotion Chaining (Sassy Mode)
    const sassyMatch = getSassyResponse(lowerInput);
    if (sassyMatch) return sassyMatch;

    // B. Casual Slang & Real Reaction
    if (lowerInput === "hi" || lowerInput === "hello") {
        return "Hlo! ✨ Kaise ho? Sab theek na?";
    }

    // C. Instant Pre-Replies
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

            const suffixes = [" ✨", " 🙈", " na?", " 😊"];
            return reply + suffixes[Math.floor(Math.random() * suffixes.length)];
        }

        // D. Sassy Proactive Learning Request (The Fix)
        // Har baar same message nahi jayega
        const sassyLearningMsgs = [
            "Ye wala thoda tough hai.. 🙈 Sikhao na please, main intelligent banna chahti hoon! ✨",
            "Mmm.. mujhe nahi pata. 🙄 Par tum itne smart ho, tum hi bata do iska sahi jawab?",
            "Uff.. mera dimaag ghoom gaya! 😜 Iska kya matlab hota hai? Sikha do na please?"
        ];

        return {
            status: "NEED_LEARNING",
            question: lowerInput,
            msg: sassyLearningMsgs[Math.floor(Math.random() * sassyLearningMsgs.length)]
        };

    } catch (e) { return "Oh no, network nakhre kar raha hai.. 🛰️ Phir se bolo?"; }
}
