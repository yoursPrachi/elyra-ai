import { db } from "./firebase.js"; 
import { 
    collection, addDoc, getDocs, deleteDoc, doc, updateDoc, 
    serverTimestamp, query, orderBy, limit, where, onSnapshot 
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

// --- 1. INITIALIZATION ---
window.addEventListener('DOMContentLoaded', () => {
    initDashboard();
});

function initDashboard() {
    trackLiveStats();   // Active, Today, All-time stats
    loadUsers();        // User list table
    loadBrainData();    // Most asked questions & Update logic
    loadPending();      // Bot learning review
}

// --- 2. REAL-TIME STATS (Active, Today, Total) ---
function trackLiveStats() {
    const now = new Date();
    const startOfToday = new Date(now.setHours(0,0,0,0));
    const activeThreshold = new Date(Date.now() - 5 * 60000); // Last 5 mins

    // A. All-time Users (Total documents in analytics)
    onSnapshot(collection(db, "analytics"), (snap) => {
        document.getElementById("total-visits").innerText = snap.size;
    });

    // B. Today's Visits
    const todayQ = query(collection(db, "analytics"), where("timestamp", ">=", startOfToday));
    onSnapshot(todayQ, (snap) => {
        document.getElementById("today-visits").innerText = snap.size;
    });

    // C. Active Now (Users who chatted in last 5 mins)
    const activeQ = query(collection(db, "analytics"), where("timestamp", ">=", activeThreshold));
    onSnapshot(activeQ, (snap) => {
        document.getElementById("active-users").innerText = snap.size;
    });
}

// --- 3. MOST ASKED QUESTIONS & UPDATE LOGIC ---
function loadBrainData() {
    const table = document.getElementById("trending-table");
    // Top 10 most asked questions (hitCount ke basis par)
    const q = query(collection(db, "brain"), orderBy("hitCount", "desc"), limit(10));
    
    onSnapshot(q, (snap) => {
        if (!table) return;
        table.innerHTML = "";
        snap.forEach(d => {
            const data = d.data();
            const id = d.id;
            const answers = data.answers ? data.answers.join(", ") : "No Answer";
            
            table.innerHTML += `
                <tr>
                    <td><b>${data.question}</b></td>
                    <td><input type="text" value="${answers}" id="ans-${id}" class="edit-input"></td>
                    <td>${data.hitCount || 0}</td>
                    <td>
                        <button onclick="window.updateAnswer('${id}')" class="btn-save">Update ✅</button>
                        <button onclick="window.deleteBrainDoc('${id}')" class="btn-del">🗑️</button>
                    </td>
                </tr>`;
        });
    });
}

// Answer Update Function
window.updateAnswer = async (id) => {
    const newAns = document.getElementById(`ans-${id}`).value;
    if(!newAns) return alert("Answer khali nahi ho sakta!");
    
    try {
        await updateDoc(doc(db, "brain", id), {
            answers: [newAns.trim()],
            timestamp: serverTimestamp()
        });
        alert("Bot ka dimag update ho gaya! 🧠✨");
    } catch (e) { console.error(e); }
};

// --- 4. ALL TIME USER DATA (Table) ---
function loadUsers() {
    const table = document.getElementById("user-list-table");
    const q = query(collection(db, "users_list"), orderBy("visitCount", "desc"));

    onSnapshot(q, (snap) => {
        if (!table) return;
        table.innerHTML = "";
        snap.forEach(docSnap => {
            const u = docSnap.data();
            table.innerHTML += `
                <tr>
                    <td>${u.name || 'Anonymous'}</td>
                    <td>${u.email || 'N/A'}</td>
                    <td>${u.city || 'Global'}</td>
                    <td><b>${u.visitCount || 1}</b></td>
                    <td>${u.lastSeen ? new Date(u.lastSeen).toLocaleDateString() : 'N/A'}</td>
                </tr>`;
        });
    });
}

// --- 5. DELETE BRAIN DOC ---
window.deleteBrainDoc = async (id) => {
    if(confirm("Kya aap is sawal ko brain se delete karna chahte hain?")) {
        await deleteDoc(doc(db, "brain", id));
    }
};
