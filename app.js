import { db } from "./firebase.js"; 
import { getSmartReply } from "./smartReply.js";
import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

const chat = document.getElementById("chat");
const input = document.getElementById("input");
const typing = document.getElementById("typing");

// --- 1. Memory Management ---
let userName = localStorage.getItem("userName") || "";
let chatMode = localStorage.getItem("chatMode") || ""; 
let isLearning = localStorage.getItem("isLearning") === "true";
let pendingQuestion = localStorage.getItem("pendingQuestion") || "";

// Location Helper
async function getUserContext() {
    try {
        const response = await fetch('https://ipapi.co/json/');
        const data = await response.json();
        return { country: data.country_name || "Global", city: data.city || "Earth" };
    } catch (e) {
        return { country: "Global", city: "Earth" };
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

// --- 2. LOGIN & POPUP ---
window.showNameForm = () => {
    document.getElementById("initial-options").style.display = "none";
    document.getElementById("name-form").style.display = "block";
};

window.startNamedChat = async () => {
    const name = document.getElementById("u-name")?.value.trim();
    const email = document.getElementById("u-email")?.value.trim();

    if (name && email) {
        localStorage.setItem("userName", name);
        localStorage.setItem("chatMode", "named");
        localStorage.setItem("isNewUser", "true");
        document.getElementById("welcome-popup").style.display = "none";

        try {
            await addDoc(collection(db, "users_list"), { name, email, visits: 1, timestamp: serverTimestamp() });
        } catch (e) { console.error(e); }
        initiateGreeting(name, "named");
    } else { alert("Please enter details! 😊"); }
};

window.startGuestChat = () => {
    localStorage.setItem("userName", "Dost");
    localStorage.setItem("chatMode", "guest");
    localStorage.setItem("isNewUser", "true");
    document.getElementById("welcome-popup").style.display = "none";
    initiateGreeting("Dost", "guest");
};

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

// --- 3. MAIN CHAT LOGIC (Error Fix Included) ---
window.send = async () => {
    const text = input.value.trim();
    if (!text) return;

    input.value = "";
    addMsg(text, "user");

    // Handling Learning Submission
    if (isLearning) {
        typing.classList.remove("hidden");
        try {
            await addDoc(collection(db, "temp_learning"), {
                question: pendingQuestion,
                answer: text,
                learnedFrom: localStorage.getItem("userName"),
                timestamp: serverTimestamp()
            });
            setTimeout(() => {
                typing.classList.add("hidden");
                addMsg(`Theek hai, maine yaad kar liya! 🎓 Admin ke approval ke baad main ise seekh jaungi.`, "bot");
                isLearning = false;
                localStorage.removeItem("isLearning");
            }, 1000);
        } catch (e) { console.error(e); }
        return;
    }

    typing.classList.remove("hidden");
    try {
        const botReply = await getSmartReply(text);
        
        setTimeout(() => {
            typing.classList.add("hidden");

            // FIX: Agar botReply object hai (Learning Needed), toh uska .msg extract karein
            if (typeof botReply === "object" && botReply.status === "NEED_LEARNING") {
                isLearning = true;
                pendingQuestion = botReply.question;
                localStorage.setItem("isLearning", "true");
                addMsg(botReply.msg, "bot"); // Sirf text dikhayega, object nahi
            } else {
                addMsg(botReply, "bot"); // Seedha text string dikhayega
            }
        }, 1200);
    } catch (e) {
        typing.classList.add("hidden");
        addMsg("Satellite connection slow lag raha hai... 🛰️", "bot");
    }
};

window.onload = () => {
    if (localStorage.getItem("userName")) {
        const popup = document.getElementById("welcome-popup");
        if(popup) popup.style.display = "none";
        initiateGreeting(localStorage.getItem("userName"), localStorage.getItem("chatMode"));
    }
};

input.addEventListener("keypress", (e) => { if (e.key === "Enter") window.send(); });
