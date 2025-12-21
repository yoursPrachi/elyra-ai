import { db, authReady } from "./firebase.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

// --- 1. Similarity Checker Function ---
// Ye check karega ki do sentences kitne milte-julte hain
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

export async function getSmartReply(text) {
    const t = text.toLowerCase().trim();
    await authReady;

    try {
        const snap = await getDocs(collection(db, "brain"));
        let bestMatch = null;
        let highestScore = 0;

        snap.forEach(doc => {
            const data = doc.data();
            const score = getSimilarity(t, data.question.toLowerCase());
            
            if (score > highestScore) {
                highestScore = score;
                bestMatch = data;
            }
        });

        // --- 2. Threshold Logic ---
        // Agar 75% se zyada match hai, toh jawab de do
        if (highestScore > 0.75) {
            const answers = bestMatch.answers || [bestMatch.answer];
            return answers[Math.floor(Math.random() * answers.length)];
        }

        // Agar bilkul naya sawal hai (low similarity) tabhi seekhne jaye
        return {
            status: "NEED_LEARNING",
            question: t,
            msg: "Hmm, ye mere liye thoda naya hai! Kya tum mujhe iska sahi jawab sikha sakte ho? 😊"
        };
    } catch (e) {
        return "Lagta hai mera dimaag thoda slow chal raha hai... 🛰️";
    }
}
