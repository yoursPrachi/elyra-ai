import { db } from "./firebase.js";
import { getSmartReply } from "./smartReply.js";
import { collection, addDoc, serverTimestamp, query, where, getDocs, updateDoc, deleteDoc, doc } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

const chat = document.getElementById("chat");
const input = document.getElementById("input");
const typing = document.getElementById("typing");
const container = document.getElementById("app-container");

let isLearning = false;
let pendingQuestion = "";

// --- Conversational Starters ---
const conversationStarters = [
    "Wese, tumhari pasandida movie kaunsi hai? ✨",
    "Chalo ye batao, aaj ka din kaisa guzra? 😊",
    "Tumhe music sunna pasand hai? Main toh hamesha sunti hoon! 🎵",
    "Mera dimaag toh digital hai, par tumhara dimaag kya soch raha hai? 😂",
    "Interesting! Wese aur kuch naya puchenge? 🤔"
];

function scrollToBottom() {
    chat.scrollTop = chat.scrollHeight;
}

// --- UI Message Function (Time and Ticks outside text) ---
function addMsg(text, cls) {
    const d = document.createElement("div");
    d.className = `msg ${cls}`;
    
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const ticks = cls === 'user' ? '<span class="ticks">✓✓</span>' : '';

    // Message Content aur Time alag-alag div mein (WhatsApp Style)
    d.innerHTML = `
        <div class="msg-content">${text}</div>
        <div class="time">${timeStr} ${ticks}</div>
    `;

    chat.appendChild(d);
    scrollToBottom();
}

// --- Save Learned Answer Logic ---
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
                await addDoc(collection(db, "brain"), { 
                    question: q, 
                    answer: a, 
                    type: "community", 
                    time: serverTimestamp() 
                });
                await deleteDoc(doc(db, "temp_learning", docData.id));
            } else {
                await updateDoc(doc(db, "temp_learning", docData.id), { count: newCount });
            }
        } else {
            await addDoc(learningRef, { 
                question: q, 
                answer: tAnswer, 
                count: 1, 
                time: serverTimestamp() 
            });
        }
    } catch (e) { console.error("Firebase Save Error:", e); }
}

// --- MAIN SEND FUNCTION ---
window.send = async () => {
    const text = input.value.trim();
    if (!text) return;

    input.value = "";
    addMsg(text, "user");

    // 1. Handling Learning Mode (User is teaching)
    if (isLearning) {
        typing.classList.remove("hidden");
        
        // Background mein save karein
        await saveLearnedAnswer(pendingQuestion, text);
        
        setTimeout(() => {
            typing.classList.add("hidden");
            const starter = conversationStarters[Math.floor(Math.random() * conversationStarters.length)];
            
            // Ab bot "I don't know" nahi bolega, balki khush hoga
            addMsg(`Wah! Ye toh bahut sahi jawab hai. Maine yaad kar liya! 😍\n\n${starter}`, "bot");
            
            isLearning = false;
            pendingQuestion = "";
        }, 1200);
        return; // Normal search bypass karein
    }

    // 2. Normal Chat Mode
    typing.classList.remove("hidden");
    try {
        const botReply = await getSmartReply(text);
        
        setTimeout(() => {
            typing.classList.add("hidden");
            
            if (typeof botReply === "object" && botReply !== null) {
                // Jab bot ko jawab nahi pata toh Learning Mode ON
                isLearning = true;
                pendingQuestion = botReply.question;
                addMsg(botReply.msg, "bot");
            } else {
                // Normal Reply + 20% chance of Follow-up to keep flow alive
                let finalMsg = botReply;
                if (Math.random() > 0.8) {
                    finalMsg += "\n\n" + conversationStarters[Math.floor(Math.random() * conversationStarters.length)];
                }
                addMsg(finalMsg, "bot");
            }
        }, 1200);
    } catch (e) {
        typing.classList.add("hidden");
        console.error("Reply Error:", e);
    }
};

// --- Mobile Keyboard Fix ---
if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", () => {
        container.style.height = `${window.visualViewport.height}px`;
        scrollToBottom();
    });
}

// Enter Key Support
input.addEventListener("keypress", (e) => { 
    if (e.key === "Enter") {
        e.preventDefault();
        window.send(); 
    }
});
