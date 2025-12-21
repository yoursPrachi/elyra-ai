import { db, authReady } from "./firebase.js";
import { preReplies } from "./preReplies.js"; // Is file mein niche diye gaye answers rakhein
import { 
    collection, getDocs, doc, updateDoc, increment, query, orderBy, limit 
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

let brainCache = null;

// --- 1. Auto-Translation Logic ---
async function translateText(text, targetLang) {
    // International users ke liye placeholder
    console.log(`Translating to: ${targetLang}`);
    return text; 
}

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

// --- 3. Main Global Smart Reply ---
export async function getSmartReply(text) {
    const userLang = navigator.language.split('-')[0]; // Detect Language
    const lowerInput = text.toLowerCase().trim();

    // STEP 1: Instant Pre-Replies (No Server Delay)
    if (preReplies[lowerInput]) {
        return preReplies[lowerInput];
    }

    await authReady;

    try {
        // STEP 2: Cache High-Rating Brain (Top Trending)
        if (!brainCache) {
            const q = query(collection(db, "brain"), orderBy("hitCount", "desc"), limit(100));
            const snap = await getDocs(q);
            brainCache = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        }

        let bestMatch = null;
        let highestScore = 0;

        // STEP 3: Multi-Language Similarity Search
        brainCache.forEach(data => {
            const score = getSimilarity(lowerInput, (data.question || "").toLowerCase());
            if (score > highestScore) {
                highestScore = score;
                bestMatch = data;
            }
        });

        if (highestScore > 0.72) {
            const docRef = doc(db, "brain", bestMatch.id);
            updateDoc(docRef, { hitCount: increment(1) }).catch(e => console.log(e));

            const answers = bestMatch.answers || [bestMatch.answer];
            let reply = answers[Math.floor(Math.random() * answers.length)];

            // Step 4: Final Translation to User's Native Language
            if (userLang !== 'en' && userLang !== 'hi') {
                reply = await translateText(reply, userLang);
            }

            return reply;
        }

        // STEP 5: Learning Mode (Global)
        return {
            status: "NEED_LEARNING",
            question: lowerInput,
            msg: "I am still learning global nuances! Could you please teach me the best response? 😊"
        };
    } catch (e) {
        console.error("Global Connection Error:", e);
        return "Establishing global satellite connection... 🛰️";
    }
}
