import { db } from "./firebase.js";
import {
  collection, addDoc, updateDoc, deleteDoc,
  doc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

const chat = document.getElementById("chat");
const input = document.getElementById("input");
const typing = document.getElementById("typing");
const status = document.getElementById("status");

function addMsg(text, cls, docId=null) {
  const d = document.createElement("div");
  d.className = `msg ${cls}`;
  d.innerText = text;

  if (cls === "user" && docId) {
    d.onclick = () => showMenu(d, docId);
  }

  chat.appendChild(d);
  chat.scrollTop = chat.scrollHeight;
}

function showMenu(el, id) {
  if (el.querySelector(".menu")) return;
  const m = document.createElement("div");
  m.className = "menu";
  m.innerHTML = `
    <div onclick="editMsg('${id}')">Edit</div>
    <div onclick="delMsg('${id}')">Delete</div>`;
  el.appendChild(m);
}

window.editMsg = async (id) => {
  const t = prompt("Edit message");
  if (!t) return;
  await updateDoc(doc(db,"chats","user","messages",id), { text: t });
};

window.delMsg = async (id) => {
  await deleteDoc(doc(db,"chats","user","messages",id));
};

async function showTyping() {
  typing.classList.remove("hidden");
  await new Promise(r=>setTimeout(r,1000));
  typing.classList.add("hidden");
}

window.send = async () => {
  const text = input.value.trim();
  if (!text) return;
  input.value = "";

  const ref = await addDoc(
    collection(db,"chats","user","messages"),
    { text, createdAt: serverTimestamp() }
  );

  addMsg(text,"user",ref.id);

  await showTyping();
  addMsg("I’m here 🙂 tell me more.","bot");

  window.addEventListener("beforeunload", async ()=>{
  status.innerText = "last seen just now";
});
};
