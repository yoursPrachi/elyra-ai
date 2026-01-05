import { getSmartReply } from "../smartReply.js";
import { addMsg } from "../utils/dom.js";
import { resetProactiveTimer } from "../utils/timers.js";
import { handleLearning } from "./learning.js";
import { saveToGlobalMemory } from "../utils/memory.js";

let conversationHistory = [];
let isLearning = localStorage.getItem("isLearning") === "true";
let pendingQuestion = localStorage.getItem("pendingQuestion") || "";

export function initChat() {
  const input = document.getElementById("input");
  const sendBtn = document.getElementById("send-btn");

  input.addEventListener("keypress", (e) => {
    if (e.key === "Enter") send();
  });

  sendBtn.addEventListener("click", send);

  window.send = send; // optional if using inline onclick
}

async function send() {
  const input = document.getElementById("input");
  const typing = document.getElementById("typing");
  const text = input.value.trim();
  if (!text) return;

  console.log("Send triggered:", text);

  input.value = "";
  addMsg(text, "user");
  conversationHistory.push({ role: "user", text });
  saveToGlobalMemory(text);

  if (isLearning) {
    handleLearning(text);
    return;
  }

  typing.classList.remove("hidden");

  try {
    const botReply = await getSmartReply(text, conversationHistory);
    let replyText = (typeof botReply === "object") ? botReply.msg : botReply;
    let isNeedLearning = (typeof botReply === "object" && botReply.status === "NEED_LEARNING");

    const girlHabits = [" ✨", " 🙈", " na?", " 😊"];
    const finalReply = replyText + (Math.random() > 0.7 ? girlHabits[Math.floor(Math.random() * girlHabits.length)] : "");

    setTimeout(() => {
      typing.classList.add("hidden");

      if (isNeedLearning) {
        pendingQuestion = text;
        localStorage.setItem("pendingQuestion", text);
        addMsg("Mujhe ye seekhna hai... Aap mujhe sikhayenge? 🤔", "bot");
      } else {
        addMsg(finalReply, "bot");
        conversationHistory.push({ role: "bot", text: finalReply });
        resetProactiveTimer();
      }
    }, 800);
  } catch (err) {
    typing.classList.add("hidden");
    addMsg("Oops! Kuch gadbad ho gayi 😅", "bot");
    console.error(err);
  }
}
