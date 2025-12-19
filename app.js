import { getSmartReply } from "./smartReply.js";

const chat = document.getElementById("chat");
const input = document.getElementById("input");

function add(text, type) {
  const div = document.createElement("div");
  div.className = `msg ${type}`;
  div.innerText = text;
  chat.appendChild(div);
  chat.scrollTop = chat.scrollHeight;
}

window.sendMessage = async () => {
  if (!input.value.trim()) return;
  const txt = input.value;
  input.value = "";

  add(txt, "user");

  setTimeout(async () => {
    const reply = await getSmartReply(txt);
    add(reply, "bot");
  }, 700);
};
