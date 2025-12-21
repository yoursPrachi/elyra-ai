import { db } from "./firebase.js"; 
import { 
    collection, addDoc, getDocs, deleteDoc, doc, updateDoc, 
    serverTimestamp, query, orderBy, limit, where, onSnapshot 
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

// --- 1. DASHBOARD INITIALIZATION ---
window.addEventListener('DOMContentLoaded', () => {
    console.log("Admin Dashboard Connecting... 🚀");
    initDashboard();
});

function initDashboard() {
    trackLiveStats();   // Active Now, Today, Total Stats
    loadUsers();        // User Activity Log
    loadBrainData();    // Bot Intelligence & Update Logic
    loadPending();      // User Learning Approvals
}

// --- 2. LIVE ANALYTICS (Real-time) ---
function trackLiveStats() {
    const startOfToday = new Date();
    startOfToday.setHours(0,0,0,0);
    const activeTime = new Date(Date.now() - 5 * 60000); // Last 5 mins

    // All Time Visits
    onSnapshot(collection(db, "analytics"), (snap) => {
        document.getElementById("total-visits").innerText = snap.size;
    });

    // Today's Visits
    const todayQ = query(collection(db, "analytics"), where("timestamp", ">=", startOfToday));
    onSnapshot(todayQ, (snap) => {
        document.getElementById("today-visits").innerText = snap.size;
    });

    // Active Now
    const activeQ = query(collection(db, "analytics"), where("timestamp", ">=", activeTime));
    onSnapshot(activeQ, (snap) => {
        document.getElementById("active-users").innerText = snap.size;
    });
}

// --- 3. BOT BRAIN MANAGEMENT (Update/Edit Logic) ---
function loadBrainData() {
    const table = document.getElementById("trending-table");
    const q = query(collection(db, "brain"), orderBy("hitCount", "desc"), limit(15));
    
    onSnapshot(q, (snap) => {
        if (!table) return;
        table.innerHTML = "";
        snap.forEach(d => {
            const data = d.data();
            const id = d.id;
            const currentAns = data.answers ? data.answers[0] : "";
            
            table.innerHTML += `
                <tr>
                    <td><b>${data.question}</b></td>
                    <td><input type="text" value="${currentAns}" id="ans-${id}" class="edit-input"></td>
                    <td style="text-align:center;">${data.hitCount || 0}</td>
                    <td>
                        <button onclick="window.updateBotAnswer('${id}')" class="btn-save">Update ✅</button>
                        <button onclick="window.deleteFromBrain('${id}')" class="btn-del">🗑️</button>
                    </td>
                </tr>`;
        });
    });
}

window.updateBotAnswer = async (id) => {
    const newAns = document.getElementById(`ans-${id}`).value;
    if(!newAns) return alert("Answer cannot be empty!");
    try {
        await updateDoc(doc(db, "brain", id), {
            answers: [newAns.trim()],
            timestamp: serverTimestamp()
        });
        alert("Bot intelligence updated! 🧠");
    } catch (e) { console.error(e); }
};

// --- 4. APPROVAL SYSTEM (temp_learning) ---
function loadPending() {
    const container = document.getElementById("review-container");
    onSnapshot(collection(db, "temp_learning"), (snap) => {
        if (!container) return;
        container.innerHTML = snap.empty ? "<p style='padding:20px; color:#888;'>No pending reviews. 🕊️</p>" : "";
        
        snap.forEach(docSnap => {
            const data = docSnap.data();
            const id = docSnap.id;
            const card = document.createElement("div");
            card.style = "background:#fffbe6; padding:15px; border-radius:8px; border-left:5px solid #f1c40f; margin-bottom:15px;";
            card.innerHTML = `
                <p style="font-size:11px; color:#999;">USER SUGGESTION</p>
                <p><b>Q:</b> ${data.question}</p>
                <p><b>A:</b> <span style="color:#075e54">${data.answer}</span></p>
                <div style="display:flex; gap:10px; margin-top:10px;">
                    <button onclick="window.approveLeaning('${id}')" style="background:#27ae60; color:#fff; border:none; padding:8px; border-radius:4px; flex:1; cursor:pointer;">Approve ✅</button>
                    <button onclick="window.rejectLearning('${id}')" style="background:#e74c3c; color:#fff; border:none; padding:8px; border-radius:4px; flex:1; cursor:pointer;">Reject ❌</button>
                </div>`;
            container.appendChild(card);
        });
    });
}

window.approveLeaning = async (id) => {
    const snap = await getDocs(collection(db, "temp_learning"));
    let d = null;
    snap.forEach(doc => { if(doc.id === id) d = doc.data(); });
    if(d) {
        await addDoc(collection(db, "brain"), {
            question: d.question.toLowerCase(),
            answers: [d.answer],
            hitCount: 1,
            timestamp: serverTimestamp()
        });
        await deleteDoc(doc(db, "temp_learning", id));
        alert("Approved! Added to Brain. ✨");
    }
};

window.rejectLearning = async (id) => {
    if(confirm("Delete this suggestion?")) await deleteDoc(doc(db, "temp_learning", id));
};

// --- 5. USER ACTIVITY LOG ---
function loadUsers() {
    const table = document.getElementById("user-list-table");
    onSnapshot(query(collection(db, "users_list"), orderBy("lastSeen", "desc")), (snap) => {
        if (!table) return;
        table.innerHTML = "";
        snap.forEach(d => {
            const u = d.data();
            table.innerHTML += `
                <tr>
                    <td>${u.name || 'User'}</td>
                    <td>${u.email || 'N/A'}</td>
                    <td>${u.visitCount || 1}</td>
                    <td>${u.lastSeen ? new Date(u.lastSeen).toLocaleString() : 'N/A'}</td>
                </tr>`;
        });
    });
}

window.deleteFromBrain = async (id) => {
    if(confirm("Permanently delete from brain?")) await deleteDoc(doc(db, "brain", id));
};
