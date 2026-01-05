import { db } from "../firebase.js";
import {
  collection, addDoc, getDoc, deleteDoc, doc, updateDoc,
  serverTimestamp, query, orderBy, limit, where, onSnapshot
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

const $ = (id) => document.getElementById(id);
const toast = (msg) => {
  const t = document.createElement("div");
  t.textContent = msg;
  t.style = "position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:#333;color:#fff;padding:10px;border-radius:6px;z-index:9999";
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 1600);
};

window.addEventListener("DOMContentLoaded", () => {
  trackLiveStats();
  loadBrainData();
  loadPending();
  loadUsers();
});

function trackLiveStats() {
  const today = new Date(); today.setHours(0,0,0,0);
  const active = new Date(Date.now() - 5 * 60000);

  onSnapshot(collection(db, "analytics"), snap => $("total-visits").innerText = snap.size);
  onSnapshot(query(collection(db, "analytics"), where("timestamp", ">=", today)), snap => $("today-visits").innerText = snap.size);
  onSnapshot(query(collection(db, "analytics"), where("timestamp", ">=", active)), snap => $("active-users").innerText = snap.size);
}

function loadBrainData() {
  const table = $("trending-table");
  const q = query(collection(db, "brain"), orderBy("hitCount", "desc"), limit(15));
  onSnapshot(q, snap => {
    table.innerHTML = `<tr><th>Q</th><th>A</th><th>Hits</th><th>Actions</th></tr>`;
    snap.forEach(d => {
      const data = d.data();
      table.innerHTML += `
        <tr id="row-${d.id}">
          <td>${data.question}</td>
          <td><input id="ans-${d.id}" value="${data.answers?.[0] || ""}" /></td>
          <td>${data.hitCount || 0}</td>
          <td>
            <button onclick="window.updateBotAnswer('${d.id}')">Update</button>
            <button onclick="window.deleteFromBrain('${d.id}')">Delete</button>
          </td>
        </tr>`;
    });
  });
}

window.updateBotAnswer = async (id) => {
  const input = document.getElementById(`ans-${id}`);
  const newAns = input?.value?.trim();
  if (!newAns) return toast("Empty answer!");
  await updateDoc(doc(db, "brain", id), { answers: [newAns], timestamp: serverTimestamp() });
  toast("Updated ✅");
};

window.deleteFromBrain = async (id) => {
  if (!confirm("Delete this QnA?")) return;
  await deleteDoc(doc(db, "brain", id));
  toast("Deleted 🗑️");
};

function loadPending() {
  const container = $("review-container");
  onSnapshot(collection(db, "temp_learning"), snap => {
    container.innerHTML = "";
    snap.forEach(docSnap => {
      const d = docSnap.data();
      container.innerHTML += `
        <div style="margin-bottom:10px;padding:10px;border-left:4px solid orange;background:#fffbe6">
          <p><b>Q:</b> ${d.question}</p>
          <p><b>A:</b> ${d.answer}</p>
          <button onclick="window.approveLearning('${docSnap.id}')">Approve ✅</button>
          <button onclick="window.rejectLearning('${docSnap.id}')">Reject ❌</button>
        </div>`;
    });
  });
}

window.approveLearning = async (id) => {
  const ref = doc(db, "temp_learning", id);
  const snap = await getDoc(ref);
  if (!snap.exists()) return toast("Not found");
  const d = snap.data();
  await addDoc(collection(db, "brain"), {
    question: d.question.toLowerCase(),
    answers: [d.answer],
    hitCount: 1,
    timestamp: serverTimestamp(),
  });
  await deleteDoc(ref);
  toast("Approved ✨");
};

window.rejectLearning = async (id) => {
  if (!confirm("Reject this suggestion?")) return;
  await deleteDoc(doc(db, "temp_learning", id));
  toast("Rejected ❌");
};

function loadUsers() {
  const table = $("user-list-table");
  const q = query(collection(db, "users_list"), orderBy("lastSeen", "desc"));
  onSnapshot(q, snap => {
    table.innerHTML = `<tr><th>Name</th><th>Email</th><th>Visits</th><th>Last Seen</th></tr>`;
    snap.forEach(d => {
      const u = d.data();
      table.innerHTML += `
        <tr>
          <td>${u.name || "User"}</td>
          <td>${u.email || "N/A"}</td>
          <td>${u.visitCount || 1}</td>
          <td>${u.lastSeen ? new Date(u.lastSeen).toLocaleString() : "N/A"}</td>
        </tr>`;
    });
  });
}

window.uploadBulkQnA = async () => {
  const input = document.getElementById("bulk-qna-input");
  const lines = input.value.trim().split("\n").filter(l => l.includes("|"));
  let success = 0, fail = 0;
  for (const line of lines) {
    const [q, a] = line.split("|").map(s => s.trim());
    if (!q || !a) { fail++; continue; }
    try {
      await addDoc(collection(db, "brain"), {
        question: q.toLowerCase(),
        answers: [a],
        hitCount: 1,
        timestamp: serverTimestamp(),
      });
      success++;
    } catch (e) { console.error(e); fail++; }
  }
  toast(`Bulk QnA ✅ Added: ${success}, Failed: ${fail}`);
  input.value = "";
};
