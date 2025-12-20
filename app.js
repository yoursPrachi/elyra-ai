import { db } from "./firebase.js";
import { getSmartReply } from "./smartReply.js";
import {
  collection, addDoc, updateDoc, deleteDoc,
  doc, serverTimestamp, getDocs, query, where, limit
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

const chat = document.getElementById("chat");
const input = document.getElementById("input");
const typing = document.getElementById("typing");

/* ================= STATE ================= */
let lastUserMsg = "";
let repeatCount = 0;
let isLearning = false;
let pendingQuestion = "";
let dryCount = 0;

/* ================= UI ================= */
function scrollToBottom() {
  setTimeout(() => {
    chat.scrollTo({ top: chat.scrollHeight, behavior: "smooth" });
  }, 100);
}

function addMsg(text, cls) {
  const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const d = document.createElement("div");
  d.className = `msg ${cls}`;
  d.innerHTML = `
    <span>${text}</span>
    <span class="time">${time} ${cls === "user" ? "✓✓" : ""}</span>
  `;
  chat.appendChild(d);
  scrollToBottom();
}

/* ================= LEARNING ================= */
async function saveLearnedAnswer(question, answer) {
  const cleanAnswer = answer.toLowerCase().trim();
  const tempRef = collection(db, "temp_learning");

  const q1 = query(
    tempRef,
    where("question", "==", question),
    where("answer", "==", cleanAnswer),
    limit(1)
  );

  const snap = await getDocs(q1);

  if (!snap.empty) {
    const d = snap.docs[0];
    const count = (d.data().count || 1) + 1;

    if (count >= 3) {
      // avoid duplicate brain entry
      const brainQ = query(
        collection(db, "brain"),
        where("question", "==", question),
        where("answer", "==", answer),
        limit(1)
      );
      const brainSnap = await getDocs(brainQ);

      if (brainSnap.empty) {
        await addDoc(collection(db, "brain"), {
          question,
          answer,
          trainedBy: "community",
          weight: count,
          time: serverTimestamp()
        });
      }
      await deleteDoc(doc(db, "temp_learning", d.id));
    } else {
      await updateDoc(doc(db, "temp_learning", d.id), { count });
    }
  } else {
    await addDoc(tempRef, {
      question,
      answer: cleanAnswer,
      originalText: answer,
      count: 1,
      time: serverTimestamp()
    });
  }
}

/* ================= AUTO TOPIC SHIFT ================= */
function autoTopicShift() {
  const topics = [
    "Waise ek baat puchu? Tum chai wale ho ya coffee? ☕",
    "Aaj ka mood kya hai – calm ya thoda crazy? 😏",
    "Tumhe lagta hai silence powerful hota hai?",
    "Kabhi aisa laga ki koi bina bole sab samajh gaya?"
  ];
  return topics[Math.floor(Math.random() * topics.length)];
}

/* ================= MAIN SEND ================= */
window.send = async () => {
  const text = input.value.trim();
  if (!text) return;

  input.value = "";
  addMsg(text, "user");

  /* Exit learning if user avoids answering */
  if (isLearning && text.length < 3) {
    isLearning = false;
    pendingQuestion = "";
  }

  /* LEARNING MODE */
  if (isLearning) {
    await saveLearnedAnswer(pendingQuestion, text);

    typing.classList.remove("hidden");
    setTimeout(() => {
      typing.classList.add("hidden");
      addMsg("Perfect 😍 Maine yaad kar liya. Aur kya chal raha hai?", "bot");
      isLearning = false;
      pendingQuestion = "";
    }, 900);
    return;
  }

  /* SPAM CHECK */
  if (text.toLowerCase() === lastUserMsg.toLowerCase()) {
    repeatCount++;
  } else {
    repeatCount = 0;
    lastUserMsg = text;
  }

  if (repeatCount >= 3) {
    typing.classList.remove("hidden");
    setTimeout(() => {
      typing.classList.add("hidden");
      addMsg("Ek hi baat repeat mat karo 🙄 Kuch naya bolo.", "bot");
    }, 800);
    return;
  }

  /* DRY CHAT DETECTION */
  if (text.length <= 2) dryCount++;
  else dryCount = 0;

  typing.classList.remove("hidden");
  const reply = await getSmartReply(text);

  setTimeout(() => {
    typing.classList.add("hidden");

    if (typeof reply === "object") {
      isLearning = true;
      pendingQuestion = reply.question;
      addMsg(reply.msg, "bot");
    } else {
      addMsg(reply, "bot");

      if (dryCount >= 3) {
        dryCount = 0;
        setTimeout(() => addMsg(autoTopicShift(), "bot"), 800);
      }
    }
  }, 1100);
};

input.addEventListener("keydown", e => {
  if (e.key === "Enter") send();
});
