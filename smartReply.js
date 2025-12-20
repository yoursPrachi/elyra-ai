import { db } from "./firebase.js";
import { collection, query, where, getDocs, limit } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

export async function getSmartReply(text) {
    try {
        const t = text.toLowerCase().trim();
        // Sirf 1 result mangayein performance ke liye
        const q = query(collection(db, "brain"), where("question", "==", t), limit(1));
        
        const snap = await getDocs(q);

        if (!snap.empty) {
            const data = snap.docs[0].data();
            
            // Multiple answers handle karein
            if (data.answers && Array.isArray(data.answers) && data.answers.length > 0) {
                const randomIndex = Math.floor(Math.random() * data.answers.length);
                return data.answers[randomIndex];
            } 
            // Single answer handle karein
            return data.answer || "Bataiye, main aapki kya madad kar sakti hoon?";
        }

        // Agar kuch nahi mila: Learning Mode Object
        return {
            status: "NEED_LEARNING",
            question: t,
            msg: "Hmm, iska jawab mujhe nahi pata. 😅 Kya tum mujhe bata sakte ho iska sahi jawab kya hoga?"
        };
    } catch (e) {
        // Console mein error dekhein (Mobile par Vercel logs mein dikhega)
        console.error("Firestore Fetch Error: ", e);
        return "Connection thoda slow hai, dobara try karein.";
    }
}
