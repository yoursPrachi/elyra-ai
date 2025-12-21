import { db } from "./firebase.js"; 
import { 
    collection, addDoc, getDocs, deleteDoc, doc, updateDoc, 
    serverTimestamp, query, orderBy, limit, where, onSnapshot 
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

// --- 1. CONFIG & GLOBALS ---
const MASTER_PASSWORD = "apna_secret_pass"; // Isse apna password set karein
let userMap;
const container = document.getElementById("review-container");

// --- 2. SECURE LOGIN LOGIC (Fixed for Modules) ---
window.checkAuth = () => {
    const passInput = document.getElementById("admin-pass").value;
    
    if (passInput === MASTER_PASSWORD) {
        sessionStorage.setItem("isAdmin", "true");
        document.getElementById("admin-login").style.display = "none";
        document.getElementById("dashboard-content").style.display = "block";
        initDashboard();
        console.log("Admin Access Granted! ✅");
    } else {
        alert("Ghalat Password! ❌");
    }
};

// Auto-Login check on Refresh
window.addEventListener('DOMContentLoaded', () => {
    if (sessionStorage.getItem("isAdmin") === "true") {
        document.getElementById("admin-login").style.display = "none";
        document.getElementById("dashboard-content").style.display = "block";
        initDashboard();
    }
});

// --- 3. DASHBOARD INITIALIZATION ---
function initDashboard() {
    initMap();
    trackLiveStats();
    loadUsers();
    loadPending();
    loadTrending();
}

// --- 4. GLOBAL MAP (Leaflet) ---
function initMap() {
    if (!userMap) {
        userMap = L.map('map').setView([20, 0], 2);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© Elyra AI Global'
        }).addTo(userMap);
    }
}

// --- 5. REAL-TIME STATS & MAP MARKERS ---
function trackLiveStats() {
    const now = new Date();
    const startOfToday = new Date(now.setHours(0,0,0,0));
    const activeThreshold = new Date(Date.now() - 5 * 60000);

    // Total Lifetime Visits
    onSnapshot(collection(db, "analytics"), (snap) => {
        document.getElementById("total-visits").innerText = snap.size;
    });

    // Today's Visits
    const todayQ = query(collection(db, "analytics"), where("timestamp", ">=", startOfToday));
    onSnapshot(todayQ, (snap) => {
        document.getElementById("today-visits").innerText = snap.size;
    });

    // Active Now (5 min threshold)
    const activeQ = query(collection(db, "analytics"), where("timestamp", ">=", activeThreshold));
    onSnapshot(activeQ, (snap) => {
        document.getElementById("active-users").innerText = snap.size;
    });

    // Markers on Map
    onSnapshot(collection(db, "users_list"), (snap) => {
        snap.forEach(docSnap => {
            const u = docSnap.data();
            if (u.lat && u.lng) {
                L.marker([u.lat, u.lng]).addTo(userMap)
                    .bindPopup(`<b>${u.name}</b><br>${u.city || 'Global'}`);
            }
        });
    });
}

// --- 6. USER MANAGEMENT & LOYALTY ---
async function loadUsers() {
    const table = document.getElementById("user-list-table");
    const q = query(collection(db, "users_list"), orderBy("lastSeen", "desc"), limit(50));
    
    onSnapshot(q, (snap) => {
        table.innerHTML = "";
        snap.forEach(docSnap => {
            const u = docSnap.data();
            const visits = u.visitCount || 1;
            let badge = visits > 10 ? `<span class="badge-vip">👑 VIP</span>` : 
                        (visits > 3 ? `<span class="badge-loyal">⭐ Loyal</span>` : "🆕");

            table.innerHTML += `
                <tr>
                    <td><b>${u.name}</b> ${badge}</td>
                    <td>${u.email}</td>
                    <td>${u.city || 'Global'}</td>
                    <td>${visits}</td>
                    <td>${u.lastSeen ? new Date(u.lastSeen).toLocaleTimeString() : 'N/A'}</td>
                </tr>`;
        });
    });
}

// --- 7. PENDING REVIEWS (Learning) ---
async function loadPending() {
    onSnapshot(collection(db, "temp_learning"), (snap) => {
        container.innerHTML = snap.empty ? "Sab clear hai! ✅" : "";
        snap.forEach(docSnap => {
            const data = docSnap.data();
            const id = docSnap.id;
            const div = document.createElement("div");
            div.className = "pending-card";
            div.innerHTML = `
                <p><b>Q:</b> ${data.question}</p>
                <input type="text" value="${data.answer}" id="inp-${id}" class="a-input">
                <div class="btn-group">
                    <button class="btn-approve" onclick="window.approveLearned('${id}', '${data.question}')">Approve ✅</button>
                    <button class="btn-reject" onclick="window.deleteLearned('${id}')">Reject ❌</button>
                </div>`;
            container.appendChild(div);
        });
    });
}

window.approveLearned = async (id, q) => {
    const ans = document.getElementById(`inp-${id}`).value;
    await addDoc(collection(db, "brain"), { 
        question: q.toLowerCase(), 
        answers: [ans], 
        hitCount: 1, 
        timestamp: serverTimestamp() 
    });
    await deleteDoc(doc(db, "temp_learning", id));
};

window.deleteLearned = async (id) => {
    if(confirm("Reject kar dein?")) await deleteDoc(doc(db, "temp_learning", id));
};

// --- 8. BRAIN & TRENDING ---
window.massUpload = async () => {
    const raw = document.getElementById("bulkData").value.trim();
    if(!raw) return alert("Kuch likho!");
    const lines = raw.split("\n");
    for (let line of lines) {
        const [q, a] = line.split("|");
        if(q && a) {
            await addDoc(collection(db, "brain"), {
                question: q.trim().toLowerCase(),
                answers: [a.trim()],
                hitCount: 0,
                timestamp: serverTimestamp()
            });
        }
    }
    alert("Synced! 🚀");
    document.getElementById("bulkData").value = "";
};

async function loadTrending() {
    const table = document.getElementById("trending-table");
    onSnapshot(query(collection(db, "brain"), orderBy("hitCount", "desc"), limit(10)), (snap) => {
        table.innerHTML = "";
        snap.forEach(d => {
            table.innerHTML += `
                <tr>
                    <td>${d.data().question}</td>
                    <td>${d.data().hitCount || 0}</td>
                    <td><button onclick="window.deleteBrainDoc('${d.id}')" style="background:red; color:white; border:none; padding:5px; border-radius:5px;">Delete</button></td>
                </tr>`;
        });
    });
}

window.deleteBrainDoc = async (id) => {
    if(confirm("Brain se delete?")) await deleteDoc(doc(db, "brain", id));
};
