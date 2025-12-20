import { db } from "./firebase.js";
import { getSmartReply } from "./smartReply.js";
import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

const chat = document.getElementById("chat");
const input = document.getElementById("input");
const typing = document.getElementById("typing");

// LocalStorage memory check
let isLearning = localStorage.getItem("isLearning") === "true";
let pendingQuestion = localStorage.getItem("pendingQuestion") || "";

const starters = [
    "Wese, tumhari pasandida movie kaunsi hai? ✨",
    "Chalo ye batao, aaj ka din kaisa guzra? 😊",
    "Mera dimaag toh digital hai, par tumhara dimaag kya soch raha hai? 😂",
    "Interesting! Wese aur kuch naya puchenge? 🤔"
];

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

    // --- CASE 1: BOT IS LEARNING ---
    if (isLearning === true) {
        typing.classList.remove("hidden");
        try {
            await addDoc(collection(db, "temp_learning"), {
                question: pendingQuestion,
                answer: text.toLowerCase(),
                timestamp: serverTimestamp()
            });
            
            setTimeout(() => {
                typing.classList.add("hidden");
                const nextTopic = starters[Math.floor(Math.random() * starters.length)];
                addMsg(`Wah! Maine yaad kar liya. 😍 Sikhane ke liye thnx!\n\n${nextTopic}`, "bot");
                
                // Reset states
                isLearning = false;
                pendingQuestion = "";
                localStorage.removeItem("isLearning");
                localStorage.removeItem("pendingQuestion");
            }, 1000);
        } catch (e) { console.error("Save error:", e); }
        return;
    }

    // --- CASE 2: NORMAL CHAT ---
    typing.classList.remove("hidden");
    const botReply = await getSmartReply(text);

    setTimeout(() => {
        typing.classList.add("hidden");
        if (typeof botReply === "object" && botReply.status === "NEED_LEARNING") {
            isLearning = true;
            pendingQuestion = botReply.question;
            localStorage.setItem("isLearning", "true");
            localStorage.setItem("pendingQuestion", pendingQuestion);
            addMsg(botReply.msg, "bot");
        } else {
            // Normal reply + 20% chance of random conversation starter
            let finalMsg = botReply;
            if (Math.random() > 0.8) finalMsg += "\n\n" + starters[Math.floor(Math.random() * starters.length)];
            addMsg(finalMsg, "bot");
        }
    }, 1200);
};

input.addEventListener("keypress", (e) => { if (e.key === "Enter") window.send(); });
