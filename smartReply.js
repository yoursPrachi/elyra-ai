import { db, authReady } from "./firebase.js";
import { preReplies } from "./preReplies.js";
import { 
    collection, getDocs, doc, updateDoc, increment, query, orderBy, limit, addDoc, serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

let brainCache = null;

// --- 1. INTERNATIONAL EMOTION & LANGUAGE ENGINE ---
const getGlobalReaction = (text) => {
    const input = text.toLowerCase();
    
    // International Multi-lingual Emotional Hooks
    const triggers = {
        miss: ["miss", "yaad", "te extraño", "tu me manques"],
        love: ["love", "pyar", "te amo", "je t'aime"],
        identity: ["kaun ho", "who are you", "quién eres", "qui es-tu"]
    };

    if (triggers.miss.some(t => input.includes(t))) {
        return "Itni jaldi miss karne lage? 🙈 Abhi toh humne baat shuru ki hai.. ✨";
    }
    if (triggers.love.some(t => input.includes(t))) {
        return "Aww.. tum kitne filmy ho! ❤️ Par main itni aasani se nahi manti. 😜";
    }
    if (triggers.identity.some(t => input.includes(t))) {
        return "Main Elyra hoon, tumhari global digital dost! ✨ Waise tum kahan se ho? 🌍";
    }
    return null;
};

// --- 2. ADVANCED ANALYTICS LOGGING (International Standard) ---
async function logInteraction(query, status, score) {
    try {
        await addDoc(collection(db, "analytics"), {
            query,
            status,
            confidence: score,
            timestamp: serverTimestamp(),
            platform: "Web-International"
        });
    } catch (e) { console.warn("Analytics Sync Skipped."); }
}

// --- 3. CORE INTELLIGENCE ---
export async function getSmartReply(text, history = []) {
    const lowerInput = text.toLowerCase().trim();
    await authReady;

    // A. Global Personality Response
    const reaction = getGlobalReaction(lowerInput);
    if (reaction) {
        logInteraction(lowerInput, "PERSONALITY", 1.0);
        return reaction;
    }

    // B. Fast-Path Pre-Replies
    if (preReplies[lowerInput]) {
        logInteraction(lowerInput, "PRE_REPLY", 1.0);
        return preReplies[lowerInput];
    }

    try {
        if (!brainCache) {
            const q = query(collection(db, "brain"), orderBy("hitCount", "desc"), limit(200));
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

        // Neural Threshold: 0.65 for Hinglish, 0.75 for Global English
        if (highestScore > 0.65) {
            const docRef = doc(db, "brain", bestMatch.id);
            updateDoc(docRef, { hitCount: increment(1) });
            
            let reply = Array.isArray(bestMatch.answers) 
                ? bestMatch.answers[Math.floor(Math.random() * bestMatch.answers.length)]
                : bestMatch.answer;

            logInteraction(lowerInput, "BRAIN_MATCH", highestScore);
            return `${reply} ✨`;
        }

        // C. International Intelligent Fallback
        logInteraction(lowerInput, "LEARNING_MODE", highestScore);
        
        if (lowerInput.length > 25) {
            return "Baat toh tumhari gehri hai.. 🌍 par main thoda confuse ho gayi. Thoda simple samjhao na? 🙈";
        }

        return {
            status: "NEED_LEARNING",
            question: lowerInput,
            msg: "Mmm.. ye wala thoda tough hai. 🙈 Sikhao na please? Main intelligent banna chahti hoon! ✨"
        };

    } catch (e) { 
        console.error(e);
        return "Oh no, satellite connection is acting up.. 🛰️ Ek baar phir bolo?"; 
    }
}

// Edit Distance Logic (Similarity)
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
