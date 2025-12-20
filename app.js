import { db } from "./firebase.js";
import { getSmartReply } from "./smartReply.js";
import {
  collection, addDoc, updateDoc, deleteDoc,
  doc, serverTimestamp, getDocs, query, where
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

const chat = document.getElementById("chat");
const input = document.getElementById("input");
const typing = document.getElementById("typing");
const status = document.getElementById("status");

// --- LOGIC VARIABLES ---
let lastUserMsg = "";
let repeatCount = 0;
let isLearning = false;
let pendingQuestion = "";

// 1. Scroll Logic
function scrollToBottom() {
  setTimeout(() => {
    chat.scrollTo({ top: chat.scrollHeight, behavior: 'smooth' });
  }, 100);
}

// 2. UI Message Logic
function addMsg(text, cls, docId = null) {
  const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const d = document.createElement("div");
  d.className = `msg ${cls}`;
  d.innerHTML = `
    <span>${text}</span>
    <span class="time">
      ${time} 
      ${cls === 'user' ? '<span style="color:#53bdeb; margin-left:3px; font-weight:bold;">✓✓</span>' : ''}
    </span>
  `;

  if (cls === "user" && docId) {
    d.onclick = (e) => {
      e.stopPropagation();
      showMenu(d, docId);
    };
  }

  chat.appendChild(d);
  scrollToBottom();
}

// 3. Community Learning: Save Answer Logic
async function saveLearnedAnswer(q, a) {
  const tAnswer = a.toLowerCase().trim();
  const learningRef = collection(db, "temp_learning");
  
  const qry = query(learningRef, where("question", "==", q), where("answer", "==", tAnswer));
  const snap = await getDocs(qry);

  if (!snap.empty) {
    const docData = snap.docs[0];
    const newCount = (docData.data().count || 1) + 1;

    if (newCount >= 3) {
      await addDoc(collection(db, "brain"), {
        question: q,
        answer: a,
        trainedBy: "community",
        time: serverTimestamp()
      });
      await deleteDoc(doc(db, "temp_learning", docData.id));
    } else {
      await updateDoc(doc(db, "temp_learning", docData.id), { count: newCount });
    }
  } else {
    await addDoc(learningRef, {
      question: q,
      answer: tAnswer,
      originalText: a,
      count: 1,
      time: serverTimestamp()
    });
  }
}

// 4. MAIN SEND FUNCTION
window.send = async () => {
  const text = input.value.trim();
  if (!text) return;

  // A. IF IN LEARNING MODE
  if (isLearning) {
    input.value = "";
    addMsg(text, "user");
    await saveLearnedAnswer(pendingQuestion, text);
    addMsg("Shukriya! 😍 Maine seekh liya hai. Jab 3 log yahi jawab denge, main ise hamesha yaad rakhungi.", "bot");
    isLearning = false;
    pendingQuestion = "";
    return;
  }

  // B. SPAM CHECK
  if (text.toLowerCase() === lastUserMsg.toLowerCase()) {
    repeatCount++;
  } else {
    repeatCount = 0;
    lastUserMsg = text;
  }

  input.value = "";
  input.blur(); // Keyboard auto-hide

  try {
    // Save User Msg
    const ref = await addDoc(
      collection(db, "chats", "user", "messages"),
      { text, createdAt: serverTimestamp() }
    );
    addMsg(text, "user", ref.id);

    // C. ROAST IF SPAMMED
    if (repeatCount >= 3) {
      typing.classList.remove("hidden");
      setTimeout(() => {
        typing.classList.add("hidden");
        const roastMsgs = [
          "Ek hi baat bar bar bol kar paka rahe ho! 🙄",
          "Bhai, record todna hai kya? Kuch naya bolo! 🥱",
          "Bas bhi karo! Main samajh gayi ek hi baar mein. ✋"
        ];
        addMsg(roastMsgs[Math.floor(Math.random() * roastMsgs.length)], "bot");
      }, 1000);
      return;
    }

    // D. SMART BOT REPLY
    typing.classList.remove("hidden");
    const botReply = await getSmartReply(text);
    
    setTimeout(() => {
      typing.classList.add("hidden");

      // Check if reply is Object (Learning Mode) or String
      if (typeof botReply === 'object' && botReply !== null) {
        if (botReply.type === "LEARNING_MODE") {
          isLearning = true;
          pendingQuestion = botReply.question;
          addMsg(botReply.msg, "bot");
        }
      } else {
        addMsg(botReply, "bot");
      }
    }, 1200);

  } catch (error) {
    console.error("Error:", error);
  }
};

// 5. ADDITIONAL UI LOGIC
input.addEventListener("keypress", (e) => {
  if (e.key === "Enter") { e.preventDefault(); window.send(); }
});

function showMenu(el, id) {
  const old = document.querySelector(".menu");
  if (old) old.remove();
  const m = document.createElement("div");
  m.className = "menu";
  m.innerHTML = `<div onclick="editMsg('${id}')">✏️ Edit</div><div onclick="delMsg('${id}')">🗑️ Delete</div>`;
  el.appendChild(m);
  document.addEventListener('click', () => m.remove(), { once: true });
}

window.editMsg = async (id) => {
  const t = prompt("Edit your message:");
  if (t && t.trim() !== "") {
    await updateDoc(doc(db, "chats", "user", "messages", id), { text: t });
    location.reload();
  }
};

window.delMsg = async (id) => {
  if (confirm("Delete permanently?")) {
    await deleteDoc(doc(db, "chats", "user", "messages", id));
    location.reload();
  }
};

window.addEventListener("beforeunload", () => {
  status.innerText = "last seen just now";
});
