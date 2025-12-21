import { db } from "../firebase.js"; // Path sahi check karein
import { collection, addDoc, getDocs, deleteDoc, doc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

const container = document.getElementById("review-container");

// --- ADMIN SECURITY CONFIG ---
const MASTER_PASSWORD = "apna_secret_pass"; // <--- Yahan apna password set karein

window.checkAuth = () => {
    const passInput = document.getElementById("admin-pass").value;
    const loginDiv = document.getElementById("admin-login");
    const errStatus = document.getElementById("login-err");

    if (passInput === MASTER_PASSWORD) {
        sessionStorage.setItem("isAdmin", "true");
        loginDiv.style.display = "none";
        loadPending(); // Data tabhi load hoga jab login ho jaye
    } else {
        errStatus.style.display = "block";
        setTimeout(() => { errStatus.style.display = "none"; }, 2000);
    }
};

// Check if already logged in (for refresh)
if (sessionStorage.getItem("isAdmin") === "true") {
    document.getElementById("admin-login").style.display = "none";
}

// Similarity function (Bot wale logic jaisa hi)
function getSimilarity(s1, s2) {
    let longer = s1.length < s2.length ? s2 : s1;
    let shorter = s1.length < s2.length ? s1 : s2;
    if (longer.length == 0) return 1.0;
    
    // ... (Similarity code remains same as provided in previous step)
    return (longer.length - editDistance(longer, shorter)) / parseFloat(longer.length);
}

window.checkDuplicate = async () => {
    const queryStr = document.getElementById("check-query").value.toLowerCase().trim();
    const resultDiv = document.getElementById("check-result");
    
    if(!queryStr) return;
    
    resultDiv.innerHTML = "Searching database... ⏳";
    
    const snap = await getDocs(collection(db, "brain"));
    let closestMatch = null;
    let maxScore = 0;

    snap.forEach(doc => {
        const dbQuestion = doc.data().question.toLowerCase();
        const score = getSimilarity(queryStr, dbQuestion);
        if (score > maxScore) {
            maxScore = score;
            closestMatch = dbQuestion;
        }
    });

    if (maxScore > 0.8) {
        resultDiv.innerHTML = `⚠️ Milta-julta sawal mila: <span style="color:red;">"${closestMatch}"</span> (${Math.round(maxScore*100)}% match)`;
    } else if (maxScore > 0.5) {
        resultDiv.innerHTML = `🤔 Thoda milta-julta hai: "${closestMatch}" (${Math.round(maxScore*100)}% match). Check kar lein.`;
    } else {
        resultDiv.innerHTML = `✅ Ye sawal naya lag raha hai! (Best match only ${Math.round(maxScore*100)}%)`;
    }
};


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
