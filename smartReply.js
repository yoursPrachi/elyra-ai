import { db, authReady } from "./firebase.js";
import { 
    collection, 
    getDocs, 
    doc, 
    updateDoc, 
    increment 
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

// --- 1. Spelling Correction Layer ---
const spellFix = {
    "hlo": "hello",
    "kese": "kaise",
    "kya h": "kya hai",
    "u": "you",
    "r": "are",
    "hw": "how",
    "thnx": "thanks",
    "m": "main",
    "clg": "college",
    "ha": "haa"
};

function autoCorrect(text) {
    let words = text.toLowerCase().split(/\s+/);
    return words.map(word => spellFix[word] || word).join(" ");
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

// --- 3. Main Reply Logic ---
export async function getSmartReply(text) {
    // Spelling mistake theek karein
    const correctedInput = autoCorrect(text.trim());
    await authReady;

    try {
        const snap = await getDocs(collection(db, "brain"));
        let bestMatch = null;
        let highestScore = 0;
        let bestMatchId = null;

        snap.forEach(docSnap => {
            const data = docSnap.data();
            const score = getSimilarity(correctedInput, data.question.toLowerCase());
            
            if (score > highestScore) {
                highestScore = score;
                bestMatch = data;
                bestMatchId = docSnap.id;
            }
        });

        // Spelling mistakes ke liye threshold 0.68 rakha hai
        if (highestScore > 0.68 && bestMatchId) {
            // Hit count update background mein
            const docRef = doc(db, "brain", bestMatchId);
            updateDoc(docRef, { hitCount: increment(1) }).catch(e => console.log(e));

            const answers = bestMatch.answers || [bestMatch.answer];
            return answers[Math.floor(Math.random() * answers.length)];
        }

        // Agar bilkul match nahi mila tabhi learning trigger hogi
        return {
            status: "NEED_LEARNING",
            question: correctedInput,
            msg: "Mmm, ye mere liye naya hai! Kya tum mujhe iska sahi jawab sikha sakte ho? 😊"
        };
    } catch (e) {
        console.error("Error:", e);
        return "Lagta hai dimaag thoda slow chal raha hai... 🛰️";
    }
}
