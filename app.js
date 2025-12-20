import { db } from "./firebase.js";
import { getSmartReply } from "./smartReply.js";
import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

const chat = document.getElementById("chat");
const input = document.getElementById("input");
const typing = document.getElementById("typing");

let isLearning = false;
let pendingQuestion = "";

// Chat starters to keep conversation alive
const starters = [
    "Aur batao, kya chal raha hai? 😊",
    "Wese aaj ka din kaisa raha?",
    "Interesting! Kuch aur puchenge? 🤔"
];

function scrollToBottom() { chat.scrollTop = chat.scrollHeight; }

function addMsg(text, cls) {
    const d = document.createElement("div");
    d.className = `msg ${cls}`;
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const ticks = cls === 'user' ? '<span class="ticks">✓✓</span>' : '';
    
    // Unique WhatsApp UI Layout
    d.innerHTML = `<div class="msg-content">${text}</div><div class="time">${time} ${ticks}</div>`;
    
    chat.appendChild(d);
    scrollToBottom();
}

window.send = async () => {
    const text = input.value.trim();
    if (!text) return;

    input.value = "";
    addMsg(text, "user");

    // 1. PRIORITIZE LEARNING MODE
    if (isLearning) {
        typing.classList.remove("hidden");
        try {
            // User ka jawab 'temp_learning' mein save karein
            await addDoc(collection(db, "temp_learning"), {
                question: pendingQuestion,
                answer: text.toLowerCase(),
                count: 1,
                timestamp: serverTimestamp()
            });
            
            setTimeout(() => {
                typing.classList.add("hidden");
                const followUp = starters[Math.floor(Math.random() * starters.length)];
                addMsg(`Wah! Maine yaad kar liya. Sikhane ke liye thnx! 😍\n\n${followUp}`, "bot");
                
                // Reset state
                isLearning = false;
                pendingQuestion = "";
            }, 1000);
        } catch (e) { console.error("Save Error:", e); }
        return; // Normal search bypass karein
    }

    // 2. NORMAL CHAT SEARCH
    typing.classList.remove("hidden");
    const botReply = await getSmartReply(text);

    setTimeout(() => {
        typing.classList.add("hidden");
        
        // Handle Learning Mode Trigger
        if (typeof botReply === "object" && botReply.status === "NEED_LEARNING") {
            isLearning = true;
            pendingQuestion = botReply.question;
            addMsg(botReply.msg, "bot");
        } else {
            // Normal text response
            addMsg(botReply, "bot");
        }
    }, 1200);
};

// Enter key support
input.addEventListener("keypress", (e) => { if (e.key === "Enter") window.send(); });
