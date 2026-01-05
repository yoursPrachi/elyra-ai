import { db } from "../firebase.js";
import { $, toast } from "./utils.js";
import {
  collection, getDocs, deleteDoc, updateDoc, doc
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

export function initScan() {
  window.scanBrain = scanBrain;
}

async function scanBrain() {
  const snap = await getDocs(collection(db, "brain"));
  let duplicates = 0, cleaned = 0;
  const seenQuestions = new Map();

  for (const docSnap of snap.docs) {
    const data = docSnap.data();
    const q = (data.question || "").toLowerCase().trim();
    const ansArr = Array.isArray(data.answers) ? data.answers : [];

    // Duplicate question doc
    if (seenQuestions.has(q)) {
      await deleteDoc(doc(db, "brain", docSnap.id));
      duplicates++;
      continue;
    }
    seenQuestions.set(q, true);

    // Clean duplicate answers within the same doc
    const uniqueAnswers = [...new Set(ansArr.map(a => (a || "").trim()))].filter(a => a);
    if (uniqueAnswers.length !== ansArr.length) {
      await updateDoc(doc(db, "brain", docSnap.id), { answers: uniqueAnswers });
      cleaned++;
    }

    // Remove invalid entries
    if (!q || uniqueAnswers.length === 0) {
      await deleteDoc(doc(db, "brain", docSnap.id));
      cleaned++;
    }
  }

  const resultEl = $("scan-result");
  if (resultEl) resultEl.innerText = `Brain Scan Done ✅ Removed Duplicates: ${duplicates}, Cleaned: ${cleaned}`;
  toast("Brain Scan Completed 🧹");
}
