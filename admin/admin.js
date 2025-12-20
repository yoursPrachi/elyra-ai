import { db } from "../firebase.js"; // Path sahi check karein
import { collection, addDoc, getDocs, deleteDoc, doc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

const container = document.getElementById("review-container");

// --- MASS UPLOAD LOGIC FIX ---
window.massUpload = async () => {
    const data = document.getElementById("bulkData").value.trim();
    if (!data) return alert("Pehle data toh daalo!");

    const lines = data.split("\n");
    const batch = [];
    
    try {
        for (let line of lines) {
            const [q, a] = line.split("|");
            if (q && a) {
                // Hamesha question ko small letters mein save karein
                batch.push(addDoc(collection(db, "brain"), {
                    question: q.trim().toLowerCase(),
                    answers: [a.trim()], 
                    timestamp: serverTimestamp(),
                    status: "approved"
                }));
            }
        }
        await Promise.all(batch);
        alert("Success! 🚀 Saare sawal Brain mein chale gaye.");
        document.getElementById("bulkData").value = "";
    } catch (e) {
        alert("Upload fail: " + e.message);
        console.error(e);
    }
};

// --- PENDING REVIEWS ---
async function loadPending() {
    container.innerHTML = "Loading...";
    try {
        const snap = await getDocs(collection(db, "temp_learning"));
        container.innerHTML = "";
        if (snap.empty) { container.innerHTML = "Sab approved hai! ✅"; return; }

        snap.forEach((docSnap) => {
            const data = docSnap.data();
            const id = docSnap.id;
            const div = document.createElement("div");
            div.className = "pending-card";
            div.innerHTML = `
                <div><b>Q:</b> ${data.question}</div>
                <input type="text" value="${data.answer}" class="a-input" id="inp-${id}">
                <button style="background:#25d366; color:white; padding:8px; border:none; border-radius:5px;" onclick="approveLearned('${id}', '${data.question}')">Approve</button>
                <button style="background:#e74c3c; color:white; padding:8px; border:none; border-radius:5px;" onclick="deleteLearned('${id}')">Reject</button>
            `;
            container.appendChild(div);
        });
    } catch(e) { console.error(e); }
}

window.approveLearned = async (id, question) => {
    const ans = document.getElementById(`inp-${id}`).value;
    await addDoc(collection(db, "brain"), {
        question: question.toLowerCase(),
        answers: [ans],
        timestamp: serverTimestamp()
    });
    await deleteDoc(doc(db, "temp_learning", id));
    loadPending();
};

window.deleteLearned = async (id) => {
    await deleteDoc(doc(db, "temp_learning", id));
    loadPending();
};

loadPending();
