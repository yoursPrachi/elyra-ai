import { db } from "./firebase.js"; 
import { getSmartReply } from "./smartReply.js";
import { 
    collection, addDoc, serverTimestamp, doc, getDoc, updateDoc, arrayUnion, query, where, getDocs 
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

const chat = document.getElementById("chat");
const input = document.getElementById("input");
const typing = document.getElementById("typing");
const welcomePopup = document.getElementById("welcome-popup");

// --- 1. State Management ---
let conversationHistory = [];
let isLearning = localStorage.getItem("isLearning") === "true";
let pendingQuestion = localStorage.getItem("pendingQuestion") || "";
let proactiveTimer;

// --- 2. LOGIN & POPUP LOGIC (Fixes the stuck screen) ---
window.startNamedChat = async () => {
    const nameInput = document.getElementById("u-name");
    const emailInput = document.getElementById("u-email");
    const name = nameInput ? nameInput.value.trim() : "";
    const email = emailInput ? emailInput.value.trim() : "";
    
    if (name && email) {
        localStorage.setItem("userName", name);
        localStorage.setItem("userEmail", email);
        localStorage.setItem("chatMode", "named");
        welcomePopup.classList.add("hidden"); // Popup hatane ka logic
        initiateGreeting(name, "named");
    } else {
        alert("Suno, details toh bharo! ✨");
    }
};

window.startGuestChat = () => {
    localStorage.setItem("userName", "Dost");
    localStorage.setItem("chatMode", "guest");
    welcomePopup.classList.add("hidden");
    initiateGreeting("Dost", "guest");
};

// --- 3. NATURAL GREETING & CONTEXT ---
async function initiateGreeting(name, mode) {
    if (sessionStorage.getItem("greeted")) return;
    
    let memoryRecall = "";
    const email = localStorage.getItem("userEmail");
    if (email) {
        const q = query(collection(db, "users_list"), where("email", "==", email));
        const snap = await getDocs(q);
        if (!snap.empty && snap.docs[0].data().memories) {
            const memories = snap.docs[0].data().memories;
            memoryRecall = ` Waise mujhe yaad hai, tumne kaha tha: "${memories[memories.length-1].text}" 😊`;
        }
    }

    setTimeout(() => {
        const greet = mode === "named" 
            ? `Hlo **${name}**! ✨ Kaise ho?${memoryRecall}` 
            : `Hey **Dost**! 👤 Chalo baatein karte hain!`;
        addMsg(greet, "bot");
        sessionStorage.setItem("greeted", "true");
    }, 1000);
}

// --- 4. MAIN CHAT LOGIC (Bug-Free & Natural) ---
window.send = async () => {
    const text = input.value.trim();
    if (!text) return;

    input.value = "";
    addMsg(text, "user");
    conversationHistory.push({ role: "user", text });
    
    if (isLearning) {
        handleLearning(text);
        return;
    }

    const thinkTime = Math.random() * (1200 - 600) + 600; 
    setTimeout(async () => {
        typing.classList.remove("hidden");
        try {
            const botReply = await getSmartReply(text, conversationHistory);
            
            // FIX: Object Handling
            let replyText = (typeof botReply === "object") ? botReply.msg : botReply;
            let isNeedLearning = (typeof botReply === "object" && botReply.status === "NEED_LEARNING");

            // Random Personality Fallback
            if (isNeedLearning && Math.random() > 0.6) {
                replyText = "Mmm.. main thoda confuse ho gayi, thoda vistaar mein samjhao na? 🙈";
                isNeedLearning = false;
            }

            const typingDuration = Math.min(Math.max(replyText.length * 30, 1000), 4000);
            setTimeout(() => {
                typing.classList.add("hidden");
                if (isNeedLearning) {
                    isLearning = true;
                    pendingQuestion = botReply.question;
                    localStorage.setItem("isLearning", "true");
                }
                const girlHabits = [" ✨", " 🙈", " na?", " 😊"];
                const finalReply = replyText + (Math.random() > 0.7 ? girlHabits[Math.floor(Math.random() * girlHabits.length)] : "");
                addMsg(finalReply, "bot");
                conversationHistory.push({ role: "bot", text: finalReply });
            }, typingDuration);
        } catch (e) { typing.classList.add("hidden"); addMsg("Network nakhre kar raha hai.. 🛰️", "bot"); }
    }, thinkTime);
};

function addMsg(text, cls) {
    const d = document.createElement("div");
    d.className = `msg ${cls}`;
    const timeStr = new Intl.DateTimeFormat(navigator.language, { hour: '2-digit', minute: '2-digit' }).format(new Date());
    d.innerHTML = `<div class="msg-content">${text}</div><div class="time">${timeStr}</div>`;
    chat.appendChild(d);
    chat.scrollTop = chat.scrollHeight;
}

window.onload = () => {
    if (localStorage.getItem("userName")) {
        welcomePopup.classList.add("hidden");
        initiateGreeting(localStorage.getItem("userName"), localStorage.getItem("chatMode"));
    }
};
