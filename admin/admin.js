import { db } from "../firebase.js";
import { collection, addDoc } from
"https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

window.train = async () => {
  await addDoc(collection(db, "learnedAnswers"), {
    question: q.value,
    answer: a.value,
    rating: 5,
    trusted: true
  });
  alert("Bot trained");
};
