import { db } from "./firebase.js"; 
import { getSmartReply } from "./smartReply.js";
import { 
    collection, addDoc, serverTimestamp, query, where, getDocs, updateDoc, arrayUnion 
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

const chat = document.getElementById("chat");
const input = document.getElementById("input");
const typing = document.getElementById("typing");
const welcomePopup = document.getElementById("welcome-popup");

// --- 1. GLOBAL STATE & LOCALIZATION ---
let conversationHistory = [];
let userLang = navigator.language || "en"; // Detects browser language (e.g., 'en-US', 'hi-IN')
let isLearning = localStorage.getItem("isLearning") === "true";
let proactiveTimer;

// --- 2. INTERNATIONAL CONTEXT API ---
async function getGlobalContext() {
    try {
        const res = await fetch('https://ipapi.co/json/');
        const data = await res.json();
        return { 
            city: data.city || "Earth", 
            country: data.country_name || "Global",
            currency: data.currency || "USD"
        };
    } catch (e) { return { city: "Earth", country: "Global" }; }
}

// --- 3. LOGIN & TRANSITION (International Support) ---
window.showNameForm = () => {
    document.getElementById("initial-options").style.display = "none";
    document.getElementById("name-form").style.display = "block";
};

window.startNamedChat = async () => {
    const name = document.getElementById("u-name").value.trim();
    const email = document.getElementById("u-email").value.trim();
    if (name && email) {
        localStorage.setItem("userName", name);
        localStorage.setItem("userEmail", email);
        welcomePopup.style.display = "none";
        initiateInternationalGreeting(name);
    } else { alert("Please fill your details! ✨"); }
};

// --- 4. GLOBAL SMART GREETING ---
async function initiateInternationalGreeting(name) {
    if (sessionStorage.getItem("greeted")) return;
    const context = await getGlobalContext();
    const hour = new Date().getHours();
    
    // Time-zone based greeting
    let timeGreet = hour < 12 ? "Good Morning" : hour < 18 ? "Good Afternoon" : "Good Evening";

    // Dynamic Multi-lingual Welcome
    const welcomeMsgs = {
        "en": `${timeGreet}, **${name}**! ✨ Hope you're enjoying the day in ${context.city}.`,
        "hi": `Namaste **${name}**! ✨ ${context.city} mein sab kaisa chal raha hai?`,
        "es": `¡Hola **${name}**! ✨ ¿Cómo va todo en ${context.city}?`,
        "fr": `Bonjour **${name}**! ✨ Comment ça va à ${context.city}?`
    };

    const langCode = userLang.split('-')[0]; // Extract 'en' from 'en-US'
    const finalGreet = welcomeMsgs[langCode] || welcomeMsgs["en"];
    
    addMsg(finalGreet, "bot");
    sessionStorage.setItem("greeted", "true");
}

// --- 5. MAIN CHAT LOGIC (Global Processing) ---
window.send = async () => {
    const text = input.value.trim();
    if (!text) return;

    input.value = "";
    addMsg(text, "user");
    conversationHistory.push({ role: "user", text });
    if (conversationHistory.length > 8) conversationHistory.shift();
    
    saveToGlobalMemory(text);

    typing.classList.remove("hidden");
    
    // Neural Think-Delay Simulation based on complexity
    const thinkTime = Math.random() * (1200 - 600) + 600; 
    setTimeout(async () => {
        try {
            const botReply = await getSmartReply(text, conversationHistory);
            
            let replyText = (typeof botReply === "object") ? botReply.msg : botReply;
            
            // International Vibe (Random multi-lingual suffixes)
            const suffixes = [" ✨", " 🙈", " 😊", " 🌍", " 💫"];
            const finalReply = replyText + suffixes[Math.floor(Math.random() * suffixes.length)];

            typing.classList.add("hidden");
            addMsg(finalReply, "bot");
            conversationHistory.push({ role: "bot", text: finalReply });
        } catch (e) { 
            typing.classList.add("hidden"); 
            addMsg("Satellite connection is a bit slow... 🛰️", "bot"); 
        }
    }, thinkTime);
};

// --- 6. UTILS (Message Formatting) ---
function addMsg(text, cls) {
    const d = document.createElement("div");
    d.className = `msg ${cls}`;
    // Formats time according to user's local standard
    const timeStr = new Intl.DateTimeFormat(userLang, { hour: '2-digit', minute: '2-digit' }).format(new Date());
    d.innerHTML = `<div class="msg-content">${text}</div><div class="time">${timeStr}</div>`;
    chat.appendChild(d);
    chat.scrollTop = chat.scrollHeight;
    resetProactiveTimer();
}

function resetProactiveTimer() {
    clearTimeout(proactiveTimer);
    proactiveTimer = setTimeout(() => {
        if (!document.hidden) {
            const name = localStorage.getItem("userName") || "Dost";
            addMsg(`Hey **${name}**, are you still there? 🥺`, "bot");
        }
    }, 90000); 
}

window.onload = () => {
    if (localStorage.getItem("userName")) {
        welcomePopup.style.display = "none";
        initiateInternationalGreeting(localStorage.getItem("userName"));
    }
};

input.addEventListener("keypress", (e) => { if (e.key === "Enter") window.send(); });
