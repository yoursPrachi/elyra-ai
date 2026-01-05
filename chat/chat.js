import { getSmartReply } from "../smartReply.js";
import { addMsg } from "../utils/dom.js";
import { resetProactiveTimer } from "../utils/timers.js";
import { handleLearning } from "./learning.js";
import { saveToGlobalMemory } from "../utils/memory.js";

let conversationHistory = [];
let isLearning = localStorage.getItem("isLearning") === "true";
let pendingQuestion = localStorage.getItem("pendingQuestion") || "";

export function initChat() {
  const input = $("input");
  input.addEventListener("keypress", (e) => { if (e.key === "Enter") send(); });
  window.send = send;
}

async function send() {
  const input = $("input");
  const typing = $("typing");
  const text = input.value.trim();
  if (!text) return;

  input.value = "";
  addMsg(text, "user");
  conversationHistory.push({ role: "user", text });
  saveToGlobalMemory(text);

  if (isLearning) {
    handleLearning(text);
    return;
  }

  const thinkTime = Math.random() * (1200 - 600) + 600;
  setTimeout(async () => {
    typing.classList.remove("hidden");
    try {
      const botReply = await getSmartReply(text, conversationHistory);
      let replyText = (typeof botReply === "object") ? botReply.msg : botReply;
      let isNeedLearning = (typeof botReply === "object" && botReply.status === "NEED_LEARNING");

      const girlHabits = [" ✨", " 🙈", " na?", " 😊"];
      const finalReply = replyText + (Math.random() > 0.7 ? girlHabits[Math.floor(Math.random() * girlHabits.length)] : "");

      setTimeout(() => {
        typing.classList.add("hidden");
        if (isNeedLearning)
