import { db } from "./firebase.js";
import { getSmartReply } from "./smartReply.js";
import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

const chat = document.getElementById("chat");
const input = document.getElementById("input");
const typing = document.getElementById("typing");

// --- 1. Global Memory & International State ---
let userName = localStorage.getItem("userName") || "";
let chatMode = localStorage.getItem("chatMode") || ""; 
let isLearning = localStorage.getItem("isLearning") === "true";
let pendingQuestion = localStorage.getItem("pendingQuestion") || "";

// Smart International Context
async function getUserContext() {
    try {
        const response = await fetch('https://ipapi.co/json/');
        const data = await response.json();
        return { 
            country: data.country_name || "Global", 
            city: data.city || "Earth",
            currency: data.currency || "USD",
            timezone: data.timezone || "UTC",
            lang: navigator.language || "en-US" // Browser language detect karein
        };
    } catch (e) {
        return { country: "Global", city: "Earth", lang: "en-US", timezone: "UTC" };
    }
}

// Global Time-Aware Greeting
function getGlobalGreeting(timezone) {
    const options = { timeZone: timezone, hour: 'numeric', hour12: false };
    const localHour = new Intl.DateTimeFormat('en-US', options).format(new Date());
    
    if (localHour >= 5 && localHour < 12) return "Good Morning ☀️";
    if (localHour >= 12 && localHour < 17) return "Good Afternoon 🌤️";
    if (localHour >= 17 && localHour < 21) return "Good Evening ☕";
    return "Good Night 🌙";
}

function addMsg(text, cls) {
    const d = document.createElement("div");
    d.className = `msg ${cls}`;
    
    // International Date/Time Formatting
    const timeStr = new Intl.DateTimeFormat(navigator.language, {
        hour: '2-digit', 
        minute: '2-digit'
    }).format(new Date());

    const ticks = cls === 'user' ? '<span class="ticks">✓✓</span>' : '';
    d.innerHTML = `<div class="msg-content">${text}</div><div class="time">${timeStr} ${ticks}</div>`;
    chat.appendChild(d);
    chat.scrollTop = chat.scrollHeight;
}

// --- 2. INTERNATIONAL GREETING LOGIC ---
async function initiateGreeting(name, mode) {
    if (sessionStorage.getItem("greeted")) return;

    const context = await getUserContext();
    const timeGreet = getGlobalGreeting(context.timezone);

    setTimeout(async () => {
        let greet = "";
        const visits = parseInt(localStorage.getItem("visitCount") || "1");
        const isNew = localStorage.getItem("isNewUser") === "true";

        if (isNew) {
            // New Global User Greeting
            greet = `${timeGreet} **${name}**! ✨ It's wonderful to connect with someone from ${context.city}, ${context.country}. I'm Elyra, your Global AI. How can I assist you today?`;
            localStorage.removeItem("isNewUser");
        } else {
            // Returning International User
            if (visits > 10) {
                greet = `👑 **VIP Recognition**: Welcome back, **${name}**! Hope your day in ${context.city} is going great. ${timeGreet}!`;
            } else {
                greet = `Hello again, **${name}**! 😍 Wishing you a pleasant ${timeGreet.split(' ')[1]}!`;
            }
        }
        
        addMsg(greet, "bot");
        sessionStorage.setItem("greeted", "true");
    }, 1200);
}

// --- 3. MAIN CHAT LOGIC (Global Optimization) ---
window.send = async () => {
    const text = input.value.trim();
    if (!text) return;

    input.value = "";
    addMsg(text, "user");

    if (isLearning) {
        typing.classList.remove("hidden");
        try {
            await addDoc(collection(db, "temp_learning"), {
                question: pendingQuestion,
                answer: text,
                learnedFrom: localStorage.getItem("userName"),
                region: (await getUserContext()).country, // Region track karein
                timestamp: serverTimestamp()
            });
            setTimeout(() => {
                typing.classList.add("hidden");
                addMsg(`I've noted that down! 🌍 Thank you for helping me grow globally.`, "bot");
                isLearning = false;
                localStorage.removeItem("isLearning");
            }, 1000);
        } catch (e) { console.error(e); }
        return;
    }

    typing.classList.remove("hidden");
    const botReply = await getSmartReply(text);

    // International Standard: Human-like dynamic typing speed
    const dynamicDelay = Math.min(Math.max(botReply.length * 30, 1200), 4000);

    setTimeout(() => {
        typing.classList.add("hidden");
        if (typeof botReply === "object" && botReply.status === "NEED_LEARNING") {
            isLearning = true;
            pendingQuestion = botReply.question;
            localStorage.setItem("isLearning", "true");
            addMsg(botReply.msg, "bot");
        } else {
            addMsg(botReply, "bot");
        }
    }, dynamicDelay);
};

// ... login functions ...
window.onload = () => {
    if (localStorage.getItem("userName")) {
        document.getElementById("welcome-popup").style.display = "none";
        initiateGreeting(localStorage.getItem("userName"), localStorage.getItem("chatMode"));
    }
};

input.addEventListener("keypress", (e) => { if (e.key === "Enter") window.send(); });
