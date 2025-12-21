import { db, authReady } from "./firebase.js";
import { 
    collection, 
    getDocs, 
    doc, 
    updateDoc, 
    increment 
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

// --- 1. Spelling Correction & Mood Map ---
const spellFix = { "hlo": "hello", "kese": "kaise", "u": "you", "r": "are", "ha": "haa" };

// Mood keywords for Sentiment Analysis
const moodMap = {
    happy: ["khush", "happy", "mazza", "mast", "great", "badiya", "awesome", "love", "😍", "❤️"],
    sad: ["udaas", "sad", "dukh", "roana", "unhappy", "pareshan", "alone", "🥺", "💔"],
    angry: ["gussa", "pagal", "angry", "hate", "stupid", "bakwas", "clueless", "😡", "🤬"]
};

function autoCorrect(text) {
    let words = text.toLowerCase().split(/\s+/);
    return words.map(word => spellFix[word] || word).join(" ");
}

// Mood pehchanne ka function
function detectMood(text) {
    const t = text.toLowerCase();
    if (moodMap.angry.some(word => t.includes(word))) return "ANGRY";
    if (moodMap.sad.some(word => t.includes(word))) return "SAD";
    if (moodMap.happy.some(word => t.includes(word))) return "HAPPY";
    return "NEUTRAL";
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
    const userMood = detectMood(text); // Mood detect karein
    const correctedInput = autoCorrect(text.trim());
    await authReady;

    try {
        const snap = await getDocs(collection(db, "brain"));
        let bestMatch = null;
        let highestScore = 0;
        let bestMatchId = null;

        snap.forEach(docSnap => {
            const data = docSnap.data();
            const score = getSimilarity(correctedInput, (data.question || "").toLowerCase());
            if (score > highestScore) {
                highestScore = score;
                bestMatch = data;
                bestMatchId = docSnap.id;
            }
        });

        if (highestScore > 0.68 && bestMatchId) {
            const docRef = doc(db, "brain", bestMatchId);
            updateDoc(docRef, { hitCount: increment(1) }).catch(e => console.log(e));

            const answers = bestMatch.answers || [bestMatch.answer];
            let reply = answers[Math.floor(Math.random() * answers.length)];

            // Mood ke hisaab se reply modify karein
            if (userMood === "HAPPY") reply = `I'm so glad you're happy! 😍 ${reply}`;
            if (userMood === "SAD") reply = `Aww, don't be sad, I'm with you. ❤️ ${reply}`;
            if (userMood === "ANGRY") reply = `Cool down please... 🥺 ${reply}`;

            return reply;
        }

        return {
            status: "NEED_LEARNING",
            question: correctedInput,
            msg: userMood === "ANGRY" ? "Sorry, main ye nahi jaanti. 🥺 Kya aap sikha sakte hain?" : "Mmm, ye mere liye naya hai! Kya tum mujhe iska sahi jawab sikha sakte ho? 😊"
        };
    } catch (e) {
        console.error("Error:", e);
        return "🛰️ Connection issue lag raha hai...";
    }
}
