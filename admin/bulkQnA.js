import { db } from "../firebase.js";
import { $, toast } from "./utils.js";
import {
  collection, addDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

export function initBulkQnA() {
  window.uploadBulkQnA = uploadBulkQnA;
}

async function uploadBulkQnA() {
  const input = $("bulk-qna-input");
  if (!input) return toast("Textarea not found!");
  const lines = input.value.trim().split("\n").filter(l => l.includes("|"));
  if (!lines.length) return toast("No valid QnA lines found!");

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
}
