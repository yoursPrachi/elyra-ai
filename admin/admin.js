import { db } from "./firebase.js"; 
import { 
    collection, addDoc, getDocs, deleteDoc, doc, updateDoc, 
    serverTimestamp, query, orderBy, limit, where, onSnapshot 
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

// --- 1. CONFIGURATION ---
const MASTER_PASSWORD = "apna_secret_pass"; // 👈 Yahan apna password rakhein
let userMap;
const container = document.getElementById("review-container");

// --- 2. LOGIN LOGIC (Global Scope Fix) ---
window.checkAuth = () => {
    const passInput = document.getElementById("admin-pass").value;
    
    if (passInput === MASTER_PASSWORD) {
        sessionStorage.setItem("isAdmin", "true");
        document.getElementById("admin-login").style.display = "none";
        document.getElementById("dashboard-content").classList.remove("hidden");
        initDashboard();
        console.log("Admin Verified ✅");
    } else {
        alert("Ghalat Password! ❌");
    }
};

// Page refresh hone par auto-login check
window.addEventListener('DOMContentLoaded', () => {
    if (sessionStorage.getItem("isAdmin") === "true") {
        document.getElementById("admin-login").style.display = "none";
        document.getElementById("dashboard-content").classList.remove("hidden");
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
    const activeThreshold = new Date(Date.now() - 5 * 60000); // 5 Mins

    // Total Visits
    onSnapshot(collection(db, "analytics"), (snap) => {
        document.getElementById("total-visits").innerText = snap.size;
    });

    // Today's Visits
    const todayQ = query(collection(db, "analytics"), where("timestamp", ">=", startOfToday));
    onSnapshot(todayQ, (snap) => {
        document.getElementById("today-visits").innerText = snap.size;
    });

    // Active Now
    const activeQ = query(collection(db, "analytics"), where("timestamp", ">=", activeThreshold));
    onSnapshot(activeQ, (snap) => {
        document.getElementById("active-users").innerText = snap.size;
    });

    // Real-time Map Markers
    onSnapshot(collection(db, "users_list"), (snap) => {
        snap.forEach(docSnap => {
            const u = docSnap.data();
            if (u.lat && u.lng) {
                L.marker([u.lat, u.lng]).addTo(userMap)
                    .bindPopup(`<b>${u.name}</b><br>${u.city || 'Unknown'}`);
            }
        });
    });
}

// --- 6. USER LIST & LOYALTY ---
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

// --- 7. PENDING REVIEWS ---
async function loadPending() {
    onSnapshot(collection(db, "temp_learning"), (snap) => {
        container.innerHTML = snap.empty ? "Sab clear hai! ✅" : "";
        snap.forEach(docSnap => {
            const data = docSnap.data();
            const id = docSnap.id;
            const div = document.createElement("div");
            div.style.borderLeft = "5px solid var(--primary)";
            div.style.padding = "10px";
            div.style.marginBottom = "10px";
            div.style.background = "#f9f9f9";
            div.innerHTML = `
                <p><b>Q:</b> ${data.question}</p>
                <input type="text" value="${data.answer}" id="inp-${id}" style="width:100%; padding:8px; margin-bottom:10px;">
                <div style="display:flex; gap:10px;">
                    <button onclick="window.approveLearned('${id}', '${data.question}')" style="background:var(--secondary); color:white; border:none; padding:8px; flex:1; cursor:pointer;">Approve</button>
                    <button onclick="window.deleteLearned('${id}')" style="background:var(--danger); color:white; border:none; padding:8px; flex:1; cursor:pointer;">Reject</button>
                </div>`;
            container.appendChild(div);
        });
    });
}

// Global Actions for Table/Reviews
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

// Mass Upload
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
    alert("Braing Synced! 🚀");
    document.getElementById("bulkData").value = "";
};

// Placeholder for Trending
function loadTrending() { console.log("Trending questions active."); }
