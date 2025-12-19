import { db } from "./firebase.js";
import {
  collection, addDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

const messages = document.getElementById("messages");
const input = document.getElementById("input");
const typing = document.getElementById("typing");

function add(text, cls) {
  const div = document.createElement("div");
  div.className = `msg ${cls}`;
  div.innerText = text;
  messages.appendChild(div);
  messages.scrollTop = messages.scrollHeight;
}

function detectMood(t) {
  if (/sad|alone|cry|hurt/i.test(t)) return "sad";
  if (/bored|nothing/i.test(t)) return "bored";
  if (/love|miss|cute/i.test(t)) return "flirt";
  return "normal";
}

const followUps = {
  sad: ["I’m here 💙 want to talk?", "What made you feel this way?"],
  bored: ["Game or deep talk? 😏", "Truth or random question?"],
  flirt: ["You’re interesting 😌", "What kind of vibe do you like?"],
  normal: ["Tell me more 👀", "What’s on your mind?"]
};

function random(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function showTyping() {
  typing.classList.remove("hidden");
  await new Promise(r => setTimeout(r, 1200));
  typing.classList.add("hidden");
}

window.send = async () => {
  const text = input.value.trim();
  if (!text) return;
  input.value = "";
  add(text, "user");

  const mood = detectMood(text);

  await addDoc(collection(db, "learningQueue"), {
    question: text,
    mood,
    createdAt: serverTimestamp()
  });

  await showTyping();

  add(random(followUps[mood]), "bot");
};
