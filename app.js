import { db } from "./firebase.js";
import { getSmartReply } from "./smartReply.js";
import { collection, addDoc, serverTimestamp, query, where, getDocs, updateDoc, deleteDoc, doc } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

const chat = document.getElementById("chat");
const input = document.getElementById("input");
const typing = document.getElementById("typing");

let isLearning = false;
let pendingQuestion = "";

// Follow-up questions to keep conversation alive
const followUps = [
    "Wese, aur kya chal raha hai? 😊",
    "Tumhe mere sath baat karna kaisa lag raha hai?",
    "Acha, aaj ka din kaisa raha tumhara? ✨",
    "Chalo ye batao, tumhari fav cheez kya hai?",
    "Interesting! Wese aur kuch puchenge?"
];

function scrollToBottom() {
    chat.scrollTop = chat.scrollHeight;
}

function addMsg(text, cls) {
    const d = document.createElement("div");
    d.className = `msg ${cls}`;
    d.innerText = text;
    chat.appendChild(d);
    scrollToBottom();
}

async function saveLearnedAnswer(q, a) {
    const tAnswer = a.toLowerCase().trim();
    const learningRef = collection(db, "temp_learning");
    const qry = query(learningRef, where("question", "==", q), where("answer", "==", tAnswer));
    const snap = await getDocs(qry);

    if (!snap.empty) {
        const docData = snap.docs[0];
        const newCount = (docData.data().count || 1) + 1;
        if (newCount >= 3) {
            await addDoc(collection(db, "brain"), { question: q, answer: a, type: "community", time: serverTimestamp() });
            await deleteDoc(doc(db, "temp_learning", docData.id));
        } else {
            await updateDoc(doc(db, "temp_learning", docData.id), { count: newCount });
        }
    } else {
        await addDoc(learningRef, { question: q, answer: tAnswer, count: 1, time: serverTimestamp() });
    }
}

window.send = async () => {
    const text = input.value.trim();
    if (!text) return;

    input.value = "";
    addMsg(text, "user");

    // --- Learning Mode Handler ---
    if (isLearning) {
        typing.classList.remove("hidden");
        await saveLearnedAnswer(pendingQuestion, text);
        
        setTimeout(() => {
            typing.classList.add("hidden");
            const randomFollow = followUps[Math.floor(Math.random() * followUps.length)];
            addMsg(`Shukriya! Maine yaad kar liya. 😍 ${randomFollow}`, "bot");
            isLearning = false;
            pendingQuestion = "";
        }, 1000);
        return;
    }

    // --- Normal Mode Handler ---
    typing.classList.remove("hidden");
    const botReply = await getSmartReply(text);

    setTimeout(() => {
        typing.classList.add("hidden");
        
        // Fix for [object Object]
        if (typeof botReply === "object" && botReply !== null) {
            isLearning = true;
            pendingQuestion = botReply.question;
            addMsg(botReply.msg, "bot");
        } else {
            // Normal reply with 20% chance of follow-up
            let finalReply = botReply;
            if (Math.random() > 0.8) finalReply += ` ${followUps[Math.floor(Math.random() * followUps.length)]}`;
            addMsg(finalReply, "bot");
        }
    }, 1200);
};

// Keyboard Alignment Fix
if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", () => {
        document.getElementById("app-container").style.height = `${window.visualViewport.height}px`;
        scrollToBottom();
    });
}

input.addEventListener("keypress", (e) => { if (e.key === "Enter") window.send(); });
