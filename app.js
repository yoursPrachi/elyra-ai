import { db } from "./firebase.js";
import { getSmartReply } from "./smartReply.js";
import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

const chat = document.getElementById("chat");
const input = document.getElementById("input");
const typing = document.getElementById("typing");

let isLearning = localStorage.getItem("isLearning") === "true";
let pendingQuestion = localStorage.getItem("pendingQuestion") || "";

// Topic change karne waale sawal
const engagementStarters = [
    "Wese, aapka koi favourite hobby hai? 🎨",
    "Chalo ek game khelte hain! Aap sawal pucho main jawab doongi. 😎",
    "Aaj kal log AI ke baare mein kya sochte hain, aapka kya khayal hai? 🤔",
    "Mera mann kar raha hai kuch naya sunne ka, koi shayari sunao? ✍️"
];

function addMsg(text, cls) {
    const d = document.createElement("div");
    d.className = `msg ${cls}`;
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const ticks = cls === 'user' ? '<span class="ticks">✓✓</span>' : '';
    d.innerHTML = `<div class="msg-content">${text}</div><div class="time">${timeStr} ${ticks}</div>`;
    chat.appendChild(d);
    chat.scrollTop = chat.scrollHeight;
}

window.send = async () => {
    const text = input.value.trim();
    if (!text) return;

    input.value = "";
    addMsg(text, "user");

    // --- CASE 1: BOT LEARNING ---
    if (isLearning) {
        typing.classList.remove("hidden");
        try {
            await addDoc(collection(db, "temp_learning"), {
                question: pendingQuestion,
                answer: text.toLowerCase(),
                timestamp: serverTimestamp()
            });
            
            setTimeout(() => {
                typing.classList.add("hidden");
                const starter = engagementStarters[Math.floor(Math.random() * engagementStarters.length)];
                addMsg(`Wah! Maine yaad kar liya. 😍 Aap bahut ache teacher ho!\n\n${starter}`, "bot");
                
                isLearning = false;
                localStorage.removeItem("isLearning");
                localStorage.removeItem("pendingQuestion");
            }, 1000);
        } catch (e) { console.log(e); }
        return;
    }

    // --- CASE 2: NORMAL CHAT ---
    typing.classList.remove("hidden");
    const botReply = await getSmartReply(text);

    setTimeout(() => {
        typing.classList.add("hidden");
        if (typeof botReply === "object" && botReply.status === "NEED_LEARNING") {
            isLearning = true;
            pendingQuestion = botReply.question;
            localStorage.setItem("isLearning", "true");
            localStorage.setItem("pendingQuestion", pendingQuestion);
            addMsg(botReply.msg, "bot");
        } else {
            // Normal reply + 15% chance of keeping the flow alive
            let finalMsg = botReply;
            if (Math.random() > 0.85) {
                finalMsg += "\n\n" + engagementStarters[Math.floor(Math.random() * engagementStarters.length)];
            }
            addMsg(finalMsg, "bot");
        }
    }, 1200);
};

input.addEventListener("keypress", (e) => { if (e.key === "Enter") window.send(); });
