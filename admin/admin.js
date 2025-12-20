import { db } from "./firebase.js";
import { collection, addDoc, getDocs, deleteDoc, doc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

const container = document.getElementById("review-container");

// --- 1. Admin Direct Upload (Multiple Answers Support) ---
window.adminUpload = async () => {
    const q = document.getElementById("admin-q").value.trim();
    const a = document.getElementById("admin-a").value.trim();
    const btn = document.getElementById("upload-btn");
    const btnText = document.getElementById("btn-text");
    const resMsg = document.getElementById("response-msg");

    if (!q || !a) return alert("Sawal aur Jawab dono fill karein!");

    btn.disabled = true;
    btnText.innerText = "Processing... ⏳";

    try {
        // Comma se split karke array banana
        const answerList = a.split(",").map(ans => ans.trim()).filter(ans => ans !== "");

        await addDoc(collection(db, "brain"), {
            question: q.toLowerCase(),
            answers: answerList, // Array format
            status: "admin_added",
            timestamp: serverTimestamp()
        });

        resMsg.innerText = "Elyra ab smartly jawab degi! ✅";
        resMsg.style.color = "#25d366";
        resMsg.style.display = "block";
        document.getElementById("admin-q").value = "";
        document.getElementById("admin-a").value = "";

    } catch (e) {
        resMsg.innerText = "Error: " + e.message;
        resMsg.style.color = "#e74c3c";
        resMsg.style.display = "block";
    } finally {
        btn.disabled = false;
        btnText.innerText = "🚀 Upload to Brain";
        setTimeout(() => { resMsg.style.display = "none"; }, 4000);
    }
};

// --- 2. Load Pending Learning ---
async function loadPending() {
    const snap = await getDocs(collection(db, "temp_learning"));
    container.innerHTML = "";
    if (snap.empty) { container.innerHTML = "<p style='text-align:center'>Sab approved hai! ✅</p>"; return; }

    snap.forEach((docSnap) => {
        const data = docSnap.data();
        const div = document.createElement("div");
        div.className = "pending-card";
        div.innerHTML = `
            <strong>Q: ${data.question}</strong>
            <input type="text" value="${data.answer}" class="a-input" id="edit-${docSnap.id}">
            <div style="display:flex; gap:10px;">
                <button style="background:#25d366" onclick="approve('${docSnap.id}', '${data.question}')">Approve</button>
                <button style="background:#e74c3c" onclick="remove('${docSnap.id}')">Delete</button>
            </div>
        `;
        container.appendChild(div);
    });
}

window.approve = async (id, q) => {
    const val = document.getElementById(`edit-${id}`).value.trim();
    const answerList = val.split(",").map(ans => ans.trim()).filter(ans => ans !== "");
    await addDoc(collection(db, "brain"), { question: q.toLowerCase(), answers: answerList, timestamp: serverTimestamp() });
    await deleteDoc(doc(db, "temp_learning", id));
    loadPending();
};

window.remove = async (id) => {
    if(confirm("Hata dein?")) { await deleteDoc(doc(db, "temp_learning", id)); loadPending(); }
};

loadPending();
