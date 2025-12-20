import { db } from "./firebase.js";
import { getSmartReply } from "./smartReply.js";
import {
  collection, addDoc, updateDoc, deleteDoc,
  doc, serverTimestamp, getDocs, query, where
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

const chat = document.getElementById("chat");
const input = document.getElementById("input");
const typing = document.getElementById("typing");

// Logic Variables
let lastUserMsg = "";
let repeatCount = 0;
let isLearning = false;
let pendingQuestion = "";

function scrollToBottom() {
  setTimeout(() => { chat.scrollTo({ top: chat.scrollHeight, behavior: 'smooth' }); }, 100);
}

function addMsg(text, cls, docId = null) {
  const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const d = document.createElement("div");
  d.className = `msg ${cls}`;
  d.innerHTML = `<span>${text}</span><span class="time">${time} ${cls === 'user' ? '✓✓' : ''}</span>`;
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
      await addDoc(collection(db, "brain"), { question: q, answer: a, trainedBy: "community", time: serverTimestamp() });
      await deleteDoc(doc(db, "temp_learning", docData.id));
    } else {
      await updateDoc(doc(db, "temp_learning", docData.id), { count: newCount });
    }
  } else {
    await addDoc(learningRef, { question: q, answer: tAnswer, originalText: a, count: 1, time: serverTimestamp() });
  }
}

window.send = async () => {
  const text = input.value.trim();
  if (!text) return;

  // 1. Agar User sikhane ke bajay wahi word baar-baar bole (Exit Learning Mode)
  if (isLearning && text.toLowerCase() === pendingQuestion.toLowerCase()) {
    isLearning = false;
    pendingQuestion = "";
  }

  // 2. HANDLING LEARNING MODE
  if (isLearning) {
    input.value = "";
    addMsg(text, "user");
    await saveLearnedAnswer(pendingQuestion, text);
    
    typing.classList.remove("hidden");
    setTimeout(() => {
      typing.classList.add("hidden");
      const successMsgs = [
        "Wah! Maine yaad kar liya. 😍 Aur batao, kya chal raha hai?",
        "Shukriya sikhane ke liye! Aap smart ho. 😎 Wese aur kuch naya?",
        "Done! Maine save kar liya. ✨ Chalo, ab kuch aur baatein karein?"
      ];
      addMsg(successMsgs[Math.floor(Math.random() * successMsgs.length)], "bot");
      isLearning = false;
      pendingQuestion = "";
    }, 1000);
    return;
  }

  // 3. NORMAL CHAT LOGIC
  if (text.toLowerCase() === lastUserMsg.toLowerCase()) { repeatCount++; } 
  else { repeatCount = 0; lastUserMsg = text; }

  input.value = "";
  input.blur();
  addMsg(text, "user");

  // Spam Roast
  if (repeatCount >= 3) {
    typing.classList.remove("hidden");
    setTimeout(() => {
      typing.classList.add("hidden");
      addMsg("Ek hi baat bar bar bol kar paka rahe ho! 🙄 Kuch naya bolo.", "bot");
    }, 1000);
    return;
  }

  // Smart Reply
  typing.classList.remove("hidden");
  const botReply = await getSmartReply(text);
  
  setTimeout(() => {
    typing.classList.add("hidden");
    if (typeof botReply === 'object' && botReply !== null) {
      isLearning = true;
      pendingQuestion = botReply.question;
      addMsg(botReply.msg, "bot");
    } else {
      addMsg(botReply, "bot");
    }
  }, 1200);
};

input.addEventListener("keypress", (e) => { if (e.key === "Enter") window.send(); });
