import { db } from "./firebase.js";
import { collection, getDocs, deleteDoc, doc, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

const container = document.getElementById("review-container");

// --- Data Load Karein ---
async function loadPending() {
    container.innerHTML = "<p style='text-align:center'>Loading...</p>";
    try {
        const snap = await getDocs(collection(db, "temp_learning"));
        container.innerHTML = "";

        if (snap.empty) {
            container.innerHTML = "<div style='text-align:center; padding:20px;'>Sab approved hai! ✅ Koi naya sawal nahi mila.</div>";
            return;
        }

        snap.forEach((docSnap) => {
            const data = docSnap.data();
            const id = docSnap.id;
            
            const div = document.createElement("div");
            div.className = "pending-card";
            div.innerHTML = `
                <div class="q-tag">Question:</div>
                <div style="margin-bottom:10px;">${data.question}</div>
                <div class="q-tag">User's Answer:</div>
                <input type="text" value="${data.answer}" class="a-input" id="inp-${id}">
                <div class="btn-group">
                    <button class="approve-btn" onclick="approveLearned('${id}', '${data.question}')">✅ Approve</button>
                    <button class="delete-btn" onclick="deleteLearned('${id}')">🗑️ Reject</button>
                </div>
            `;
            container.appendChild(div);
        });
    } catch (e) {
        container.innerHTML = "Error loading data: " + e.message;
    }
}

// --- One Click Approval Logic ---
window.approveLearned = async (id, question) => {
    const finalAnswer = document.getElementById(`inp-${id}`).value.trim();
    if(!finalAnswer) return alert("Answer khali nahi ho sakta!");

    try {
        // 1. Permanent Brain mein move karein (Supports Multiple Answers via commas)
        const answerArray = finalAnswer.split(",").map(a => a.trim()).filter(a => a !== "");
        
        await addDoc(collection(db, "brain"), {
            question: question.toLowerCase(),
            answers: answerArray,
            status: "approved",
            timestamp: serverTimestamp()
        });

        // 2. Temp collection se delete karein
        await deleteDoc(doc(db, "temp_learning", id));
        
        alert("Approved! Ab bot ye hamesha yaad rakhega. ✨");
        loadPending(); // Refresh list
    } catch (e) {
        alert("Error: " + e.message);
    }
};

window.deleteLearned = async (id) => {
    if(confirm("Kya aap is learning ko delete karna chahte hain?")) {
        await deleteDoc(doc(db, "temp_learning", id));
        loadPending();
    }
};

// Initial Load
loadPending();
