import { db } from "./firebase.js";
import {
  collection, addDoc, getDoc, getDocs, deleteDoc, doc, updateDoc,
  serverTimestamp, query, orderBy, limit, where, onSnapshot
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

// --- Utilities ---
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

// --- Dashboard initialization ---
window.addEventListener("DOMContentLoaded", () => {
  console.log("Admin Dashboard Connecting... 🚀");
  initDashboard();
});

function initDashboard() {
  trackLiveStats();   // Analytics (read-only)
  loadUsers();        // User Activity Log (read-only)
  loadBrainData();    // Bot Intelligence (admin only)
  loadPending();      // Approvals (admin only)
}

// --- 1. Live analytics (read-only) ---
function trackLiveStats() {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const activeTime = new Date(Date.now() - 5 * 60000);

  const totalVisitsEl = $("total-visits");
  const todayVisitsEl = $("today-visits");
  const activeUsersEl = $("active-users");

  if (!totalVisitsEl || !todayVisitsEl || !activeUsersEl) return;

  // Read-only snapshots
  onSnapshot(collection(db, "analytics"), (snap) => {
    totalVisitsEl.innerText = snap.size;
  }, console.error);

  const todayQ = query(collection(db, "analytics"), where("timestamp", ">=", startOfToday));
  onSnapshot(todayQ, (snap) => {
    todayVisitsEl.innerText = snap.size;
  }, console.error);

  const activeQ = query(collection(db, "analytics"), where("timestamp", ">=", activeTime));
  onSnapshot(activeQ, (snap) => {
    activeUsersEl.innerText = snap.size;
  }, console.error);
}

// --- 2. Bot brain management (admin only) ---
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
  }, console.error);
}

// Admin-only actions
window.updateBotAnswer = async (id) => {
  try {
    const input = document.getElementById(`ans-${id}`);
    if (!input) return;
    const newAns = input.value?.trim();
    if (!newAns) return toast("Answer cannot be empty!");

    await updateDoc(doc(db, "brain", id), {
      answers: [newAns],
      timestamp: serverTimestamp(),
    });
    toast("Bot intelligence updated 🧠");
  } catch (e) {
    console.error(e);
    toast("Update failed (check rules)");
  }
};

window.deleteFromBrain = async (id) => {
  if (!confirm("Permanently delete from brain?")) return;
  try {
    await deleteDoc(doc(db, "brain", id));
    toast("Deleted from brain");
  } catch (e) {
    console.error(e);
    toast("Delete failed (check rules)");
  }
};

// --- 3. Approval system (admin only) ---
function loadPending() {
  const container = $("review-container");
  if (!container) return;

  onSnapshot(collection(db, "temp_learning"), (snap) => {
    container.innerHTML = "";
    if (snap.empty) {
      container.innerHTML = "<p style='padding:20px;color:#888;'>No pending reviews. 🕊️</p>";
      return;
    }
    snap.forEach((docSnap) => {
      const data = docSnap.data();
      const id = docSnap.id;
      const card = document.createElement("div");
      card.style =
        "background:#fffbe6;padding:15px;border-radius:8px;border-left:5px solid #f1c40f;margin-bottom:15px;";
      const q = escapeHTML(data.question || "");
      const a = escapeHTML(data.answer || "");
      card.innerHTML = `
        <p style="font-size:11px;color:#999;">USER SUGGESTION</p>
        <p><b>Q:</b> ${q}</p>
        <p><b>A:</b> <span style="color:#075e54">${a}</span></p>
        <div style="display:flex;gap:10px;margin-top:10px;">
          <button onclick="window.approveLearning('${id}')" class="btn-save">Approve ✅</button>
          <button onclick="window.rejectLearning('${id}')" class="btn-del">Reject ❌</button>
        </div>`;
      container.appendChild(card);
    });
  }, console.error);
}

window.approveLearning = async (id) => {
  try {
    const ref = doc(db, "temp_learning", id);
    const snap = await getDoc(ref);
    if (!snap.exists()) return toast("Suggestion not found");

    const d = snap.data();
    const question = (d.question || "").toLowerCase().trim();
    const answer = (d.answer || "").trim();
    if (!question || !answer) return toast("Invalid suggestion data");

    await addDoc(collection(db, "brain"), {
      question,
      answers: [answer],
      hitCount: 1,
      timestamp: serverTimestamp(),
    });
    await deleteDoc(ref);
    toast("Approved and added to Brain ✨");
  } catch (e) {
    console.error(e);
    toast("Approval failed (check rules)");
  }
};

window.rejectLearning = async (id) => {
  if (!confirm("Delete this suggestion?")) return;
  try {
    await deleteDoc(doc(db, "temp_learning", id));
    toast("Suggestion rejected");
  } catch (e) {
    console.error(e);
    toast("Reject failed (check rules)");
  }
};

// --- 4. User activity log (read-only) ---
function loadUsers() {
  const table = $("user-list-table");
  if (!table) return;

  const q = query(collection(db, "users_list"), orderBy("lastSeen", "desc"));
  onSnapshot(q, (snap) => {
    table.innerHTML = `<tr><th>Name</th><th>Email</th><th>Visits</th><th>Last Seen</th></tr>`;
    if (snap.empty) {
      table.innerHTML += `<tr><td colspan="4" style="color:#888;padding:12px;">No users yet.</td></tr>`;
      return;
    }
    snap.forEach((d) => {
      const u = d.data();
      const name = escapeHTML(u.name || "User");
      const email = escapeHTML(u.email || "N
