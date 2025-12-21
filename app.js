import { db } from "./firebase.js"; 
import { getSmartReply } from "./smartReply.js";
import { 
    collection, addDoc, serverTimestamp, doc, getDoc, updateDoc, arrayUnion, query, where, getDocs 
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

const chat = document.getElementById("chat");
const input = document.getElementById("input");
const typing = document.getElementById("typing");

// --- 1. State Management ---
let conversationHistory = [];
let isLearning = localStorage.getItem("isLearning") === "true";
let pendingQuestion = localStorage.getItem("pendingQuestion") || "";

// Location Context
async function getUserContext() {
    try {
        const response = await fetch('https://ipapi.co/json/');
        const data = await response.json();
        return { country: data.country_name || "Global", city: data.city || "Earth" };
    } catch (e) { return { country: "Global", city: "Earth" }; }
}

// --- 2. LONG-TERM MEMORY LOGIC ---
async function saveToGlobalMemory(text) {
    const name = localStorage.getItem("userName");
    const email = localStorage.getItem("userEmail"); // Registration ke waqt save kiya gaya
    if (!name || name === "Dost" || !email) return;

    // Memory Keywords Detection
    const triggers = ["rehta hoon", "rehti hoon", "pasand hai", "love", "favorite", "born in"];
    const isImportant = triggers.some(t => text.toLowerCase().includes(t));

    if (isImportant) {
        try {
            // User ke document ko email se find karein
            const q = query(collection(db, "users_list"), where("email", "==", email));
            const snap = await getDocs(q);
            
            if (!snap.empty) {
                const userDoc = snap.docs[0].ref;
                await updateDoc(userDoc, {
                    memories: arrayUnion({ text, date: new Date().toISOString() })
                });
                console.log("Memory Secured 🧠");
            }
        } catch (e) { console.error("Memory Save Error:", e); }
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

// --- 3. GREETING WITH RECALL ---
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
                    memoryRecall = ` Waise, mujhe yaad hai aapne kaha tha: "${lastMemory}" 😊`;
                }
            }
        } catch (e) { console.error(e); }
    }

    setTimeout(() => {
        let greet = mode === "named" 
            ? `Welcome **${name}**! ✨ Connecting from ${context.city}.${memoryRecall}` 
            : `Hey **Dost**! 👤 Let's chat. How's it going in ${context.city}?`;
        addMsg(greet, "bot");
        sessionStorage.setItem("greeted", "true");
    }, 1000);
}

// --- 4. MAIN CHAT & CONTEXT LOGIC ---
window.send = async () => {
    const text = input.value.trim();
    if (!text) return;

    input.value = "";
    addMsg(text, "user");
    
    // Update Memory & History
    saveToGlobalMemory(text); 
    conversationHistory.push({ role: "user", text });
    if (conversationHistory.length > 6) conversationHistory.shift();

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
                addMsg(`Theek hai, maine yaad kar liya! 🎓 Admin approval ke baad main ise seekh jaungi.`, "bot");
                isLearning = false;
                localStorage.removeItem("isLearning");
            }, 1000);
        } catch (e) { console.error(e); }
        return;
    }

    typing.classList.remove("hidden");
    try {
        // History pass karein contextual reply ke liye
        const botReply = await getSmartReply(text, conversationHistory); 
        
        setTimeout(() => {
            typing.classList.add("hidden");
            let finalMsg = (typeof botReply === "object") ? botReply.msg : botReply;

            if (typeof botReply === "object" && botReply.status === "NEED_LEARNING") {
                isLearning = true;
                pendingQuestion = botReply.question;
                localStorage.setItem("isLearning", "true");
            }
            
            conversationHistory.push({ role: "bot", text: finalMsg });
            addMsg(finalMsg, "bot");
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
