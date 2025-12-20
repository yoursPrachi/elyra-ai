import { db } from "./firebase.js";
import { collection, getDocs, deleteDoc, doc, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

const container = document.getElementById("review-container");

async function loadPending() {
    container.innerHTML = "<p style='text-align:center'>Loading Data... ⏳</p>";
    try {
        // Aapke app.js ke 'temp_learning' collection se data fetch kar raha hai
        const snap = await getDocs(collection(db, "temp_learning"));
        container.innerHTML = "";

        if (snap.empty) {
            container.innerHTML = "<div style='text-align:center; padding:20px; color:#666;'>Abhi koi naya sawal nahi hai. Bot ko sikhaiye! 😊</div>";
            return;
        }

        snap.forEach((docSnap) => {
            const data = docSnap.data();
            const id = docSnap.id;
            
            const card = document.createElement("div");
            card.className = "pending-card";
            card.innerHTML = `
                <div style="margin-bottom:8px;"><small style="color:#075e54; font-weight:bold;">Sawal:</small> <br> <b>${data.question}</b></div>
                <div style="margin-bottom:8px;"><small style="color:#075e54; font-weight:bold;">User ka Jawab:</small></div>
                <input type="text" value="${data.answer}" class="a-input" id="inp-${id}">
                <div style="display:flex; gap:10px; margin-top:10px;">
                    <button class="approve-btn" onclick="approveLearned('${id}', '${data.question}')">✅ Approve</button>
                    <button class="delete-btn" onclick="deleteLearned('${id}')">🗑️ Reject</button>
                </div>
            `;
            container.appendChild(card);
        });
    } catch (e) {
        console.error("Fetch Error:", e);
        container.innerHTML = "<p style='color:red; text-align:center;'>Error: Permission Denied. Check Firebase Rules.</p>";
    }
}

window.approveLearned = async (id, question) => {
    const finalAnswer = document.getElementById(`inp-${id}`).value.trim();
    if(!finalAnswer) return alert("Pehle jawab check karein!");

    try {
        // 1. Permanent 'brain' collection mein move karein
        const ansList = finalAnswer.split(",").map(a => a.trim());
        await addDoc(collection(db, "brain"), {
            question: question.toLowerCase(),
            answers: ansList,
            status: "approved_by_admin",
            timestamp: serverTimestamp()
        });

        // 2. 'temp_learning' se delete karein
        await deleteDoc(doc(db, "temp_learning", id));
        
        alert("Success! Bot ab ye hamesha yaad rakhega. 🚀");
        loadPending();
    } catch (e) { alert("Error: " + e.message); }
};

window.deleteLearned = async (id) => {
    if(confirm("Kya aap ise reject karna chahte hain?")) {
        await deleteDoc(doc(db, "temp_learning", id));
        loadPending();
    }
};

loadPending();
