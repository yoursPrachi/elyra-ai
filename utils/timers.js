let proactiveTimer;

export function resetProactiveTimer() {
  clearTimeout(proactiveTimer);
  proactiveTimer = setTimeout(() => {
    if (!document.hidden && !localStorage.getItem("isLearning")) {
      const name = localStorage.getItem("userName") || "Dost";
      const msg = `Sunno **${name}**, kahan chale gaye? 🥺`;
      import("./dom.js").then(({ addMsg }) => addMsg(msg, "bot"));
    }
  }, 90000);
}
