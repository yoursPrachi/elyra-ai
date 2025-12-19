import { db } from "./firebase.js";
import {
  collection, getDocs, addDoc, deleteDoc
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

const list = document.getElementById("list");

const snap = await getDocs(collection(db, "learningQueue"));
snap.forEach(d => {
  list.innerHTML += `
    <p>${d.data().question}</p>
    <input id="${d.id}" placeholder="Answer">
    <button onclick="save('${d.id}')">Save</button>
    <hr>`;
});

window.save = async (id) => {
  const val = document.getElementById(id).value;
  await addDoc(collection(db, "learnedAnswers"), {
    q: id,
    text: val,
    weight: 10
  });
  await deleteDoc(collection(db, "learningQueue", id));
  location.reload();
};
