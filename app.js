import { db } from "./firebase.js";
import { getSmartReply } from "./smartReply.js";
import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

const chat = document.getElementById("chat");
const input = document.getElementById("input");
const typing = document.getElementById("typing");

// --- Memory & State Management ---
let userName = localStorage.getItem("userName") || "";
let isLearning = localStorage.getItem("isLearning") === "true";
let pendingQuestion = localStorage.getItem("pendingQuestion") || "";
let askingName = false;

// Helpers for Multi-language & Global Presence
async function getUserContext() {
    try {
        const response = await fetch('https://ipapi.co/json/');
        const data = await response.json();
        return {
            country: data.country_name || "the World",
            city: data.city || "your place",
            lang: navigator.language.split('-')[0]
        };
    } catch (e) {
        return { country: "the World", lang: "en", city: "your place" };
    }
}

function addMsg(text, cls) {
    const d = document.createElement("div");
    d.className = `msg ${cls}`;
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const ticks = cls === 'user' ? '<span class="ticks">✓✓</span>' : '';
    d.innerHTML = `<div class="msg-content">${text}</div><div class="time">${timeStr} ${ticks}</div>`;
    chat.appendChild(d);
    chat.scrollTop = chat.scrollHeight;
}

// --- Dynamic Global Greeting ---
window.onload = async () => {
    const context = await getUserContext();
    
    if (!userName) {
        setTimeout(() => {
            addMsg(`Hello! Main Elyra AI hoon. ✨ Main aapse ${context.city}, ${context.country} mein mil kar bohot khush hoon!`, "bot");
            setTimeout(() => {
                addMsg("Main aapka naam jaan sakti hoon?", "bot");
                askingName = true;
            }, 1000);
        }, 1500);
    } else {
        setTimeout(() => {
            let greet = `Welcome back, ${userName}! 😍 Sending love to ${context.city}!`;
            if (context.lang === "hi") greet = `Welcome back ${userName}! Kaise hain aap? ${context.city} mein mausam kaisa hai? 🇮🇳✨`;
            addMsg(greet, "bot");
        }, 1000);
    }
};

// --- Chat Logic ---
window.send = async () => {
    const text = input.value.trim();
    if (!text) return;

    input.value = "";
    addMsg(text, "user");

    // 1. Handle Name Discovery
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

    // 2. Handle Learning Mode
    if (isLearning) {
        typing.classList.remove("hidden");
        try {
            await addDoc(collection(db, "temp_learning"), {
                question: pendingQuestion,
                answer: text.toLowerCase(),
                timestamp: serverTimestamp(),
                learnedFrom: userName,
                location: localStorage.getItem("userCity") || "Unknown"
            });
            
            setTimeout(() => {
                typing.classList.add("hidden");
                addMsg(`Theek hai ${userName}, maine yaad kar liya! 😍 Sikhane ke liye thnx!`, "bot");
                isLearning = false;
                localStorage.removeItem("isLearning");
                localStorage.removeItem("pendingQuestion");
            }, 1000);
        } catch (e) { console.error("Learning Error:", e); }
        return;
    }

    // 3. Normal Smart Chat
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
            let finalMsg = botReply;
            // 30% chance to include name for personal touch
            if (Math.random() > 0.7) finalMsg = `${userName}, ${botReply}`;
            addMsg(finalMsg, "bot");
        }
    }, 1200);
};

input.addEventListener("keypress", (e) => { if (e.key === "Enter") window.send(); });
