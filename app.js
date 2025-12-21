import { db } from "./firebase.js";
import { getSmartReply } from "./smartReply.js";
import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

const chat = document.getElementById("chat");
const input = document.getElementById("input");
const typing = document.getElementById("typing");

// --- 1. Global State Management ---
let userName = localStorage.getItem("userName") || "";
let chatMode = localStorage.getItem("chatMode") || ""; 
let isLearning = localStorage.getItem("isLearning") === "true";
let pendingQuestion = localStorage.getItem("pendingQuestion") || "";
// Trainer status check karne ke liye role property
let userRole = localStorage.getItem("userRole") || "user"; 

// International Context Helper
async function getUserContext() {
    try {
        const response = await fetch('https://ipapi.co/json/');
        const data = await response.json();
        return { 
            country: data.country_name || "Global", 
            city: data.city || "Earth",
            lang: navigator.language.split('-')[0] // Browser language detect karein
        };
    } catch (e) {
        return { country: "Global", city: "Earth", lang: "en" };
    }
}

// Time-based smart greeting logic
function getTimeBasedGreeting() {
    const hrs = new Date().getHours();
    if (hrs < 12) return "Good Morning ☀️";
    if (hrs < 17) return "Good Afternoon 🌤️";
    if (hrs < 21) return "Good Evening ☕";
    return "Good Night 🌙";
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

// --- 2. POPUP & REGISTRATION ---
window.startNamedChat = async () => {
    const name = document.getElementById("u-name").value.trim();
    const email = document.getElementById("u-email").value.trim();
    if (name && email) {
        localStorage.setItem("userName", name);
        localStorage.setItem("chatMode", "named");
        localStorage.setItem("isNewUser", "true"); 
        localStorage.setItem("visitCount", "1");
        document.getElementById("welcome-popup").style.display = "none";
        
        try {
            // Registration data with visits
            await addDoc(collection(db, "users_list"), { 
                name, email, visits: 1, role: "user", timestamp: serverTimestamp() 
            });
        } catch (e) { console.error(e); }
        
        initiateGreeting(name, "named");
    } else { alert("Please enter details! 😊"); }
};

// --- 3. ADVANCE GLOBAL GREETING ---
async function initiateGreeting(name, mode) {
    if (sessionStorage.getItem("greeted")) return;

    let visits = parseInt(localStorage.getItem("visitCount") || "0");
    if (localStorage.getItem("isNewUser") !== "true") {
        visits++;
        localStorage.setItem("visitCount", visits.toString());
    }

    const context = await getUserContext();
    const timeGreet = getTimeBasedGreeting();

    setTimeout(async () => {
        let greet = "";
        const isNew = localStorage.getItem("isNewUser") === "true");

        if (isNew) {
            // Full International Greeting
            greet = `${timeGreet} **${name}**! ✨ Joining from ${context.city}, ${context.country}. I'm Elyra, your Global AI assistant. How can I help you today?`;
            localStorage.removeItem("isNewUser");
        } else {
            // Loyalty greetings
            if (visits > 10) greet = `👑 VIP Welcome back, **${name}**! ${timeGreet}! It's always great to see our top supporters.`;
            else greet = `Welcome back, **${name}**! 😍 Hope you're having a wonderful ${timeGreet.split(' ')[1]} in ${context.city}.`;
        }
        
        addMsg(greet, "bot");
        sessionStorage.setItem("greeted", "true");
    }, 1200);
}

// --- 4. ADVANCE SEND LOGIC (Trainer & Delay Support) ---
window.send = async () => {
    const text = input.value.trim();
    if (!text) return;

    input.value = "";
    addMsg(text, "user");

    // Learning mode logic
    if (isLearning) {
        typing.classList.remove("hidden");
        try {
            await addDoc(collection(db, "temp_learning"), {
                question: pendingQuestion,
                answer: text,
                learnedFrom: localStorage.getItem("userName"),
                userRole: userRole, // Admin identifies if a 'trainer' taught this
                timestamp: serverTimestamp()
            });
            setTimeout(() => {
                typing.classList.add("hidden");
                addMsg(`Theek hai, maine yaad kar liya! 🎓 Lesson sent to Admin for approval. Sikhane ke liye shukriya.`, "bot");
                isLearning = false;
                localStorage.removeItem("isLearning");
            }, 1000);
        } catch (e) { console.error(e); }
        return;
    }

    typing.classList.remove("hidden");
    const botReply = await getSmartReply(text);

    // International Standard: Dynamic Typing Speed
    // Lambe messages ke liye zyada delay, chote ke liye kam
    const dynamicDelay = Math.min(Math.max(botReply.length * 30, 1000), 3500);

    setTimeout(() => {
        typing.classList.add("hidden");
        if (typeof botReply === "object" && botReply.status === "NEED_LEARNING") {
            isLearning = true;
            pendingQuestion = botReply.question;
            localStorage.setItem("isLearning", "true");
            addMsg(botReply.msg, "bot");
        } else {
            let finalMsg = botReply;
            const visits = parseInt(localStorage.getItem("visitCount") || "1");
            
            // Respectful VIP logic
            if (visits > 10) {
                finalMsg = `Ji ${userName} Sahab, ${botReply}`;
            }
            addMsg(finalMsg, "bot");
        }
    }, dynamicDelay);
};

window.onload = () => {
    if (localStorage.getItem("userName")) {
        document.getElementById("welcome-popup").style.display = "none";
        initiateGreeting(localStorage.getItem("userName"), localStorage.getItem("chatMode"));
    }
};

input.addEventListener("keypress", (e) => { if (e.key === "Enter") window.send(); });
