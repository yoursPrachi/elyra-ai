import { db } from "../firebase.js";
import { $, toast } from "./utils.js";
import {
  collection, onSnapshot, doc, getDoc, addDoc, deleteDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

export function initApprovals() {
  const container = $("review-container");
  onSnapshot(collection(db, "temp_learning"), snap => {
    if (!container) return;
    container.innerHTML = "";
    if (snap.empty) {
      container.innerHTML = "<p style='color:#aaa;'>No pending reviews. 🕊️</p>";
      return;
    }
    snap.forEach(docSnap => {
      const d = docSnap.data();
      container.innerHTML += `
        <div class="pending-card">
          <p><b>Q:</b> ${d.question}</p>
          <p><b>A:</b> ${d.answer}</p>
          <button class="btn btn-primary" onclick="window.approveLearning('${docSnap.id}')">Approve ✅</button>
          <button class="btn btn-danger" onclick="window.rejectLearning('${docSnap.id}')">Reject ❌</button>
        </div>`;
    });
  });

  window.approveLearning = approveLearning;
  window.rejectLearning = rejectLearning;
}

async function approveLearning(id) {
  const ref = doc(db, "temp_learning", id);
  const snap = await getDoc(ref);
  if (!snap.exists()) return toast("Not found");
  const d = snap.data();
  await addDoc(collection(db, "brain"), {
    question: (d.question || "").toLowerCase().trim(),
    answers: [d.answer || ""],
    hitCount: 1,
    timestamp: serverTimestamp(),
  });
  await deleteDoc(ref);
  toast("Approved ✨");
}

async function rejectLearning(id) {
  if (!confirm("Reject this suggestion?")) return;
  await deleteDoc(doc(db, "temp_learning", id));
  toast("Rejected ❌");
}
