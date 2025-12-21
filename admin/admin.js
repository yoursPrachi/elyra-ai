import { db } from "../firebase.js"; 
import { 
    collection, addDoc, getDocs, deleteDoc, doc, updateDoc, 
    getDoc, serverTimestamp, query, orderBy, limit 
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

const container = document.getElementById("review-container");
const MASTER_PASSWORD = "apna_secret_pass"; 

// --- 1. LOGIN LOGIC ---
window.checkAuth = () => {
    const passInput = document.getElementById("admin-pass").value;
    if (passInput === MASTER_PASSWORD) {
        sessionStorage.setItem("isAdmin", "true");
        document.getElementById("admin-login").style.display = "none";
        loadAllData();
    } else { alert("Wrong Password!"); }
};

async function loadAllData() {
    await loadPending();
    await loadTrending();
    await loadUsers();
}

if (sessionStorage.getItem("isAdmin") === "true") {
    document.getElementById("admin-login").style.display = "none";
    loadAllData();
}

// --- 2. USER LOYALTY LIST ---
async function loadUsers() {
    const table = document.getElementById("user-list-table");
    try {
        const q = query(collection(db, "users_list"), orderBy("timestamp", "desc"));
        const snap = await getDocs(q);
        table.innerHTML = "";
        
        snap.forEach(docSnap => {
            const u = docSnap.data();
            const date = u.timestamp ? new Date(u.timestamp.seconds * 1000).toLocaleDateString() : "N/A";
            const v = u.visits || 1;
            
            let statusBadge = v > 10 ? `<span class="badge-vip">👑 VIP</span>` : (v > 3 ? `<span class="badge-loyal">⭐ Loyal</span>` : "🆕");

            table.innerHTML += `
                <tr>
                    <td>${u.name} ${statusBadge}</td>
                    <td>${u.email}</td>
                    <td><b>${v}</b></td>
                    <td>${date}</td>
                </tr>`;
        });
    } catch (e) { console.error(e); }
}

// --- 3. PENDING LEARNING ---
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
            <b>Q:</b> ${data.question} <br>
            <input type="text" value="${data.answer}" id="inp-${id}" class="a-input">
            <div class="btn-group">
                <button class="btn-approve" onclick="window.approveLearned('${id}', '${data.question}')">Approve ✅</button>
                <button class="btn-reject" onclick="window.deleteLearned('${id}')">Reject ❌</button>
            </div>`;
        container.appendChild(div);
    });
}

window.approveLearned = async (id, q) => {
    const ans = document.getElementById(`inp-${id}`).value;
    await addDoc(collection(db, "brain"), { question: q.toLowerCase(), answers: [ans], hitCount: 0, timestamp: serverTimestamp() });
    await deleteDoc(doc(db, "temp_learning", id));
    loadPending();
};

window.deleteLearned = async (id) => {
    if(confirm("Reject kar dein?")) {
        await deleteDoc(doc(db, "temp_learning", id));
        loadPending();
    }
};

// Trending Logic
window.loadTrending = async () => {
    const table = document.getElementById("trending-table");
    const q = query(collection(db, "brain"), orderBy("hitCount", "desc"), limit(10));
    const snap = await getDocs(q);
    table.innerHTML = "";
    snap.forEach(d => {
        table.innerHTML += `<tr><td>${d.data().question}</td><td>${d.data().hitCount || 0}</td><td><button onclick="window.deleteBrainDoc('${d.id}')" style="background:red">Delete</button></td></tr>`;
    });
};

window.deleteBrainDoc = async (id) => {
    if(confirm("Delete from brain?")) {
        await deleteDoc(doc(db, "brain", id));
        loadTrending();
    }
};
