import { db } from "./firebase.js";
import {
  collection, addDoc, updateDoc, deleteDoc,
  doc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

const chat = document.getElementById("chat");
const input = document.getElementById("input");
const typing = document.getElementById("typing");
const status = document.getElementById("status");

// 1. Scroll Logic (Smooth Bottom Focus)
function scrollToBottom() {
  setTimeout(() => {
    chat.scrollTo({ top: chat.scrollHeight, behavior: 'smooth' });
  }, 100);
}

// 2. Realistic Message UI
function addMsg(text, cls, docId = null) {
  const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const d = document.createElement("div");
  d.className = `msg ${cls}`;
  
  // Realistic Structure: Text + Time + Blue Ticks for user
  d.innerHTML = `
    <span>${text}</span>
    <span class="time">
      ${time} 
      ${cls === 'user' ? '<span style="color:#53bdeb; margin-left:3px; font-weight:bold;">✓✓</span>' : ''}
    </span>
  `;

  // Edit/Delete on click for User
  if (cls === "user" && docId) {
    d.onclick = (e) => {
      e.stopPropagation();
      showMenu(d, docId);
    };
  }

  chat.appendChild(d);
  scrollToBottom();
}

// 3. ENTER KEY SUPPORT
input.addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    e.preventDefault(); 
    window.send(); 
  }
});

// 4. SEND FUNCTION
window.send = async () => {
  const text = input.value.trim();
  if (!text) return;

  input.value = "";
  input.focus(); // Keeps keyboard active on mobile

  try {
    const ref = await addDoc(
      collection(db, "chats", "user", "messages"),
      { text, createdAt: serverTimestamp() }
    );

    addMsg(text, "user", ref.id);

    // Bot Typing Simulation
    typing.classList.remove("hidden");
    scrollToBottom();
    
    setTimeout(() => {
      typing.classList.add("hidden");
      addMsg("I’m here 🙂 tell me more.", "bot");
    }, 1500);
    
  } catch (error) {
    console.error("Error sending message:", error);
  }
};

// 5. MODERN EDIT/DELETE MENU
function showMenu(el, id) {
  const old = document.querySelector(".menu");
  if (old) old.remove();
  
  const m = document.createElement("div");
  m.className = "menu";
  m.innerHTML = `
    <div onclick="editMsg('${id}')">✏️ Edit</div>
    <div onclick="delMsg('${id}')">🗑️ Delete</div>`;
  el.appendChild(m);
  
  // Close menu if user clicks anywhere else
  document.addEventListener('click', () => m.remove(), { once: true });
}

// Global Actions for Menu
window.editMsg = async (id) => {
  const t = prompt("Edit your message:");
  if (t && t.trim() !== "") {
    await updateDoc(doc(db, "chats", "user", "messages", id), { text: t });
    alert("Message updated! Refresh to see changes.");
  }
};

window.delMsg = async (id) => {
  if (confirm("Delete this message permanently?")) {
    await deleteDoc(doc(db, "chats", "user", "messages", id));
    alert("Message deleted.");
  }
};

// 6. ONLINE STATUS LOGIC
window.addEventListener("beforeunload", () => {
  status.innerText = "last seen just now";
});

// App Start Focus
window.onload = () => input.focus();
