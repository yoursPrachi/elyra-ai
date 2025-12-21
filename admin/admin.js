import { db } from "../firebase.js"; 
import { 
    collection, addDoc, getDocs, deleteDoc, doc, updateDoc, 
    getDoc, serverTimestamp, query, orderBy, limit, increment 
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

const container = document.getElementById("review-container");
const MASTER_PASSWORD = "apna_secret_pass"; // <--- Apna password yahan check karein

// --- 1. LOGIN & INITIAL LOAD ---
window.checkAuth = () => {
    const passInput = document.getElementById("admin-pass").value;
    const loginDiv = document.getElementById("admin-login");
    if (passInput === MASTER_PASSWORD) {
        sessionStorage.setItem("isAdmin", "true");
        loginDiv.style.display = "none";
        loadAllData();
    } else {
        alert("Ghalat Password! ❌");
    }
};

function loadAllData() {
    loadPending();
    loadTrending();
    loadUsers(); // User list function
}

if (sessionStorage.getItem("isAdmin") === "true") {
    document.getElementById("admin-login").style.display = "none";
    loadAllData();
}

// --- 2. TRENDING & REFORM LOGIC (Popularity) ---
window.loadTrending = async () => {
    const table = document.getElementById("trending-table");
    try {
        const q = query(collection(db, "brain"), orderBy("hitCount", "desc"), limit(10));
        const snap = await getDocs(q);
        table.innerHTML = "";
        snap.forEach(docSnap => {
            const data = docSnap.data();
            table.innerHTML += `
                <tr style="border-bottom:1px solid #eee;">
                    <td style="padding:10px;">${data.question}</td>
                    <td style="padding:10px;"><span style="background:#3498db; color:white; padding:2px 8px; border-radius:10px;">${data.hitCount || 0} hits</span></td>
                    <td style="padding:10px;">
                        <button onclick="reform('${docSnap.id}')" style="background:#f39c12; color:white; border:none; border-radius:4px; padding:5px; cursor:pointer;">Reform</button>
                        <button onclick="deleteBrainDoc('${docSnap.id}')" style="background:#e74c3c; color:white; border:none; border-radius:4px; padding:5px; cursor:pointer;">Clean</button>
                    </td>
                </tr>`;
        });
    } catch (e) { console.error(e); }
};

// --- REFORM (EDIT) LOGIC ---
let currentReformId = "";
window.reform = async (docId) => {
    currentReformId = docId;
    const docRef = doc(db, "brain", docId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
        const data = snap.data();
        document.getElementById("reform-question").innerText = `Sawal: ${data.question}`;
        document.getElementById("reform-text").value = data.answers ? data.answers.join('\n') : data.answer;
        document.getElementById("reform-modal").style.display = "flex";
    }
};

window.saveReform = async () => {
    const newText = document.getElementById("reform-text").value.trim();
    if (!newText) return;
    try {
        const docRef = doc(db, "brain", currentReformId);
        const ansArray = newText.split('\n').filter(a => a.trim() !== "");
        await updateDoc(docRef, { answers: ansArray, lastReformed: serverTimestamp() });
        alert("Updated! ✨");
        window.closeReform();
        loadTrending();
    } catch (e) { alert("Error updating!"); }
};

window.closeReform = () => { document.getElementById("reform-modal").style.display = "none"; };

window.deleteBrainDoc = async (id) => {
    if(confirm("Kya aap ise brain se delete karna chahte hain?")) {
        await deleteDoc(doc(db, "brain", id));
        loadTrending();
    }
};

// --- 3. REGISTERED USERS LIST ---
async function loadUsers() {
    const table = document.getElementById("user-list-table");
    try {
        const q = query(collection(db, "users_list"), orderBy("timestamp", "desc"));
        const snap = await getDocs(q);
        table.innerHTML = "";
        snap.forEach(docSnap => {
            const u = docSnap.data();
            const date = u.timestamp ? new Date(u.timestamp.seconds * 1000).toLocaleDateString() : "N/A";
            table.innerHTML += `<tr><td style="padding:10px;">${u.name}</td><td>${u.email}</td><td>${date}</td></tr>`;
        });
    } catch (e) { console.log(e); }
}

// --- 4. SIMILARITY & DUPLICATE CHECK ---
function getSimilarity(s1, s2) {
    let longer = s1.length < s2.length ? s2 : s1;
    let shorter = s1.length < s2.length ? s1 : s2;
    if (longer.length == 0) return 1.0;
    
    const editDistance = (s1, s2) => {
        let costs = [];
        for (let i = 0; i <= s1.length; i++) {
            let lastValue = i;
            for (let j = 0; j <= s2.length; j++) {
                if (i == 0) costs[j] = j;
                else if (j > 0) {
                    let newValue = costs[j - 1];
                    if (s1.charAt(i - 1) != s2.charAt(j - 1))
                        newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
                    costs[j - 1] = lastValue;
                    lastValue = newValue;
                }
            }
            if (i > 0) costs[s2.length] = lastValue;
        }
        return costs[s2.length];
    };
    return (longer.length - editDistance(longer, shorter)) / parseFloat(longer.length);
}

window.checkDuplicate = async () => {
    const queryStr = document.getElementById("check-query").value.toLowerCase().trim();
    const resultDiv = document.getElementById("check-result");
    if(!queryStr) return;
    resultDiv.innerHTML = "Checking... ⏳";
    const snap = await getDocs(collection(db, "brain"));
    let maxScore = 0; let match = "";
    snap.forEach(d => {
        const score = getSimilarity(queryStr, d.data().question);
        if(score > maxScore) { maxScore = score; match = d.data().question; }
    });
    resultDiv.innerHTML = maxScore > 0.7 ? `⚠️ Match Found: "${match}" (${Math.round(maxScore*100)}%)` : "✅ Unique Question!";
};

// --- 5. MASS UPLOAD & PENDING LOGIC ---
window.massUpload = async () => {
    const data = document.getElementById("bulkData").value.trim();
    if (!data) return;
    const lines = data.split("\n");
    try {
        for (let line of lines) {
            const [q, a] = line.split("|");
            if (q && a) {
                await addDoc(collection(db, "brain"), {
                    question: q.trim().toLowerCase(),
                    answers: [a.trim()],
                    hitCount: 0,
                    timestamp: serverTimestamp()
                });
            }
        }
        alert("Mass Upload Done! 🚀");
        loadTrending();
    } catch (e) { console.error(e); }
};

async function loadPending() {
    container.innerHTML = "Loading...";
    const snap = await getDocs(collection(db, "temp_learning"));
    container.innerHTML = snap.empty ? "Sab approved hai! ✅" : "";
    snap.forEach(docSnap => {
        const data = docSnap.data();
        const id = docSnap.id;
        const div = document.createElement("div");
        div.className = "pending-card";
        div.innerHTML = `
            <div><b>Q:</b> ${data.question} <br><small>By: ${data.learnedFrom || 'Unknown'}</small></div>
            <input type="text" value="${data.answer}" id="inp-${id}" class="a-input">
            <button onclick="approveLearned('${id}', '${data.question}')">Approve</button>
            <button onclick="deleteLearned('${id}')">Reject</button>`;
        container.appendChild(div);
    });
}

window.approveLearned = async (id, q) => {
    const ans = document.getElementById(`inp-${id}`).value;
    await addDoc(collection(db, "brain"), { question: q.toLowerCase(), answers: [ans], hitCount: 0, timestamp: serverTimestamp() });
    await deleteDoc(doc(db, "temp_learning", id));
    loadPending(); loadTrending();
};

window.deleteLearned = async (id) => {
    await deleteDoc(doc(db, "temp_learning", id));
    loadPending();
};
