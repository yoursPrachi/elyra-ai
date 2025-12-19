import { db } from "./firebase.js";
import {
  collection, addDoc, updateDoc, deleteDoc,
  doc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

const chat = document.getElementById("chat");
const input = document.getElementById("input");
const typing = document.getElementById("typing");
const status = document.getElementById("status");

// 1. Scroll Logic
function scrollToBottom() {
  chat.scrollTop = chat.scrollHeight;
}

// 2. Add Message to UI
function addMsg(text, cls, docId=null) {
  const d = document.createElement("div");
  d.className = `msg ${cls}`;
  d.innerText = text;

  if (cls === "user" && docId) {
    d.onclick = (e) => {
      e.stopPropagation();
      showMenu(d, docId);
    };
  }

  chat.appendChild(d);
  scrollToBottom();
}

// 3. ENTER KEY SUPPORT 💎
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
  input.focus(); // Keyboard ko open rakhta hai

  const ref = await addDoc(
    collection(db,"chats","user","messages"),
    { text, createdAt: serverTimestamp() }
  );

  addMsg(text,"user",ref.id);

  // Bot Typing Simulation
  typing.classList.remove("hidden");
  scrollToBottom();
  
  setTimeout(() => {
    typing.classList.add("hidden");
    addMsg("I’m here 🙂 tell me more.","bot");
  }, 1000);
};

// 5. EDIT/DELETE MENU
function showMenu(el, id) {
  const old = document.querySelector(".menu");
  if (old) old.remove();
  
  const m = document.createElement("div");
  m.className = "menu";
  m.innerHTML = `
    <div onclick="editMsg('${id}')">Edit</div>
    <div onclick="delMsg('${id}')">Delete</div>`;
  el.appendChild(m);
  document.addEventListener('click', () => m.remove(), {once:true});
}

// Menu Global Functions
window.editMsg = async (id) => {
  const t = prompt("Edit message");
  if (t) await updateDoc(doc(db,"chats","user","messages",id), { text: t });
};

window.delMsg = async (id) => {
  if(confirm("Delete?")) await deleteDoc(doc(db,"chats","user","messages",id));
};

// Status handling
window.addEventListener("beforeunload", () => {
  status.innerText = "last seen just now";
});
