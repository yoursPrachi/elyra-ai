import { initLogin } from "./user/login.js";
import { initChat } from "./chat/chat.js";
import { initGreeting } from "./chat/greeting.js";
import { initMemory } from "./utils/memory.js";
import { resetProactiveTimer } from "./utils/timers.js";

window.addEventListener("DOMContentLoaded", () => {
  initLogin();
  initChat();
  initGreeting();
  initMemory();
  resetProactiveTimer();
});
