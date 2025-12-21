import { db } from "./firebase.js"; 
import { getSmartReply } from "./smartReply.js";
import { 
    collection, addDoc, serverTimestamp, doc, getDoc, updateDoc, arrayUnion, query, where, getDocs 
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

const chat = document.getElementById("chat");
const input = document.getElementById("input");
const typing = document.getElementById("typing");

// --- 1. State & Proactive Management ---
let conversationHistory = [];
let isLearning = localStorage.getItem("isLearning") === "true";
let pendingQuestion = localStorage.getItem("pendingQuestion") || "";
let proactiveTimer;

// --- 2. NATURAL IDLE TRIGGER ---
function resetProactiveTimer() {
    clearTimeout(proactiveTimer);
    proactiveTimer = setTimeout(triggerProactiveAction, 45000); 
}

async function triggerProactiveAction() {
    if (isLearning || document.hidden) return;
    
    const name = localStorage.getItem("userName") || "Dost";
    // Girl-like proactive messages with name
    const proactiveMsgs = [
        `Sunno **${name}**, kahan chale gaye? 🥺 Mujhse baat nahi karni kya?`,
        `Waise **${name}**, main soch rahi thi.. tum itne chup-chup kyun ho? 🙈`,
        `**${name}**? Are you there? Chalo na kuch interesting batao! ✨`
    ];

    const randomMsg = proactiveMsgs[Math.floor(Math.random() * proactiveMsgs.length)];
    addMsg(randomMsg, "bot");
    conversationHistory.push({ role: "bot", text: randomMsg });
}

async function getUserContext() {
    try {
        const response = await fetch('https://ipapi.co/json/');
        const data = await response.json();
        return { country: data.country_name || "Global", city: data.city || "Earth" };
    } catch (e) { return { country: "Global", city: "Earth" }; }
}

// --- 3. LONG-TERM MEMORY LOGIC ---
async function saveToGlobalMemory(text) {
    const name = localStorage.getItem("userName");
    const email = localStorage.getItem("userEmail");
    if (!name || name === "Dost" || !email) return;

    const triggers = ["rehta hoon", "rehti hoon", "pasand hai", "love", "favorite", "born in"];
    const isImportant = triggers.some(t => text.toLowerCase().includes(t));

    if (isImportant) {
        try {
            const q = query(collection(db, "users_list"), where("email", "==", email));
            const snap = await getDocs(q);
            if (!snap.empty) {
                const userDoc = snap.docs[0].ref;
                await updateDoc(userDoc, {
                    memories: arrayUnion({ text, date: new Date().toISOString() })
                });
            }
        } catch (e) { console.error("Memory Error:", e); }
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
    resetProactiveTimer();
}

// --- 4. GREETING WITH PERSONAL RECALL ---
async function initiateGreeting(name, mode) {
    if (sessionStorage.getItem("greeted")) return;
    const context = await getUserContext();
    const email = localStorage.getItem("userEmail");

    let memoryRecall = "";
    if (email) {
        try {
            const q = query(collection(db, "users_list"), where("email", "==", email));
            const snap = await getDocs(q);
            if (!snap.empty) {
                const userData = snap.docs[0].data();
                if (userData.memories && userData.memories.length > 0) {
                    const lastMemory = userData.memories[userData.memories.length - 1].text;
                    memoryRecall = ` Waise mujhe yaad hai, tumne bataya tha: "${lastMemory}" 😊`;
                }
            }
        } catch (e) { console.error(e); }
    }

    setTimeout(() => {
        let greet = mode === "named" 
            ? `Hlo **${name}**! ✨ Connecting from ${context.city}.${memoryRecall}` 
            : `Hey **Dost**! 👤 Let's chat. How's it going in ${context.city}?`;
        addMsg(greet, "bot");
        sessionStorage.setItem("greeted", "true");
    }, 1000);
}

// --- 5. MAIN CHAT LOGIC (Natural Style) ---
window.send = async () => {
    const text = input.value.trim();
    if (!text) return;

    input.value = "";
    addMsg(text, "user");
    
    saveToGlobalMemory(text); 
    conversationHistory.push({ role: "user", text });
    if (conversationHistory.length > 6) conversationHistory.shift();

    if (isLearning) {
        typing.classList.remove("hidden");
        setTimeout(async () => {
            try {
                await addDoc(collection(db, "temp_learning"), {
                    question: pendingQuestion,
                    answer: text,
                    learnedFrom: localStorage.getItem("userName"),
                    timestamp: serverTimestamp()
                });
                typing.classList.add("hidden");
                addMsg(`Theek hai **${localStorage.getItem("userName")}**, maine yaad kar liya! 🎓`, "bot");
                isLearning = false;
                localStorage.removeItem("isLearning");
            } catch (e) { console.error(e); }
        }, 1200);
        return;
    }

    // Natural Think-Delay
    const thinkTime = Math.random() * (1500 - 800) + 800; 
    setTimeout(async () => {
        typing.classList.remove("hidden");
        try {
            const botReply = await getSmartReply(text, conversationHistory);
            
            // Human Typing Speed based on length
            let replyText = (typeof botReply === "object") ? botReply.msg : botReply;
            const typingDuration = Math.min(Math.max(replyText.length * 35, 1200), 4500);

            setTimeout(() => {
                typing.classList.add("hidden");
                // Natural Suffixes
                const girlHabits = [" ✨", " 🙈", " na?", " 😊"];
                const finalReply = replyText + (Math.random() > 0.7 ? girlHabits[Math.floor(Math.random() * girlHabits.length)] : "");
                
                addMsg(finalReply, "bot");
                conversationHistory.push({ role: "bot", text: finalReply });
            }, typingDuration);
        } catch (e) {
            typing.classList.add("hidden");
            addMsg("Satellite connection slow hai yaar.. 🛰️", "bot");
        }
    }, thinkTime);
};

window.onload = () => {
    if (localStorage.getItem("userName")) {
        const popup = document.getElementById("welcome-popup");
        if(popup) popup.style.display = "none";
        initiateGreeting(localStorage.getItem("userName"), localStorage.getItem("chatMode"));
    }
};

input.addEventListener("keypress", (e) => { if (e.key === "Enter") window.send(); });
