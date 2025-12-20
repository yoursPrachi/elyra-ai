import { db } from "./firebase.js";
import { getSmartReply } from "./smartReply.js";
import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

const chat = document.getElementById("chat");
const input = document.getElementById("input");
const typing = document.getElementById("typing");

let isLearning = false;
let pendingQuestion = "";

function addMsg(text, cls) {
    const d = document.createElement("div");
    d.className = `msg ${cls}`;
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const ticks = cls === 'user' ? '<span class="ticks">✓✓</span>' : '';
    d.innerHTML = `<div class="msg-content">${text}</div><div class="time">${time} ${ticks}</div>`;
    chat.appendChild(d);
    chat.scrollTop = chat.scrollHeight;
}

window.send = async () => {
    const text = input.value.trim();
    if (!text) return;

    input.value = "";
    addMsg(text, "user");

    // --- 1. LEARNING MODE HANDLER ---
    if (isLearning === true) {
        typing.classList.remove("hidden");
        try {
            // User ka sikhaya jawab save karein
            await addDoc(collection(db, "temp_learning"), {
                question: pendingQuestion,
                answer: text.toLowerCase(),
                timestamp: serverTimestamp()
            });
            
            setTimeout(() => {
                typing.classList.add("hidden");
                addMsg(`Wah! Maine yaad kar liya. Sikhane ke liye thnx! 😍 Aur batao, kya chal raha hai?`, "bot");
                // IMPORTANT: Yahan flag reset ho raha hai
                isLearning = false; 
                pendingQuestion = "";
            }, 1000);
        } catch (e) {
            console.error(e);
            addMsg("Oh no! Connection error ki wajah se save nahi hua.", "bot");
            isLearning = false;
        }
        return; // Aage ka search bypass karein
    }

    // --- 2. NORMAL SEARCH HANDLER ---
    typing.classList.remove("hidden");
    const botReply = await getSmartReply(text);

    setTimeout(() => {
        typing.classList.add("hidden");
        // Check karein ki bot ko jawab pata hai ya seekhna hai
        if (typeof botReply === "object" && botReply.status === "NEED_LEARNING") {
            isLearning = true;
            pendingQuestion = botReply.question;
            addMsg(botReply.msg, "bot");
        } else {
            addMsg(botReply, "bot");
        }
    }, 1200);
};

// Enter Key Support
input.addEventListener("keypress", (e) => { if (e.key === "Enter") window.send(); });
