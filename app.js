import { db } from "./firebase.js";
import { getSmartReply } from "./smartReply.js";
import { collection, addDoc, serverTimestamp, query, where, getDocs, updateDoc, deleteDoc, doc } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

const chat = document.getElementById("chat");
const input = document.getElementById("input");
const typing = document.getElementById("typing");

let isLearning = false;
let pendingQuestion = "";

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

// --- Community Learning Logic ---
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

  if (isLearning) {
    await saveLearnedAnswer(pendingQuestion, text);
    typing.classList.remove("hidden");
    setTimeout(() => {
      typing.classList.add("hidden");
      const follows = ["Sikhne ke liye shukriya! 😍 Aur batao kya chal raha hai?", "Maine yaad kar liya! ✨ Wese aur kuch naya?", "Interesting! Chalo, ab kuch aur baatein karte hain."];
      addMsg(follows[Math.floor(Math.random() * follows.length)], "bot");
      isLearning = false;
      pendingQuestion = "";
    }, 1000);
    return;
  }

  typing.classList.remove("hidden");
  const botReply = await getSmartReply(text);

  setTimeout(() => {
    typing.classList.add("hidden");
    // [object Object] Fix: Check if botReply is an object
    if (typeof botReply === "object" && botReply !== null) {
      isLearning = true;
      pendingQuestion = botReply.question;
      addMsg(botReply.msg, "bot");
    } else {
      addMsg(botReply, "bot");
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
