import { db } from "./firebase.js";
import { getSmartReply } from "./smartReply.js";
import { collection, addDoc, serverTimestamp, query, where, getDocs, updateDoc, deleteDoc, doc } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

const chat = document.getElementById("chat");
const input = document.getElementById("input");
const typing = document.getElementById("typing");

let isLearning = false;
let pendingQuestion = "";

const starters = ["Aur batao, kya chal raha hai? 😊", "Wese aaj ka din kaisa raha?", "Interesting! Kuch aur puchenge? 🤔"];

function addMsg(text, cls) {
    const d = document.createElement("div");
    d.className = `msg ${cls}`;
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const ticks = cls === 'user' ? '<span class="ticks">✓✓</span>' : '';
    d.innerHTML = `<div>${text}</div><div class="time">${time} ${ticks}</div>`;
    chat.appendChild(d);
    chat.scrollTop = chat.scrollHeight;
}

async function saveLearnedAnswer(q, a) {
    const tAnswer = a.toLowerCase().trim();
    await addDoc(collection(db, "temp_learning"), { question: q, answer: tAnswer, count: 1, time: serverTimestamp() });
}

window.send = async () => {
    const text = input.value.trim();
    if (!text) return;

    input.value = "";
    addMsg(text, "user");

    if (isLearning) {
        typing.classList.remove("hidden");
        await saveLearnedAnswer(pendingQuestion, text);
        setTimeout(() => {
            typing.classList.add("hidden");
            addMsg(`Wah! Maine yaad kar liya. 😍 ${starters[Math.floor(Math.random()*starters.length)]}`, "bot");
            isLearning = false;
        }, 1200);
        return;
    }

    typing.classList.remove("hidden");
    const botReply = await getSmartReply(text);
    setTimeout(() => {
        typing.classList.add("hidden");
        if (typeof botReply === "object") {
            isLearning = true;
            pendingQuestion = botReply.question;
            addMsg(botReply.msg, "bot");
        } else {
            addMsg(botReply, "bot");
        }
    }, 1200);
};
