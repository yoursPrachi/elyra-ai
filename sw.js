self.addEventListener("push", e => {
  const data = e.data.json();
  self.registration.showNotification("Elyra AI", {
    body: data.text,
    icon: "/icon.png"
  });
});
