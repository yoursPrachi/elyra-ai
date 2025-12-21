import { db } from "./firebase.js";
import { getSmartReply } from "./smartReply.js";
import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

const chat = document.getElementById("chat");
const input = document.getElementById("input");
const typing = document.getElementById("typing");

// --- Memory & State Management ---
let userName = localStorage.getItem("userName") || "";
let chatMode = localStorage.getItem("chatMode") || ""; // named ya guest
let isLearning = localStorage.getItem("isLearning") === "true";
let pendingQuestion = localStorage.getItem("pendingQuestion") || "";

// Location Helper
async function getUserContext() {
    try {
        const response = await fetch('https://ipapi.co/json/');
        const data = await response.json();
        return { country: data.country_name || "the World", city: data.city || "your place", lang: navigator.language.split('-')[0] };
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

// --- POPUP FUNCTIONS ---
window.showNameForm = () => {
    document.getElementById("initial-options").style.display = "none";
    document.getElementById("name-form").style.display = "block";
};

window.startNamedChat = async () => {
    const name = document.getElementById("u-name").value.trim();
    const email = document.getElementById("u-email").value.trim();
    if (name && email) {
        localStorage.setItem("userName", name);
        localStorage.setItem("chatMode", "named");
        document.getElementById("welcome-popup").style.display = "none";
        
        // Save to Database
        try {
            await addDoc(collection(db, "users_list"), { name, email, timestamp: serverTimestamp() });
        } catch (e) { console.error(e); }
        
        initiateGreeting(name, "named");
    } else { alert("Naam aur Email zaroori hain! 😊"); }
};

window.startGuestChat = () => {
    localStorage.setItem("userName", "Dost");
    localStorage.setItem("chatMode", "guest");
    document.getElementById("welcome-popup").style.display = "none";
    initiateGreeting("Dost", "guest");
};

async function initiateGreeting(name, mode) {
    const context = await getUserContext();
    setTimeout(() => {
        let greet = "";
        if (mode === "named") {
            greet = `Swaagat hai **${name}**! ✨ Aap ${context.city} se jud rahe hain, ye jaan kar bahut khushi hui. Bataiye main aapki kya madad kar sakti hoon?`;
        } else {
            greet = `Hey **Dost**! 👤 Kaise ho? Chalo aaj bina kisi formality ke dher saari baatein karte hain! ${context.city} mein sab badiya?`;
        }
        addMsg(greet, "bot");
    }, 1000);
}

// Check on Load
window.onload = () => {
    if (localStorage.getItem("userName")) {
        document.getElementById("welcome-popup").style.display = "none";
        const name = localStorage.getItem("userName");
        const mode = localStorage.getItem("chatMode");
        initiateGreeting(name, mode);
    }
};

// --- Main Chat Logic ---
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
                answer: text.toLowerCase(),
                timestamp: serverTimestamp(),
                learnedFrom: localStorage.getItem("userName")
            });
            setTimeout(() => {
                typing.classList.add("hidden");
                addMsg(`Theek hai, maine yaad kar liya! 😍 Sikhane ke liye shukriya.`, "bot");
                isLearning = false;
                localStorage.removeItem("isLearning");
            }, 1000);
        } catch (e) { console.error(e); }
        return;
    }

    typing.classList.remove("hidden");
    const botReply = await getSmartReply(text);

    setTimeout(() => {
        typing.classList.add("hidden");
        if (typeof botReply === "object" && botReply.status === "NEED_LEARNING") {
            isLearning = true;
            pendingQuestion = botReply.question;
            localStorage.setItem("isLearning", "true");
            addMsg(botReply.msg, "bot");
        } else {
            // Personal Touch: Guest mode mein casual, Named mode mein Respectful
            let finalMsg = botReply;
            const mode = localStorage.getItem("chatMode");
            const name = localStorage.getItem("userName");
            
            if (Math.random() > 0.7) {
                finalMsg = mode === "named" ? `${name} ji, ${botReply}` : `${name}, ${botReply}`;
            }
            addMsg(finalMsg, "bot");
        }
    }, 1200);
};

input.addEventListener("keypress", (e) => { if (e.key === "Enter") window.send(); });
