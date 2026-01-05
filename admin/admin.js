import { db } from "../firebase.js";
import {
  collection, addDoc, getDoc, deleteDoc, doc, updateDoc,
  serverTimestamp, query, orderBy, limit, where, onSnapshot
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

const $ = (id) => document.getElementById(id);
const escapeHTML = (s = "") =>
  s.replace(/[&<>"']/g, (c) => ({ "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;" }[c]));
const toast = (msg) => {
  const t = document.createElement("div");
  t.style = "position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:#333;color:#fff;padding:10px 14px;border-radius:6px;box-shadow:0 6px 20px rgba(0,0,0,.2);z-index:9999;font-size:14px";
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 1600);
};

window.addEventListener("DOMContentLoaded", () => {
  console.log("Admin Dashboard Loaded ✅");
  initDashboard();
});

function initDashboard() {
  trackLiveStats();
  loadUsers();
  loadBrainData();
  loadPending();
}

// --- Analytics ---
function trackLiveStats() {
  const startOfToday = new Date(); startOfToday.setHours(0, 0, 0, 0);
  const activeTime = new Date(Date.now() - 5 * 60000);

  onSnapshot(collection(db, "analytics"), (snap) => {
    $("total-visits").innerText = snap.size;
  });

  const todayQ = query(collection(db, "analytics"), where("timestamp", ">=", startOfToday));
  onSnapshot(todayQ, (snap) => {
    $("today-visits").innerText = snap.size;
  });

  const activeQ = query(collection(db, "analytics"), where("timestamp", ">=", activeTime));
  onSnapshot(activeQ, (snap) => {
    $("active-users").innerText = snap.size;
  });
}

// --- Brain ---
function renderBrainHeader() {
  return `<tr><th>Question</th><th>Answer</th><th>Hits</th><th>Actions</th></tr>`;
}
function renderBrainRow(id, data) {
  const question = escapeHTML(data.question || "");
  const currentAns = escapeHTML(data.answers?.[0] || "");
  const hits = Number(data.hitCount || 0);
  return `
    <tr id="row-${id}">
      <td><b>${question}</b></td>
      <td><input type="text" value="${currentAns}" id="ans-${id}" class="edit-input" /></td>
      <td style="text-align:center;">${hits}</td>
      <td>
        <button onclick="window.updateBotAnswer('${id}')" class="btn-save">Update ✅</button>
        <button onclick="window.deleteFromBrain('${id}')" class="btn-del">🗑️</button>
      </td>
    </tr>`;
}

function loadBrainData() {
  const table = $("trending-table");
  if (!table) return;

  const q = query(collection(db, "brain"), orderBy("hitCount", "desc"), limit(15));
  onSnapshot(q, (snap) => {
    table.innerHTML = renderBrainHeader();
    if (snap.empty) {
      table.innerHTML += `<tr><td colspan="4" style="color:#888;padding:12px;">No trending entries yet.</td></tr>`;
      return;
    }
    snap.forEach((d) => {
      table.innerHTML += renderBrainRow(d.id, d.data());
    });
  });
}

window.updateBotAnswer = async (id) => {
  const input = document.getElementById(`ans-${id}`);
  if (!input) return;
  const newAns = input.value?.trim();
  if (!newAns) return toast("Answer cannot be empty!");

  try {
    await updateDoc(doc(db, "brain", id), {
      answers: [newAns],
      timestamp: serverTimestamp(),
    });
    toast("Bot intelligence updated 🧠");
  } catch (e) {
    console.error(e);
    toast("Update failed");
  }
};

window.deleteFromBrain = async (id) => {
  if (!confirm("Permanently delete from brain?")) return;
  try {
    await deleteDoc(doc(db, "brain", id));
    toast("Deleted from brain");
  } catch (e) {
    console.error(e);
    toast("Delete failed");
  }
};

// --- Approvals ---
function loadPending() {
  const container = $("review-container");
