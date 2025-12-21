// authReady ko import karna zaroori hai agar aapne firebase.js mein banaya hai
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

// Location Helper
async function getUserContext() {
    try {
        const response = await fetch('https://ipapi.co/json/');
        const data = await response.json();
        return { 
            country: data.country_name || "Global", 
            city: data.city || "Earth",
            timezone: data.timezone || "UTC"
        };
    } catch (e) {
        return { country: "Global", city: "Earth", timezone: "UTC" };
    }
}

function addMsg(text, cls) {
    const d = document.createElement("div");
    d.className = `msg ${cls}`;
    const timeStr = new Intl.DateTimeFormat(navigator.language, { hour: '2-digit', minute: '2-digit' }).format(new Date());
    const ticks = cls === 'user' ? '<span class="ticks">✓✓</span>' : '';
    d.innerHTML = `<div class="msg-content">${text}</div><div class="time">${timeStr} ${ticks}</div>`;
    chat.appendChild(d);
    chat.scrollTop = chat.scrollHeight;
}

// --- 2. LOGIN FUNCTIONS (Fixed for Global Access) ---
window.showNameForm = () => {
    document.getElementById("initial-options").style.display = "none";
    document.getElementById("name-form").style.display = "block";
};

window.startNamedChat = async () => {
    const nameInput = document.getElementById("u-name");
    const emailInput = document.getElementById("u-email");
    const name = nameInput ? nameInput.value.trim() : "";
    const email = emailInput ? emailInput.value.trim() : "";

    if (name && email) {
        // UI Pehle update karein taaki user ko delay na lage
        localStorage.setItem("userName", name);
        localStorage.setItem("chatMode", "named");
        localStorage.setItem("isNewUser", "true");
        localStorage.setItem("visitCount", "1");
        document.getElementById("welcome-popup").style.display = "none";

        try {
            // Background mein data save karein
            await addDoc(collection(db, "users_list"), { 
                name, email, visits: 1, timestamp: serverTimestamp() 
            });
        } catch (e) { 
            console.error("Firestore Error:", e); // Check console if this fails
        }
        initiateGreeting(name, "named");
    } else { 
        alert("Naam aur Email zaroori hain! 😊"); 
    }
};

window.startGuestChat = () => {
    localStorage.setItem("userName", "Dost");
    localStorage.setItem("chatMode", "guest");
    localStorage.setItem("isNewUser", "true");
    localStorage.setItem("visitCount", "1");
    document.getElementById("welcome-popup").style.display = "none";
    initiateGreeting("Dost", "guest");
};

// --- 3. INTERNATIONAL GREETING LOGIC ---
async function initiateGreeting(name, mode) {
    if (sessionStorage.getItem("greeted")) return;

    const context = await getUserContext();
    
    setTimeout(() => {
        let greet = mode === "named" 
            ? `Welcome **${name}**! ✨ Connecting from ${context.city}. How can I help you?`
            : `Hey **Dost**! 👤 Let's chat. How's it going in ${context.city}?`;
        
        addMsg(greet, "bot");
        sessionStorage.setItem("greeted", "true");
    }, 1000);
}

// Check on Load
window.onload = () => {
    if (localStorage.getItem("userName")) {
        const popup = document.getElementById("welcome-popup");
        if(popup) popup.style.display = "none";
        initiateGreeting(localStorage.getItem("userName"), localStorage.getItem("chatMode"));
    }
};

// --- 4. MAIN CHAT LOGIC ---
window.send = async () => {
    const text = input.value.trim();
    if (!text) return;

    input.value = "";
    addMsg(text, "user");

    typing.classList.remove("hidden");
    try {
        const botReply = await getSmartReply(text);
        setTimeout(() => {
            typing.classList.add("hidden");
            addMsg(botReply, "bot");
        }, 1200);
    } catch (e) {
        typing.classList.add("hidden");
        addMsg("Connection issue... 🛰️", "bot");
    }
};

input.addEventListener("keypress", (e) => { if (e.key === "Enter") window.send(); });
