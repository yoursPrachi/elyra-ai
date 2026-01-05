import { db } from "../firebase.js";
import { $ } from "./utils.js";
import {
  collection, query, where, onSnapshot
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

export function initAnalytics() {
  const today = new Date(); today.setHours(0,0,0,0);
  const active = new Date(Date.now() - 5 * 60000);

  onSnapshot(collection(db, "analytics"), snap => {
    const el = $("total-visits"); if (el) el.innerText = snap.size;
  });

  onSnapshot(query(collection(db, "analytics"), where("timestamp", ">=", today)), snap => {
    const el = $("today-visits"); if (el) el.innerText = snap.size;
  });

  onSnapshot(query(collection(db, "analytics"), where("timestamp", ">=", active)), snap => {
    const el = $("active-users"); if (el) el.innerText = snap.size;
  });
}
