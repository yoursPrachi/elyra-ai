import { db } from "../firebase.js";
import { $, toast } from "./utils.js";
import {
  collection, query, orderBy, limit, onSnapshot,
  updateDoc, deleteDoc, doc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

export function initBrain() {
  const table = $("trending-table");
  const q = query(collection(db, "brain"), orderBy("hitCount", "desc"), limit(15));

  onSnapshot(q, snap => {
    if (!table) return;
    table.innerHTML = `<tr><th>Q</th><th>A</th><th>Hits</th><th>Actions</th></tr>`;
    if (snap.empty) {
      table.innerHTML += `<tr><td colspan="4" style="color:#888;">No trending entries yet.</td></tr>`;
      return;
    }
    snap.forEach(d => {
      const data = d.data();
      table.innerHTML += `
        <tr id="row-${d.id}">
          <td>${data.question}</td>
          <td><input id="ans-${d.id}" value="${data.answers?.[0] || ""}" /></td>
          <td>${data.hitCount || 0}</td>
          <td>
            <button class="btn btn-primary" onclick="window.updateBotAnswer('${d.id}')">Update</button>
            <button class="btn btn-danger" onclick="window.deleteFromBrain('${d.id}')">Delete</button>
          </td>
        </tr>`;
    });
  });

  // Expose handlers globally for inline buttons
  window.updateBotAnswer = updateBotAnswer;
  window.deleteFromBrain = deleteFromBrain;
}

async function updateBotAnswer(id) {
  const input = document.getElementById(`ans-${id}`);
  const newAns = input?.value?.trim();
  if (!newAns) return toast("Empty answer!");
  await updateDoc(doc(db, "brain", id), { answers: [newAns], timestamp: serverTimestamp() });
  toast("Updated ✅");
}

async function deleteFromBrain(id) {
  if (!confirm("Delete this QnA?")) return;
  await deleteDoc(doc(db, "brain", id));
  toast("Deleted 🗑️");
}
