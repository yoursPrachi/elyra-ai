import { db, authReady } from "./firebase.js";
// Naye functions import karein: doc, updateDoc, increment
import { 
    collection, 
    getDocs, 
    doc, 
    updateDoc, 
    increment 
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

function getSimilarity(s1, s2) {
    // ... (Aapka purana similarity logic yahan rahega)
}

export async function getSmartReply(text) {
    const t = text.toLowerCase().trim();
    await authReady;

    try {
        const snap = await getDocs(collection(db, "brain"));
        let bestMatch = null;
        let highestScore = 0;
        let bestMatchId = null; // ID store karne ke liye

        snap.forEach(docSnap => {
            const data = docSnap.data();
            const score = getSimilarity(t, data.question.toLowerCase());
            
            if (score > highestScore) {
                highestScore = score;
                bestMatch = data;
                bestMatchId = docSnap.id; // Document ki ID yahan se milegi
            }
        });

        // --- YAHAN UPDATE KAREIN ---
        if (highestScore > 0.75 && bestMatchId) {
            // Background mein hit count badhayein
            const docRef = doc(db, "brain", bestMatchId);
            updateDoc(docRef, {
                hitCount: increment(1) 
            }).catch(e => console.error("Counter error:", e));

            const answers = bestMatch.answers || [bestMatch.answer];
            return answers[Math.floor(Math.random() * answers.length)];
        }

        return {
            status: "NEED_LEARNING",
            question: t,
            msg: "Hmm, ye mere liye naya hai! Kya tum mujhe iska sahi jawab sikha sakte ho? 😊"
        };
    } catch (e) {
        console.error("Error:", e);
        return "Lagta hai dimaag thoda slow chal raha hai... 🛰️";
    }
}
