export const $ = (id) => document.getElementById(id);

export const toast = (msg) => {
  const t = document.createElement("div");
  t.textContent = msg;
  t.style = "position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:#333;color:#fff;padding:10px 14px;border-radius:6px;z-index:9999;box-shadow:0 8px 24px rgba(0,0,0,.2);";
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 1600);
};

// Make available globally for inline handlers if needed
window.$ = $;
window.toast = toast;
