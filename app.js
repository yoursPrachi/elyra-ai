import { db } from "./firebase.js";
import { getSmartReply } from "./smartReply.js";
import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

const chat = document.getElementById("chat");
const input = document.getElementById("input");
const typing = document.getElementById("typing");

// --- Memory States ---
let userName = localStorage.getItem("userName") || "";
let isLearning = localStorage.getItem("isLearning") === "true";
let pendingQuestion = localStorage.getItem("pendingQuestion") || "";
let askingName = false;

// Topic change starters
const engagementStarters = [
    "Wese, aaj ka din kaisa guzra? 😊",
    "Tumhe music sunna pasand hai? 🎵",
    "Mera dimaag toh digital hai, par tumhara dimaag kya soch raha hai? 😂"
];

function addMsg(text, cls) {
    const d = document.createElement("div");
    d.className = `msg ${cls}`;
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const ticks = cls === 'user' ? '<span class="ticks">✓✓</span>' : '';
    d.innerHTML = `<div class="msg-content">${text}</div><div class="time">${timeStr} ${ticks}</div>`;
    chat.appendChild(d);
    chat.scrollTop = chat.scrollHeight;
}

// --- Initial Greeting ---
window.onload = () => {
    if (!userName) {
        setTimeout(() => {
            addMsg("Hello! Main Elyra AI hoon. ✨ Main aapka naam jaan sakti hoon?", "bot");
            askingName = true;
        }, 1000);
    } else {
        setTimeout(() => {
            addMsg(`Welcome back, ${userName}! 😍 Kaise hain aap aaj?`, "bot");
        }, 1000);
    }
};

window.send = async () => {
    const text = input.value.trim();
    if (!text) return;

    input.value = "";
    addMsg(text, "user");

    // 1. Agar Bot Naam Pooch raha hai
    if (askingName) {
        userName = text;
        localStorage.setItem("userName", userName);
        askingName = false;
        typing.classList.remove("hidden");
        setTimeout(() => {
            typing.classList.add("hidden");
            addMsg(`Wah! ${userName}, kitna pyara naam hai aapka. ❤️ Chalo ab baatein karte hain!`, "bot");
        }, 1000);
        return;
    }

    // 2. Agar Bot Seekh raha hai
    if (isLearning) {
        typing.classList.remove("hidden");
        try {
            await addDoc(collection(db, "temp_learning"), {
                question: pendingQuestion,
                answer: text.toLowerCase(),
                timestamp: serverTimestamp(),
                learnedFrom: userName
            });
            
            setTimeout(() => {
                typing.classList.add("hidden");
                addMsg(`Theek hai ${userName}, maine yaad kar liya! 😍 Sikhane ke liye thnx!`, "bot");
                isLearning = false;
                localStorage.removeItem("isLearning");
                localStorage.removeItem("pendingQuestion");
            }, 1000);
        } catch (e) { console.log(e); }
        return;
    }

    // 3. Normal Chat
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
            // Kabhi kabhi naam ke sath reply dena
            let finalMsg = botReply;
            if (Math.random() > 0.7) finalMsg = `${userName}, ${botReply}`;
            addMsg(finalMsg, "bot");
        }
    }, 1200);
};

input.addEventListener("keypress", (e) => { if (e.key === "Enter") window.send(); });
