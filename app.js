import { db } from "./firebase.js";
import { getSmartReply } from "./smartReply.js";
import {
  collection, addDoc, updateDoc, deleteDoc,
  doc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

const chat = document.getElementById("chat");
const input = document.getElementById("input");
const typing = document.getElementById("typing");
const status = document.getElementById("status");

// Spam Control Variables
let lastUserMsg = "";
let repeatCount = 0;

function scrollToBottom() {
  setTimeout(() => {
    chat.scrollTo({ top: chat.scrollHeight, behavior: 'smooth' });
  }, 100);
}

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

// Main Send Function
window.send = async () => {
  const text = input.value.trim();
  if (!text) return;

  // --- 1. SPAM CHECK LOGIC ---
  if (text.toLowerCase() === lastUserMsg.toLowerCase()) {
    repeatCount++;
  } else {
    repeatCount = 0;
    lastUserMsg = text;
  }

  input.value = "";
  input.blur(); // Keyboard Hide

  // --- 2. UI & FIREBASE SAVE ---
  try {
    const ref = await addDoc(
      collection(db, "chats", "user", "messages"),
      { text, createdAt: serverTimestamp() }
    );
    addMsg(text, "user", ref.id);

    // --- 3. REPEAT CHECK REACTION ---
    if (repeatCount >= 3) {
      typing.classList.remove("hidden");
      setTimeout(() => {
        typing.classList.add("hidden");
        const roastMsgs = [
          "Ek hi baat bar bar bol kar paka rahe ho! 🙄",
          "Bhai, record todna hai kya? Kuch naya bolo! 🥱",
          "Lagta hai aapki suyi atak gayi hai. 😂",
          "Bas bhi karo! Main samajh gayi ek hi baar mein. ✋"
        ];
        addMsg(roastMsgs[Math.floor(Math.random() * roastMsgs.length)], "bot");
      }, 1000);
      return; // Stop further logic
    }

    // --- 4. NORMAL BOT REPLY ---
    typing.classList.remove("hidden");
    const botReply = await getSmartReply(text);
    
    setTimeout(() => {
      typing.classList.add("hidden");
      addMsg(botReply, "bot");
    }, 1500);

  } catch (error) {
    console.error("Error:", error);
  }
};

// ... Baki functions (Menu, Edit, Delete) wahi rahenge ...

input.addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    e.preventDefault(); 
    window.send(); 
  }
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
  if (confirm("Delete this message permanently?")) {
    await deleteDoc(doc(db, "chats", "user", "messages", id));
    location.reload();
  }
};

window.addEventListener("beforeunload", () => {
  status.innerText = "last seen just now";
});
