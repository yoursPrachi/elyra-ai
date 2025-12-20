import { db } from "./firebase.js";
import { getSmartReply } from "./smartReply.js";
import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

const chat = document.getElementById("chat");
const input = document.getElementById("input");
const typing = document.getElementById("typing");

let isLearning = false;
let pendingQuestion = "";

const starters = ["Aur batao, kya chal raha hai? 😊", "Wese aaj ka din kaisa raha?", "Acha, aur kuch naya? 🤔"];

function addMsg(text, cls) {
    const d = document.createElement("div");
    d.className = `msg ${cls}`;
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const ticks = cls === 'user' ? '<span class="ticks">✓✓</span>' : '';
    d.innerHTML = `<div class="msg-content">${text}</div><div class="time">${time} ${ticks}</div>`;
    chat.appendChild(d);
    chat.scrollTop = chat.scrollHeight;
}

window.send = async () => {
    const text = input.value.trim();
    if (!text) return;

    input.value = "";
    addMsg(text, "user");

    // --- AGAR BOT SEEKH RAHA HAI (Priority 1) ---
    if (isLearning) {
        typing.classList.remove("hidden");
        try {
            await addDoc(collection(db, "temp_learning"), {
                question: pendingQuestion,
                answer: text.toLowerCase(),
                timestamp: serverTimestamp(),
                count: 1
            });
            
            setTimeout(() => {
                typing.classList.add("hidden");
                const followUp = starters[Math.floor(Math.random() * starters.length)];
                addMsg(`Wah! Maine yaad kar liya. Sikhane ke liye thnx! 😍\n\n${followUp}`, "bot");
                isLearning = false; // State reset
                pendingQuestion = "";
            }, 1000);
        } catch (e) { 
            console.error("Save Error:", e);
            addMsg("Connectivity issue, save nahi ho paya.", "bot");
        }
        return; 
    }

    // --- NORMAL CHAT (Priority 2) ---
    typing.classList.remove("hidden");
    const botReply = await getSmartReply(text);

    setTimeout(() => {
        typing.classList.add("hidden");
        if (typeof botReply === "object" && botReply.status === "NEED_LEARNING") {
            isLearning = true;
            pendingQuestion = botReply.question;
            addMsg(botReply.msg, "bot");
        } else {
            addMsg(botReply, "bot");
        }
    }, 1200);
};

input.addEventListener("keypress", (e) => { if (e.key === "Enter") window.send(); });
