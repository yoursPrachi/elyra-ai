import { db } from "../firebase.js";
import { $ } from "./utils.js";
import {
  collection, query, orderBy, onSnapshot
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

export function initUsers() {
  const table = $("user-list-table");
  const q = query(collection(db, "users_list"), orderBy("lastSeen", "desc"));
  onSnapshot(q, snap => {
    if (!table) return;
    table.innerHTML = `<tr><th>Name</th><th>Email</th><th>Visits</th><th>Last Seen</th></tr>`;
    if (snap.empty) {
      table.innerHTML += `<tr><td colspan="4" style="color:#888;">No users yet.</td></tr>`;
      return;
    }
    snap.forEach(d => {
      const u = d.data();
      const last = u.lastSeen ? new Date(u.lastSeen).toLocaleString() : "N/A";
      table.innerHTML += `
        <tr>
          <td>${u.name || "User"}</td>
          <td>${u.email || "N/A"}</td>
          <td>${u.visitCount || 1}</td>
          <td>${last}</td>
        </tr>`;
    });
  });
}
