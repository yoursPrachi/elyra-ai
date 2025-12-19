import { db } from "../firebase.js";
import { collection, getDocs, deleteDoc, doc, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

// --- SECURITY LOGIC ---
const ADMIN_PASSWORD = "your_secret_password"; // 👈 Yahan apna password rakhein

window.checkPass = () => {
  const pass = document.getElementById("admin-pass").value;
  if (pass === ADMIN_PASSWORD) {
    document.getElementById("login-form").style.display = "none";
    document.getElementById("dashboard").style.display = "block";
    loadQueue();
  } else {
    alert("Wrong Password! ❌");
  }
};

window.logout = () => location.reload();

// --- TRAINING LOGIC ---
async function loadQueue() {
  const list = document.getElementById("queue-list");
  try {
    const snap = await getDocs(collection(db, "learningQueue"));
    list.innerHTML = "";
    
    if (snap.empty) {
      list.innerHTML = "<p>No new questions to learn. Bot is smart! 🧠</p>";
      return;
    }

    snap.forEach((document) => {
      const data = document.data();
      const div = document.createElement("div");
      div.className = "card";
      div.innerHTML = `
        <p><strong>User Asked:</strong> "${data.question}"</p>
        <button onclick="trainBot('${document.id}', '${data.question}')" style="background:#00a884; margin-right:10px;">Train</button>
        <button onclick="ignoreQ('${document.id}')" style="background:#ea0038;">Ignore</button>
      `;
      list.appendChild(div);
    });
  } catch (err) { console.error(err); }
}

window.trainBot = async (id, q) => {
  const ans = prompt(`Sikhaiye Elyra ko: "${q}" ka kya jawab de?`);
  if (ans) {
    // Add to 'brain' collection (Logic check in smartReply.js)
    await addDoc(collection(db, "brain"), {
      question: q.toLowerCase().trim(),
      answer: ans,
      time: serverTimestamp()
    });
    await deleteDoc(doc(db, "learningQueue", id));
    alert("Training successful! ✅");
    loadQueue();
  }
};

// admin.js mein query ko update karein
import { orderBy } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

const q = query(collection(db, "learningQueue"), orderBy("count", "desc"));



window.ignoreQ = async (id) => {
  if (confirm("Delete this?")) {
    await deleteDoc(doc(db, "learningQueue", id));
    loadQueue();
  }
};
