import { getAndSaveUser } from "./geo.js";
import { initiateInternationalGreeting } from "../chat/greeting.js";

export function initLogin() {
  window.showNameForm = () => {
    $("initial-options").style.display = "none";
    $("name-form").style.display = "block";
  };

  window.startNamedChat = async () => {
    const name = $("u-name").value.trim();
    const email = $("u-email").value.trim();
    if (name && email) {
      const city = await getAndSaveUser(name, email);
      $("welcome-popup").style.display = "none";
      initiateInternationalGreeting(name, "named", city);
    } else { alert("Suno! Details toh bharo pehle.. ✨"); }
  };

  window.startGuestChat = async () => {
    const city = await getAndSaveUser("Dost", `guest_${Date.now()}@elyra.ai`);
    $("welcome-popup").style.display = "none";
    initiateInternationalGreeting("Dost", "guest", city);
  };
}
