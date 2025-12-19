import { db } from "../firebase.js";
import { 
  collection, getDocs, deleteDoc, doc, addDoc, serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

const queueList = document.getElementById("queue-list");
const countLabel = document.getElementById("count-label");

async function loadQueue() {
  try {
    const querySnapshot = await getDocs(collection(db, "learningQueue"));
    queueList.innerHTML = "";
    let count = 0;

    querySnapshot.forEach((document) => {
      count++;
      const data = document.data();
      const card = document.createElement("div");
      card.className = "card";
      card.innerHTML = `
        <div class="q-text">"${data.question}"</div>
        <div class="actions">
          <button class="btn-train" onclick="trainBot('${document.id}', '${data.question}')">✅ Train</button>
          <button class="btn-ignore" onclick="ignoreQuestion('${document.id}')">❌ Ignore</button>
        </div>
      `;
      queueList.appendChild(card);
    });

    countLabel.innerText = `${count} questions waiting to be learned.`;
    if(count === 0) queueList.innerHTML = "<p>All caught up! No new questions. 🎉</p>";
    
  } catch (error) {
    console.error("Error loading queue:", error);
  }
}

// Global functions for buttons
window.trainBot = async (id, question) => {
  const answer = prompt(`What should Elyra say for: "${question}"?`);
  
  if (answer && answer.trim() !== "") {
    // 1. Save to Brain (Learning)
    await addDoc(collection(db, "brain"), {
      question: question.toLowerCase().trim(),
      answer: answer,
      trainedAt: serverTimestamp()
    });

    // 2. Remove from Queue
    await deleteDoc(doc(db, "learningQueue", id));
    
    alert("Bot learned successfully!");
    loadQueue();
  }
};

window.ignoreQuestion = async (id) => {
  if(confirm("Delete this question from queue?")) {
    await deleteDoc(doc(db, "learningQueue", id));
    loadQueue();
  }
};

loadQueue();

