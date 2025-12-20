import { db } from "./firebase.js";
import { getSmartReply } from "./smartReply.js";
import { collection, addDoc, serverTimestamp, query, where, getDocs, updateDoc, deleteDoc, doc } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

const chat = document.getElementById("chat");
const input = document.getElementById("input");
const typing = document.getElementById("typing");
const container = document.getElementById("app-container");

let isLearning = false;
let pendingQuestion = "";

// --- Conversation Starters (Flow maintain karne ke liye) ---
const conversationStarters = [
    "Wese, tumhari pasandida movie kaunsi hai? ✨",
    "Chalo ye batao, aaj ka din kaisa guzra? 😊",
    "Tumhe music sunna pasand hai? Main toh hamesha sunti hoon! 🎵",
    "Acha, ye batao tumhari favorite hobby kya hai? 🤔",
    "Mera dimaag toh thoda digital hai, tumhare dimaag mein kya chal raha hai? 😂"
];

// --- Auto Scroll Function ---
function scrollToBottom() {
    chat.scrollTop = chat.scrollHeight;
}

// --- Add Message to UI ---
function addMsg(text, cls) {
    const d = document.createElement("div");
    d.className = `msg ${cls}`;
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    d.innerHTML = `<span>${text}</span><div class="time">${time} ${cls === 'user' ? '✓✓' : ''}</div>`;
    chat.appendChild(d);
    scrollToBottom();
}

// --- Save Learned Answer ---
async function saveLearnedAnswer(q, a) {
    try {
        const tAnswer = a.toLowerCase().trim();
        const learningRef = collection(db, "temp_learning");
        const qry = query(learningRef, where("question", "==", q), where("answer", "==", tAnswer));
        const snap = await getDocs(qry);

        if (!snap.empty) {
            const docData = snap.docs[0];
            const newCount = (docData.data().count || 1) + 1;
            if (newCount >= 3) {
                await addDoc(collection(db, "brain"), { question: q, answer: a, type: "community", time: serverTimestamp() });
                await deleteDoc(doc(db, "temp_learning", docData.id));
            } else {
                await updateDoc(doc(db, "temp_learning", docData.id), { count: newCount });
            }
        } else {
            await addDoc(learningRef, { question: q, answer: tAnswer, count: 1, time: serverTimestamp() });
        }
    } catch (e) { console.error("Firebase Error:", e); }
}

// --- MAIN SEND FUNCTION ---
window.send = async () => {
    const text = input.value.trim();
    if (!text) return;

    input.value = "";
    addMsg(text, "user");

    // 1. Handling Learning Mode
    if (isLearning) {
        typing.classList.remove("hidden");
        await saveLearnedAnswer(pendingQuestion, text);
        
        setTimeout(() => {
            typing.classList.add("hidden");
            const starter = conversationStarters[Math.floor(Math.random() * conversationStarters.length)];
            addMsg(`Maine yaad kar liya! Sikhane ke liye thnx. 😍\n\n${starter}`, "bot");
            isLearning = false;
            pendingQuestion = "";
        }, 1000);
        return;
    }

    // 2. Normal Chat Mode
    typing.classList.remove("hidden");
    try {
        const botReply = await getSmartReply(text);
        
        setTimeout(() => {
            typing.classList.add("hidden");
            
            if (typeof botReply === "object" && botReply !== null) {
                // Agar bot ko jawab nahi pata (Learning trigger)
                isLearning = true;
                pendingQuestion = botReply.question;
                addMsg(botReply.msg, "bot");
            } else {
                // Normal Reply + 20% chance of Follow-up
                let finalMsg = botReply;
                if (Math.random() > 0.8) {
                    finalMsg += "\n\n" + conversationStarters[Math.floor(Math.random() * conversationStarters.length)];
                }
                addMsg(finalMsg, "bot");
            }
        }, 1200);
    } catch (e) {
        typing.classList.add("hidden");
        console.error(e);
    }
};

// --- Mobile Keyboard Alignment Fix ---
if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", () => {
        container.style.height = `${window.visualViewport.height}px`;
        scrollToBottom();
    });
}

// Enter key support
input.addEventListener("keypress", (e) => { 
    if (e.key === "Enter") {
        e.preventDefault();
        window.send(); 
    }
});
