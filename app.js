import { db } from "./firebase.js";
import { getSmartReply } from "./smartReply.js";
import { collection, addDoc, serverTimestamp, query, where, getDocs, updateDoc, deleteDoc, doc } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

const chat = document.getElementById("chat");
const input = document.getElementById("input");
const typing = document.getElementById("typing");

let isLearning = false;
let pendingQuestion = "";

// --- Auto Scroll Logic ---
function scrollToBottom() {
  chat.scrollTop = chat.scrollHeight;
}

// --- WhatsApp Style Message ---
function addMsg(text, cls) {
  const d = document.createElement("div");
  d.className = `msg ${cls}`;
  d.innerHTML = `<span>${text}</span><div class="time">${new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} ${cls === 'user' ? '✓✓' : ''}</div>`;
  chat.appendChild(d);
  scrollToBottom();
}

// --- Smart Follow-up Questions ---
function getFollowUp() {
  const questions = [
    "Wese, aaj kal tumhara mood kaisa hai? 😊",
    "Aur batao, aaj kuch khaas kiya kya?",
    "Chalo ye toh theek hai, par tumhara fav hobby kya hai? ✨",
    "Mujhe lagta hai tum kaafi interesting ho. Kuch aur baatein karein?",
    "Wese tum kahan se ho? Main toh internet pe rehti hoon! 😂"
  ];
  return questions[Math.floor(Math.random() * questions.length)];
}

window.send = async () => {
  const text = input.value.trim();
  if (!text) return;

  input.value = "";
  addMsg(text, "user");

  // --- Handling Learning Mode Answer ---
  if (isLearning) {
    // Save to temp_learning in background
    saveLearnedAnswer(pendingQuestion, text); 
    
    typing.classList.remove("hidden");
    setTimeout(() => {
      typing.classList.add("hidden");
      // Flow maintain karne ke liye reply + follow up
      const reply = `Wah! Maine yaad kar liya. 😍 ${getFollowUp()}`;
      addMsg(reply, "bot");
      isLearning = false;
      pendingQuestion = "";
    }, 1000);
    return;
  }

  // --- Normal Chat Mode ---
  typing.classList.remove("hidden");
  const botReply = await getSmartReply(text);

  setTimeout(() => {
    typing.classList.add("hidden");
    
    if (typeof botReply === "object" && botReply !== null) {
      isLearning = true;
      pendingQuestion = botReply.question;
      addMsg(botReply.msg, "bot");
    } else {
      // 20% chances ki bot normal reply ke baad bhi follow-up pooche
      let finalMsg = botReply;
      if (Math.random() > 0.8) finalMsg += ` ${getFollowUp()}`;
      addMsg(finalMsg, "bot");
    }
  }, 1200);
};

// --- Keyboard & Viewport Fix ---
if (window.visualViewport) {
  window.visualViewport.addEventListener("resize", () => {
    document.getElementById("app-container").style.height = `${window.visualViewport.height}px`;
    scrollToBottom();
  });
}

input.addEventListener("keypress", (e) => { if (e.key === "Enter") window.send(); });
