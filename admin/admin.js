import { db } from "./firebase.js"; 
import { 
    collection, addDoc, getDocs, deleteDoc, doc, updateDoc, 
    getDoc, serverTimestamp, query, orderBy, limit, where, onSnapshot 
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

const container = document.getElementById("review-container");
const MASTER_PASSWORD = "apna_secret_pass"; // Isse badal lein
let userMap;

// --- 1. LOGIN & INITIALIZATION ---
window.checkAuth = () => {
    const passInput = document.getElementById("admin-pass").value;
    if (passInput === MASTER_PASSWORD) {
        sessionStorage.setItem("isAdmin", "true");
        document.getElementById("admin-login").style.display = "none";
        document.getElementById("dashboard-content").style.display = "block";
        initDashboard();
    } else { alert("Wrong Password!"); }
};

function initDashboard() {
    initMap();
    loadAllData();
    trackLiveStats(); // Real-time Counters
}

if (sessionStorage.getItem("isAdmin") === "true") {
    document.getElementById("admin-login").style.display = "none";
    document.getElementById("dashboard-content").style.display = "block";
    initDashboard();
}

// --- 2. GLOBAL MAP LOGIC (Leaflet) ---
function initMap() {
    userMap = L.map('map').setView([20, 0], 2); // Global View
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(userMap);
}

// --- 3. REAL-TIME STATS TRACKER ---
function trackLiveStats() {
    const now = new Date();
    const startOfToday = new Date(now.setHours(0,0,0,0));
    const activeThreshold = new Date(Date.now() - 5 * 60000); // 5 Mins ago

    // A. Total Visits (Analytics collection se)
    onSnapshot(collection(db, "analytics"), (snap) => {
        document.getElementById("total-visits").innerText = snap.size;
    });

    // B. Today's Visits
    const todayQuery = query(collection(db, "analytics"), where("timestamp", ">=", startOfToday));
    onSnapshot(todayQuery, (snap) => {
        document.getElementById("today-visits").innerText = snap.size;
    });

    // C. Active Now (Last 5 mins of activity)
    const activeQuery = query(collection(db, "analytics"), where("timestamp", ">=", activeThreshold));
    onSnapshot(activeQuery, (snap) => {
        document.getElementById("active-users").innerText = snap.size;
    });

    // D. Map Markers from Users
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

// --- 4. USER LOYALTY LIST ---
async function loadUsers() {
    const table = document.getElementById("user-list-table");
    const q = query(collection(db, "users_list"), orderBy("lastSeen", "desc"), limit(50));
    
    onSnapshot(q, (snap) => {
        table.innerHTML = "";
        snap.forEach(docSnap => {
            const u = docSnap.data();
            const v = u.visits || 1;
            const lastSeen = u.lastSeen ? new Date(u.lastSeen).toLocaleTimeString() : "Now";
            
            let statusBadge = v > 10 ? `<span class="badge-vip">👑 VIP</span>` : 
                             (v > 3 ? `<span class="badge-loyal">⭐ Loyal</span>` : "🆕");

            table.innerHTML += `
                <tr>
                    <td><b>${u.name}</b> ${statusBadge}</td>
                    <td>${u.email}</td>
                    <td>${u.city || 'Global'}</td>
                    <td><b>${v}</b></td>
                    <td>${lastSeen}</td>
                </tr>`;
        });
    });
}

// --- 5. PENDING LEARNING ---
async function loadPending() {
    container.innerHTML = "Syncing Brain...";
    onSnapshot(collection(db, "temp_learning"), (snap) => {
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
    });
}

// Global Methods for Actions
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
    if(confirm("Reject kar dein?")) {
        await deleteDoc(doc(db, "temp_learning", id));
    }
};

async function loadAllData() {
    await loadPending();
    await loadTrending();
    await loadUsers();
}

// Mass Upload Logic
window.massUpload = async () => {
    const data = document.getElementById("bulkData").value.trim();
    if(!data) return alert("Kuch likho toh!");
    const lines = data.split("\n");
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
    alert("Brain Synced! 🚀");
    document.getElementById("bulkData").value = "";
};

window.loadTrending = async () => {
    const table = document.getElementById("trending-table");
    onSnapshot(query(collection(db, "brain"), orderBy("hitCount", "desc"), limit(10)), (snap) => {
        table.innerHTML = "";
        snap.forEach(d => {
            table.innerHTML += `<tr><td>${d.data().question}</td><td>${d.data().hitCount || 0}</td><td><button onclick="window.deleteBrainDoc('${d.id}')" style="background:red; color:white; border:none; padding:5px; border-radius:5px;">Delete</button></td></tr>`;
        });
    });
};

window.deleteBrainDoc = async (id) => {
    if(confirm("Brain se delete karein?")) {
        await deleteDoc(doc(db, "brain", id));
    }
};
