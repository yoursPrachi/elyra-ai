import { db } from "./firebase.js"; 
import { 
    collection, addDoc, getDocs, deleteDoc, doc, updateDoc, 
    serverTimestamp, query, orderBy, limit, where, onSnapshot 
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

const container = document.getElementById("review-container");
const MASTER_PASSWORD = "apna_secret_pass"; // Isse apni pasand se badal lein
let userMap;

// --- 1. LOGIN & INITIALIZATION ---
window.checkAuth = () => {
    const passInput = document.getElementById("admin-pass").value;
    if (passInput === MASTER_PASSWORD) {
        sessionStorage.setItem("isAdmin", "true");
        document.getElementById("admin-login").style.display = "none";
        document.getElementById("dashboard-content").style.display = "block";
        initDashboard();
    } else { alert("Wrong Password! ❌"); }
};

function initDashboard() {
    initMap();
    loadAllData();
    trackLiveStats(); // Real-time Monitoring
}

// Auto-login check
if (sessionStorage.getItem("isAdmin") === "true") {
    document.getElementById("admin-login").style.display = "none";
    document.getElementById("dashboard-content").style.display = "block";
    initDashboard();
}

// --- 2. GLOBAL MAP LOGIC (Leaflet) ---
function initMap() {
    if (!userMap) {
        userMap = L.map('map').setView([20, 0], 2); // Global Center
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(userMap);
    }
}

// --- 3. REAL-TIME STATS TRACKER ---
function trackLiveStats() {
    const now = new Date();
    const startOfToday = new Date(now.setHours(0,0,0,0));
    const activeThreshold = new Date(Date.now() - 5 * 60000); // Active in last 5 mins

    // A. Lifetime Visits Count
    onSnapshot(collection(db, "analytics"), (snap) => {
        document.getElementById("total-visits").innerText = snap.size;
    });

    // B. Today's Visits
    const todayQuery = query(collection(db, "analytics"), where("timestamp", ">=", startOfToday));
    onSnapshot(todayQuery, (snap) => {
        document.getElementById("today-visits").innerText = snap.size;
    });

    // C. Active Now
    const activeQuery = query(collection(db, "analytics"), where("timestamp", ">=", activeThreshold));
    onSnapshot(activeQuery, (snap) => {
        document.getElementById("active-users").innerText = snap.size;
    });

    // D. Global Map Markers
    onSnapshot(collection(db, "users_list"), (snap) => {
        snap.forEach(docSnap => {
            const u = docSnap.data();
            if (u.lat && u.lng) {
                L.marker([u.lat, u.lng]).addTo(userMap)
                    .bindPopup(`<b>${u.name}</b><br>${u.city || 'Global User'}`);
            }
        });
    });
}

// --- 4. USER LOYALTY & INSIGHTS ---
async function loadUsers() {
    const table = document.getElementById("user-list-table");
    const q = query(collection(db, "users_list"), orderBy("lastSeen", "desc"), limit(50));
    
    onSnapshot(q, (snap) => {
        table.innerHTML = "";
        snap.forEach(docSnap => {
            const u = docSnap.data();
            const visits = u.visitCount || 1;
            const lastActive = u.lastSeen ? new Date(u.lastSeen).toLocaleTimeString() : "N/A";
            
            // Professional Loyalty Badges
            let statusBadge = visits > 10 ? `<span class="badge-vip">👑 VIP</span>` : 
                             (visits > 3 ? `<span class="badge-loyal">⭐ Loyal</span>` : "🆕 New");

            table.innerHTML += `
                <tr>
                    <td><b>${u.name}</b> ${statusBadge}</td>
                    <td>${u.email}</td>
                    <td>${u.city || 'Global'}</td>
                    <td><b>${visits}</b></td>
                    <td>${lastActive}</td>
                </tr>`;
        });
    });
}

// --- 5. PENDING INTELLIGENCE REVIEW ---
async function loadPending() {
    onSnapshot(collection(db, "temp_learning"), (snap) => {
        container.innerHTML = snap.empty ? "Sab approved hai! ✅" : "";
        snap.forEach(docSnap => {
            const data = docSnap.data();
            const id = docSnap.id;
            const div = document.createElement("div");
            div.className = "pending-card";
            div.innerHTML = `
                <p><b>User Asked:</b> ${data.question}</p>
                <input type="text" value="${data.answer}" id="inp-${id}" class="a-input" placeholder="Update Answer...">
                <div class="btn-group">
                    <button class="btn-approve" onclick="window.approveLearned('${id}', '${data.question}')">Approve & Sync ✅</button>
                    <button class="btn-reject" onclick="window.deleteLearned('${id}')">Discard ❌</button>
                </div>`;
            container.appendChild(div);
        });
    });
}

// Global Action Methods
window.approveLearned = async (id, q) => {
    const ans = document.getElementById(`inp-${id}`).value;
    if(!ans) return alert("Answer cannot be empty!");
    
    await addDoc(collection(db, "brain"), { 
        question: q.toLowerCase(), 
        answers: [ans], 
        hitCount: 1, 
        timestamp: serverTimestamp() 
    });
    await deleteDoc(doc(db, "temp_learning", id));
};

window.deleteLearned = async (id) => {
    if(confirm("Reject this learning?")) {
        await deleteDoc(doc(db, "temp_learning", id));
    }
};

async function loadAllData() {
    await loadPending();
    await loadTrending();
    await loadUsers();
}

// Mass Intelligence Upload Logic
window.massUpload = async () => {
    const rawData = document.getElementById("bulkData").value.trim();
    if(!rawData) return alert("Pehle data toh daalo! 📝");
    
    const lines = rawData.split("\n");
    let count = 0;
    for (let line of lines) {
        const [q, a] = line.split("|");
        if(q && a) {
            await addDoc(collection(db, "brain"), {
                question: q.trim().toLowerCase(),
                answers: [a.trim()],
                hitCount: 0,
                timestamp: serverTimestamp()
            });
            count++;
        }
    }
    alert(`${count} questions successfully synced to brain! 🚀`);
    document.getElementById("bulkData").value = "";
};

window.loadTrending = async () => {
    const table = document.getElementById("trending-table");
    onSnapshot(query(collection(db, "brain"), orderBy("hitCount", "desc"), limit(10)), (snap) => {
        table.innerHTML = "";
        snap.forEach(d => {
            const data = d.data();
            table.innerHTML += `
                <tr>
                    <td>${data.question}</td>
                    <td>${data.hitCount || 0}</td>
                    <td><button onclick="window.deleteBrainDoc('${d.id}')" style="background:var(--danger); color:white; border:none; padding:5px 10px; border-radius:5px; cursor:pointer;">Delete</button></td>
                </tr>`;
        });
    });
};

window.deleteBrainDoc = async (id) => {
    if(confirm("Permanent delete from brain?")) {
        await deleteDoc(doc(db, "brain", id));
    }
};
