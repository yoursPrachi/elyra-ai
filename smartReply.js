import { db, authReady } from "./firebase.js";
import { preReplies } from "./preReplies.js"; // Aapka local pre-replies file
import { 
    collection, 
    getDocs, 
    doc, 
    updateDoc, 
    increment,
    query,
    orderBy,
    limit 
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

// --- Memory Cache ---
let brainCache = null; 

const spellFix = { "hlo": "hello", "kese": "kaise", "u": "you", "r": "are", "ha": "haa" };

const moodMap = {
    happy: ["khush", "happy", "mazza", "mast", "great", "badiya", "awesome", "love", "😍", "❤️"],
    sad: ["udaas", "sad", "dukh", "roana", "unhappy", "pareshan", "alone", "🥺", "💔"],
    angry: ["gussa", "pagal", "angry", "hate", "stupid", "bakwas", "clueless", "😡", "🤬"]
};

function autoCorrect(text) {
    let words = text.toLowerCase().split(/\s+/);
    return words.map(word => spellFix[word] || word).join(" ");
}

function detectMood(text) {
    const t = text.toLowerCase();
    if (moodMap.angry.some(word => t.includes(word))) return "ANGRY";
    if (moodMap.sad.some(word => t.includes(word))) return "SAD";
    if (moodMap.happy.some(word => t.includes(word))) return "HAPPY";
    return "NEUTRAL";
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

// --- Main Optimized Logic ---
export async function getSmartReply(text) {
    const userMood = detectMood(text); 
    const correctedInput = autoCorrect(text.trim());
    const lowerInput = correctedInput.toLowerCase();

    // 1. LEVEL 1: Pre-Replies (Instant - No Firebase Wait)
    if (preReplies[lowerInput]) {
        return preReplies[lowerInput];
    }

    await authReady;

    try {
        // 2. LEVEL 2: Cache Top Trending Questions
        // Hum database se sirf top 50 highly rated sawal uthayenge speed ke liye
        if (!brainCache) {
            const q = query(collection(db, "brain"), orderBy("hitCount", "desc"), limit(50));
            const snap = await getDocs(q);
            brainCache = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        }

        let bestMatch = null;
        let highestScore = 0;

        // Trending memory se check karein
        brainCache.forEach(data => {
            const score = getSimilarity(lowerInput, (data.question || "").toLowerCase());
            if (score > highestScore) {
                highestScore = score;
                bestMatch = data;
            }
        });

        if (highestScore > 0.68) {
            // Update hitCount in background
            const docRef = doc(db, "brain", bestMatch.id);
            updateDoc(docRef, { hitCount: increment(1) }).catch(e => console.log(e));

            const answers = bestMatch.answers || [bestMatch.answer];
            let reply = answers[Math.floor(Math.random() * answers.length)];

            if (userMood === "HAPPY") reply = `✨ ${reply}`;
            if (userMood === "SAD") reply = `❤️ ${reply}`;
            if (userMood === "ANGRY") reply = `🥺 ${reply}`;

            return reply;
        }

        // 3. LEVEL 3: Learning Mode (Final Step)
        return {
            status: "NEED_LEARNING",
            question: correctedInput,
            msg: "Mmm, ye mere liye naya hai! Kya tum mujhe iska sahi jawab sikha sakte ho? 😊"
        };
    } catch (e) {
        console.error("Error:", e);
        return "🛰️ Connection issue lag raha hai...";
    }
}
