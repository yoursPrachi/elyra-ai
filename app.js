import { db } from "./firebase.js";
import { getSmartReply } from "./smartReply.js";
import { collection, addDoc, serverTimestamp, doc, updateDoc, increment, getDocs, query, where, limit } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

const chat = document.getElementById("chat");
const input = document.getElementById("input");
const typing = document.getElementById("typing");

// --- Memory & State Management ---
let userName = localStorage.getItem("userName") || "";
let chatMode = localStorage.getItem("chatMode") || ""; 
let isLearning = localStorage.getItem("isLearning") === "true";
let pendingQuestion = localStorage.getItem("pendingQuestion") || "";

// Location Helper
async function getUserContext() {
    try {
        const response = await fetch('https://ipapi.co/json/');
        const data = await response.json();
        return { country: data.country_name || "the World", city: data.city || "your place" };
    } catch (e) {
        return { country: "the World", city: "your place" };
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
        localStorage.setItem("isNewUser", "true"); 
        localStorage.setItem("visitCount", "1"); // Initialize visits
        document.getElementById("welcome-popup").style.display = "none";
        
        try {
            await addDoc(collection(db, "users_list"), { 
                name, 
                email, 
                visits: 1, 
                timestamp: serverTimestamp() 
            });
        } catch (e) { console.error(e); }
        
        initiateGreeting(name, "named");
    } else { alert("Naam aur Email zaroori hain! 😊"); }
};

window.startGuestChat = () => {
    localStorage.setItem("userName", "Dost");
    localStorage.setItem("chatMode", "guest");
    localStorage.setItem("isNewUser", "true");
    localStorage.setItem("visitCount", "1");
    document.getElementById("welcome-popup").style.display = "none";
    initiateGreeting("Dost", "guest");
};

// --- SMART LOYALTY GREETING LOGIC ---
async function initiateGreeting(name, mode) {
    if (sessionStorage.getItem("greeted")) return;

    // Update Local Visit Count
    let visits = parseInt(localStorage.getItem("visitCount") || "0");
    if (localStorage.getItem("isNewUser") !== "true") {
        visits++;
        localStorage.setItem("visitCount", visits.toString());
    }

    setTimeout(async () => {
        let greet = "";
        const isNew = localStorage.getItem("isNewUser") === "true";

        if (isNew) {
            const context = await getUserContext();
            greet = mode === "named" 
                ? `Swaagat hai **${name}**! ✨ Aap ${context.city} se jud rahe hain, jaan kar khushi hui. Bataiye main aapki kya madad kar sakti hoon?` 
                : `Hey **Dost**! 👤 Kaise ho? Chalo aaj dher saari baatein karte hain!`;
            localStorage.removeItem("isNewUser");
        } else {
            // Loyalty Based Greetings
            if (visits <= 3) {
                greet = `Welcome back, **${name}**! 😍 Khushi hui aapko dubara dekh kar.`;
            } else if (visits > 3 && visits <= 10) {
                greet = `Namaste **${name}** ji! 🙏 Aap toh hamare purane dost ban gaye hain. Bataiye aaj kya naya hai?`;
            } else {
                greet = `Oho! Hamare **VIP Dost ${name}** tashreef laye hain! 👑 Aapka aana hamare liye khas hai.`;
            }
        }
        
        addMsg(greet, "bot");
        sessionStorage.setItem("greeted", "true");
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
            let finalMsg = botReply;
            const mode = localStorage.getItem("chatMode");
            const name = localStorage.getItem("userName");
            const visits = parseInt(localStorage.getItem("visitCount") || "1");
            
            // VIPs get more respect
            if (visits > 10) {
                finalMsg = `Ji ${name} Sahab, ${botReply}`;
            } else if (Math.random() > 0.8) {
                finalMsg = mode === "named" ? `${name} ji, ${botReply}` : `${name}, ${botReply}`;
            }
            addMsg(finalMsg, "bot");
        }
    }, 1200);
};

input.addEventListener("keypress", (e) => { if (e.key === "Enter") window.send(); });
