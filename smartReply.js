import { db, authReady } from "./firebase.js";
import { preReplies } from "./preReplies.js";
import { 
    collection, getDocs, doc, updateDoc, increment, query, orderBy, limit 
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

let brainCache = null;

// --- 1. Translation Layer (Internal Logic) ---
async function translateText(text, targetLang) {
    try {
        // Yahan aap Google Translate ya LibreTranslate ki API call kar sakte hain.
        // Filhal ye ek placeholder hai jo international structure ko handle karega.
        // Global launch ke liye yahan API key integrate karni hogi.
        console.log(`Translating to ${targetLang}...`);
        return text; 
    } catch (e) { return text; }
}

// --- 2. Spelling & Mood Logic ---
const spellFix = { "hlo": "hello", "kese": "kaise", "u": "you" };
function autoCorrect(text) {
    let words = text.toLowerCase().split(/\s+/);
    return words.map(word => spellFix[word] || word).join(" ");
}

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

// --- 3. Main Smart Reply with Translation ---
export async function getSmartReply(text) {
    const userLang = navigator.language.split('-')[0]; // Detect User Language
    let processedInput = autoCorrect(text.trim());

    // Step A: Check Pre-Replies (Fastest)
    if (preReplies[processedInput.toLowerCase()]) {
        return preReplies[processedInput.toLowerCase()];
    }

    await authReady;

    try {
        // Step B: Load & Cache Brain
        if (!brainCache) {
            const q = query(collection(db, "brain"), orderBy("hitCount", "desc"), limit(100));
            const snap = await getDocs(q);
            brainCache = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        }

        let bestMatch = null;
        let highestScore = 0;

        // Step C: Similarity Search
        brainCache.forEach(data => {
            const score = getSimilarity(processedInput.toLowerCase(), (data.question || "").toLowerCase());
            if (score > highestScore) {
                highestScore = score;
                bestMatch = data;
            }
        });

        if (highestScore > 0.70) {
            // Update stats in background
            const docRef = doc(db, "brain", bestMatch.id);
            updateDoc(docRef, { hitCount: increment(1) }).catch(e => console.log(e));

            const answers = bestMatch.answers || [bestMatch.answer];
            let reply = answers[Math.floor(Math.random() * answers.length)];

            // Step D: Auto-Translate Reply back to User's Language
            if (userLang !== 'en' && userLang !== 'hi') {
                reply = await translateText(reply, userLang);
            }

            return reply;
        }

        // Step E: Learning Mode
        return {
            status: "NEED_LEARNING",
            question: processedInput,
            msg: "I'm still learning global languages! Can you teach me the correct answer for this? 😊"
        };
    } catch (e) {
        console.error("Global Brain Error:", e);
        return "Connecting to global servers... 🛰️";
    }
}
