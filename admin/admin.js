import { db } from "../firebase.js";
import { 
  collection, getDocs, deleteDoc, doc, addDoc 
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

const queueList = document.getElementById("queue-list");

// 1. Learning Queue se sawal fetch karein
async function loadLearningQueue() {
  const querySnapshot = await getDocs(collection(db, "learningQueue"));
  queueList.innerHTML = "";
  
  querySnapshot.forEach((document) => {
    const data = document.data();
    const item = document.createElement("div");
    item.className = "queue-item";
    item.innerHTML = `
      <p><strong>Question:</strong> ${data.question}</p>
      <button onclick="trainBot('${document.id}', '${data.question}')">✅ Answer & Train</button>
      <button onclick="ignoreQuestion('${document.id}')">❌ Ignore</button>
    `;
    queueList.appendChild(item);
  });
}

// 2. Bot ko naya sawal sikhane ka function
window.trainBot = async (id, question) => {
  const answer = prompt(`Enter answer for: "${question}"`);
  if (answer) {
    // Answer ko 'preReplies' ya naye Firebase 'brain' collection mein save karein
    console.log(`Bot trained: ${question} -> ${answer}`);
    
    // Queue se delete karein training ke baad
    await deleteDoc(doc(db, "learningQueue", id));
    alert("Bot has learned a new thing! 🧠");
    loadLearningQueue();
  }
};

loadLearningQueue();
