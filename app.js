function sendMessage() {
  const input = document.getElementById("userInput");
  const text = input.value.trim();
  if (!text) return;

  addMessage(text, "user");
  input.value = "";

  setTimeout(() => {
    addMessage("I'm learning… tell me more 😊", "bot");
  }, 600);
}

function addMessage(text, type) {
  const msgDiv = document.createElement("div");
  msgDiv.className = `msg ${type}`;
  msgDiv.innerText = text;
  document.getElementById("messages").appendChild(msgDiv);
}
