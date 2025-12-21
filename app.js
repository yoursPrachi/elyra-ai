import { db } from "./firebase.js"; 
import { getSmartReply } from "./smartReply.js";
import { 
    collection, addDoc, serverTimestamp, query, where, getDocs, updateDoc, arrayUnion, increment 
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

const chat = document.getElementById("chat");
const input = document.getElementById("input");
const typing = document.getElementById("typing");
const welcomePopup = document.getElementById("welcome-popup");

// --- 1. STATE & LOCALIZATION ---
let conversationHistory = [];
let isLearning = localStorage.getItem("isLearning") === "true";
let pendingQuestion = localStorage.getItem("pendingQuestion") || "";
let proactiveTimer;
let userLang = navigator.language || "en";

// --- 2. ADVANCED GEO-TRACKING & USER MANAGEMENT ---
async function getAndSaveUser(name, email) {
    try {
        const res = await fetch('https://ipapi.co/json/');
        const geo = await res.json();
        
        localStorage.setItem("userName", name);
        localStorage.setItem("userEmail", email);
        localStorage.setItem("userCity", geo.city || "Global");

        const q = query(collection(db, "users_list"), where("email", "==", email));
        const snap = await getDocs(q);

        if (snap.empty) {
            // Naya International User Create karein
            await addDoc(collection(db, "users_list"), {
                name, email,
                city: geo.city || "Global",
                country: geo.country_name || "Global",
                lat: geo.latitude || 20, // Admin Map ke liye
                lng: geo.longitude || 0,
                visitCount: 1,
                joinDate: new Date().toISOString(),
                lastSeen: new Date().toISOString()
            });
        } else {
            // Existing User ki visits badhayein
            const userRef = snap.docs[0].ref;
            await updateDoc(userRef, {
                visitCount: increment(1),
                lastSeen: new Date().toISOString()
            });
        }
        return geo.city || "Earth";
    } catch (e) { return "Earth"; }
}

// --- 3. LOGIN INTERFACE LOGIC ---
window.showNameForm = () => {
    document.getElementById("initial-options").style.display = "none";
    document.getElementById("name-form").style.display = "block";
};

window.startNamedChat = async () => {
    const name = document.getElementById("u-name").value.trim();
    const email = document.getElementById("u-email").value.trim();
    if (name && email) {
        const city = await getAndSaveUser(name, email);
        welcomePopup.style.display = "none";
        initiateInternationalGreeting(name, "named", city);
    } else { alert("Suno! Details toh bharo pehle.. ✨"); }
};

window.startGuestChat = async () => {
    const city = await getAndSaveUser("Dost", `guest_${Date.now()}@elyra.ai`);
    welcomePopup.style.display = "none";
    initiateInternationalGreeting("Dost", "guest", city);
};

// --- 4. ANALYTICS & GREETING ---
async function initiateInternationalGreeting(name, mode, city) {
    if (sessionStorage.getItem("greeted")) return;
    
    // Admin Stats ke liye entry
    await addDoc(collection(db, "analytics"), { 
        timestamp: serverTimestamp(), 
        user: name,
        platform: "International-Web" 
    });

    let memoryRecall = "";
    const email = localStorage.getItem("userEmail");
    if (email && !email.includes("guest")) {
        const q = query(collection(db, "users_list"), where("email", "==", email));
        const snap = await getDocs(q);
        if (!snap.empty && snap.docs[0].data().memories) {
            const memories = snap.docs[0].data().memories;
            memoryRecall = ` Waise yaad hai, tumne kaha tha: "${memories[memories.length-1].text}" 😊`;
        }
    }

    setTimeout(() => {
        const greet = `Hlo **${name}**! ✨ Sab theek in ${city}?${memoryRecall}`;
        addMsg(greet, "bot");
        sessionStorage.setItem("greeted", "true");
        resetProactiveTimer();
    }, 1200);
}

// --- 5. MAIN CHAT LOGIC ---
window.send = async () => {
    const text = input.value.trim();
    if (!text) return;

    input.value = "";
    addMsg(text, "user");
    conversationHistory.push({ role: "user", text });
    
    saveToGlobalMemory(text);

    if (isLearning) {
        handleLearning(text);
        return;
    }

    const thinkTime = Math.random() * (1200 - 600) + 600; 
    setTimeout(async () => {
        typing.classList.remove("hidden");
        try {
            const botReply = await getSmartReply(text, conversationHistory);
            let replyText = (typeof botReply === "object") ? botReply.msg : botReply;
            let isNeedLearning = (typeof botReply === "object" && botReply.status === "NEED_LEARNING");

            const typingDuration = Math.min(Math.max(replyText.length * 30, 1200), 4500);
            setTimeout(() => {
                typing.classList.add("hidden");
                if (isNeedLearning) {
                    isLearning = true;
                    pendingQuestion = botReply.question;
                    localStorage.setItem("isLearning", "true");
                }
                const girlHabits = [" ✨", " 🙈", " na?", " 😊"];
                const finalReply = replyText + (Math.random() > 0.7 ? girlHabits[Math.floor(Math.random() * girlHabits.length)] : "");
                addMsg(finalReply, "bot");
                conversationHistory.push({ role: "bot", text: finalReply });
            }, typingDuration);
        } catch (e) { 
            typing.classList.add("hidden"); 
            addMsg("Network slow hai yaar.. 🛰️", "bot"); 
        }
    }, thinkTime);
};

// --- 6. HELPERS & UTILS ---
function addMsg(text, cls) {
    const d = document.createElement("div");
    d.className = `msg ${cls}`;
    const timeStr = new Intl.DateTimeFormat(userLang, { hour: '2-digit', minute: '2-digit' }).format(new Date());
    d.innerHTML = `<div class="msg-content">${text}</div><div class="time">${timeStr}</div>`;
    chat.appendChild(d);
    chat.scrollTop = chat.scrollHeight;
    resetProactiveTimer();
}

function resetProactiveTimer() {
    clearTimeout(proactiveTimer);
    proactiveTimer = setTimeout(() => {
        if (!isLearning && !document.hidden) {
            const name = localStorage.getItem("userName") || "Dost";
            addMsg(`Sunno **${name}**, kahan chale gaye? 🥺`, "bot");
        }
    }, 90000); 
}

async function saveToGlobalMemory(text) {
    const email = localStorage.getItem("userEmail");
    if (!email || email.includes("guest")) return;
    const triggers = ["rehta hoon", "pasand hai", "born in", "my name is"];
    if (triggers.some(t => text.toLowerCase().includes(t))) {
        const q = query(collection(db, "users_list"), where("email", "==", email));
        const snap = await getDocs(q);
        if (!snap.empty) {
            await updateDoc(snap.docs[0].ref, {
                memories: arrayUnion({ text, date: new Date().toISOString() })
            });
        }
    }
}

async function handleLearning(text) {
    typing.classList.remove("hidden");
    try {
        await addDoc(collection(db, "temp_learning"), {
            question: pendingQuestion,
            answer: text,
            learnedFrom: localStorage.getItem("userName"),
            timestamp: serverTimestamp()
        });
        typing.classList.add("hidden");
        addMsg(`Theek hai, maine yaad kar liya! 🎓`, "bot");
        isLearning = false;
        localStorage.removeItem("isLearning");
    } catch (e) { console.error(e); }
}

window.onload = () => {
    if (localStorage.getItem("userName")) {
        welcomePopup.style.display = "none";
        initiateInternationalGreeting(localStorage.getItem("userName"), "named", localStorage.getItem("userCity") || "Earth");
    }
};

input.addEventListener("keypress", (e) => { if (e.key === "Enter") window.send(); });
