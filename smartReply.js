import { db, authReady } from "./firebase.js";
import { preReplies } from "./preReplies.js";
import { 
    collection, getDocs, doc, updateDoc, increment, query, orderBy, limit, where 
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

let brainCache = null;
let autoLearnQueue = {}; // Repetitive unknown questions track karne ke liye

// --- 1. Long-Term Memory Recall ---
async function getPersonalContext(text) {
    const email = localStorage.getItem("userEmail");
    if (!email) return null;
    try {
        const q = query(collection(db, "users_list"), where("email", "==", email));
        const snap = await getDocs(q);
        if (!snap.empty) {
            const userData = snap.docs[0].data();
            if (text.includes("mera") || text.includes("my") || text.includes("yaad")) {
                return userData.memories || [];
            }
        }
    } catch (e) { console.error(e); }
    return null;
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

// --- 3. Main Global Smart Reply with Proactive Logic ---
export async function getSmartReply(text, history = []) {
    const lowerInput = text.toLowerCase().trim();
    await authReady;

    // A. Filter Short/Filler Words (Accuracy Fix)
    const fillers = { "ok": "Theek hai! 👍", "hmm": "Hmm.. aur bataiye?", "acha": "Achha, sahi hai.", "wow": "Shukriya! 😍" };
    if (fillers[lowerInput] || lowerInput.length < 3) {
        return fillers[lowerInput] || "Theek hai! 😊";
    }

    // B. Proactive Memory Recall
    if (lowerInput.includes("yaad") || lowerInput.includes("remember")) {
        const memories = await getPersonalContext(lowerInput);
        if (memories && memories.length > 0) {
            const lastThing = memories[memories.length - 1].text;
            return `Haan! Mujhe yaad hai aapne kaha tha: "${lastThing}". Kya is baare mein kuch aur batana chahenge? 😊`;
        }
    }

    // C. Instant Pre-Replies
    if (preReplies[lowerInput]) return preReplies[lowerInput];

    try {
        // D. Cache Brain (Top 100 Trending)
        if (!brainCache) {
            const q = query(collection(db, "brain"), orderBy("hitCount", "desc"), limit(100));
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

        if (highestScore > 0.68) {
            const docRef = doc(db, "brain", bestMatch.id);
            updateDoc(docRef, { hitCount: increment(1) }).catch(e => console.log(e));
            const answers = bestMatch.answers || [bestMatch.answer];
            return answers[Math.floor(Math.random() * answers.length)];
        }

        // E. Self-Learning Pattern Detection
        // Agar koi anjaan sawal 3 baar pucha jaye, toh bot proactive hokar seekhega
        autoLearnQueue[lowerInput] = (autoLearnQueue[lowerInput] || 0) + 1;
        
        if (autoLearnQueue[lowerInput] >= 3 || lowerInput.length > 15) {
            return {
                status: "NEED_LEARNING",
                question: lowerInput,
                msg: "Main dekh rahi hoon kaafi log ye pooch rahe hain. Kya aap mujhe iska ek sahi jawab sikha sakte ho? 😊"
            };
        }

        return "Mmm, main samajh nahi paayi. Thoda vistaar mein samjhaiye? ✨";

    } catch (e) {
        console.error("Global Error:", e);
        return "🛰️ Connection issue... Let's try again.";
    }
}
