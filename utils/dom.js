export const $ = (id) => document.getElementById(id);

export function addMsg(text, cls) {
  const chat = $("chat");
  const d = document.createElement("div");
  d.className = `msg ${cls}`;
  const timeStr = new Intl.DateTimeFormat(navigator.language || "en", {
    hour: '2-digit', minute: '2-digit'
  }).format(new Date());
  d.innerHTML = `<div class="msg-content">${text}</div><div class="time">${timeStr}</div>`;
  chat.appendChild(d);
  chat.scrollTop = chat.scrollHeight;
}
