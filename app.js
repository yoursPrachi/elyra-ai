import { db } from "./firebase.js";
import { getSmartReply } from "./smartReply.js";
import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

const chat = document.getElementById("chat");
const input = document.getElementById("input");
const typing = document.getElementById("typing");

let isLearning = false;
let pendingQuestion = "";

// Chat flow maintain karne ke liye
const starters = ["Aur batao, kya chal raha hai? 😊", "Wese aaj ka din kaisa raha?", "Interesting! Kuch aur puchenge? 🤔"];

function addMsg(text, cls) {
    const d = document.createElement("div");
    d.className = `msg ${cls}`;
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const ticks = cls === 'user' ? '<span class="ticks">✓✓</span>' : '';
    
    // UI fix: Time aur text ka layout aapke perfect CSS ke mutabiq
    d.innerHTML = `<div class="msg-content">${text}</div><div class="time">${time} ${ticks}</div>`;
    chat.appendChild(d);
    chat.scrollTop = chat.scrollHeight;
}

window.send = async () => {
    const text = input.value.trim();
    if (!text) return;

    input.value = "";
    addMsg(text, "user");

    // --- STEP A: AGAR BOT SEEKH RAHA HAI ---
    if (isLearning) {
        typing.classList.remove("hidden");
        try {
            await addDoc(collection(db, "temp_learning"), {
                question: pendingQuestion,
                answer: text.toLowerCase(),
                count: 1,
                timestamp: serverTimestamp()
            });
            
            setTimeout(() => {
                typing.classList.add("hidden");
                const followUp = starters[Math.floor(Math.random() * starters.length)];
                addMsg(`Wah! Maine yaad kar liya. Sikhane ke liye thnx! 😍\n\n${followUp}`, "bot");
                isLearning = false; // Reset learning mode
                pendingQuestion = "";
            }, 1000);
        } catch (e) { console.error(e); }
        return; // Search logic bypass karein
    }

    // --- STEP B: NORMAL CHAT MODE ---
    typing.classList.remove("hidden");
    const botReply = await getSmartReply(text);

    setTimeout(() => {
        typing.classList.add("hidden");
        
        // Agar reply ek object hai, toh iska matlab sawal ka jawab nahi pata
        if (typeof botReply === "object" && botReply.status === "NEED_LEARNING") {
            isLearning = true;
            pendingQuestion = botReply.question;
            addMsg(botReply.msg, "bot");
        } else {
            // Normal text reply
            addMsg(botReply, "bot");
        }
    }, 1200);
};
