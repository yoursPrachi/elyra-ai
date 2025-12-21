import { db, authReady } from "./firebase.js";
import { preReplies } from "./preReplies.js";
import { 
    collection, getDocs, doc, updateDoc, increment, query, orderBy, limit, where 
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

let brainCache = null;
let autoLearnQueue = {};

// --- 1. Real Girl Personality Data ---
const girlMoods = {
    "kaise ho": "Main ekdum badiya! ✨ Tum batao, kya chal raha hai aaj kal? 😊",
    "kya kar rahi ho": "Bas, tumhari baaton ka intezaar... aur thoda kaam. 🙈",
    "pagal": "Hey! Itni buri bhi nahi hoon main.. bura lagta hai na 🥺",
    "i love you": "Aww, kitne pyaare ho! ❤️ Par hum toh acche dost hain na? ✨",
    "bor ho raha hoon": "Chalo phir gossip karte hain! Kuch interesting batao? 🎤",
    "bye": "Itni jaldi? 🥺 Achha theek hai, apna khayal rakhna. 👋"
};

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

export async function getSmartReply(text, history = []) {
    const lowerInput = text.toLowerCase().trim();
    await authReady;

    // A. Real Girl Personality Check
    if (girlMoods[lowerInput]) {
        return girlMoods[lowerInput];
    }

    // B. Accuracy Fix: Short/Filler Words
    const fillers = { "ok": "Theek hai ji! 👍", "hmm": "Hmm.. bored ho kya? 🙈", "acha": "Achha, sahi hai.", "wow": "Shukriya! 😍" };
    if (fillers[lowerInput] || lowerInput.length < 3) {
        return fillers[lowerInput] || "Theek hai! 😊";
    }

    // C. Long-Term Memory
    if (lowerInput.includes("yaad") || lowerInput.includes("remember")) {
        const memories = await getPersonalContext(lowerInput);
        if (memories && memories.length > 0) {
            const lastThing = memories[memories.length - 1].text;
            return `Haan! Mujhe yaad hai tumne kaha tha: "${lastThing}". Main kuch bhoolti nahi hoon! 😜`;
        }
    }

    if (preReplies[lowerInput]) return preReplies[lowerInput];

    try {
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

        // D. Proactive Self-Learning Pattern
        autoLearnQueue[lowerInput] = (autoLearnQueue[lowerInput] || 0) + 1;
        
        if (autoLearnQueue[lowerInput] >= 3 || lowerInput.length > 15) {
            return {
                status: "NEED_LEARNING",
                question: lowerInput,
                msg: "Ye mere liye naya hai.. 🙈 Kya tum mujhe iska sahi jawab sikha sakte ho please? 😊"
            };
        }

        return "Mmm, main samajh nahi paayi.. thoda acche se samjhao na? ✨";

    } catch (e) {
        return "🛰️ Connection issue... Phir se try karein?";
    }
}
