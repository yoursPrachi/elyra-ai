import { db } from "./firebase.js"; 
import { 
    collection, addDoc, getDocs, deleteDoc, doc, updateDoc, 
    serverTimestamp, query, orderBy, limit, where, onSnapshot 
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

// --- 1. CONFIGURATION ---
const MASTER_PASSWORD = "apna_secret_pass"; // 👈 Yahan apna password likhein
let userMap;
const container = document.getElementById("review-container");

// --- 2. SECURE LOGIN LOGIC (Global Scope Fix) ---
window.checkAuth = () => {
    const passInput = document.getElementById("admin-pass").value;
    console.log("Login attempt..."); // Debugging ke liye

    if (passInput === MASTER_PASSWORD) {
        // Success: Storage mein save karein aur UI badlein
        sessionStorage.setItem("isAdmin", "true");
        
        // Manual style override taaki stuck na ho
        document.getElementById("admin-login").style.display = "none";
        document.getElementById("dashboard-content").style.display = "block";
        document.getElementById("dashboard-content").classList.remove("hidden");
        
        initDashboard(); 
        console.log("Admin Access Granted! ✅");
    } else {
        alert("Ghalat Password! ❌");
    }
};

// Auto-Login check (Page refresh par)
window.addEventListener('DOMContentLoaded', () => {
    if (sessionStorage.getItem("isAdmin") === "true") {
        document.getElementById("admin-login").style.display = "none";
        document.getElementById("dashboard-content").style.display = "block";
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
}

// --- 4. GLOBAL MAP (Leaflet) ---
function initMap() {
    if (!userMap) {
        userMap = L.map('map').setView([20, 0], 2);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© Elyra AI'
        }).addTo(userMap);
    }
}

// --- 5. REAL-TIME STATS & ANALYTICS ---
function trackLiveStats() {
    const now = new Date();
    const startOfToday = new Date(now.setHours(0,0,0,0));
    const activeThreshold = new Date(Date.now() - 5 * 60000); // 5 Mins

    // Lifetime Visits Count
    onSnapshot(collection(db, "analytics"), (snap) => {
        document.getElementById("total-visits").innerText = snap.size;
    });

    // Today's Visits
    const todayQ = query(collection(db, "analytics"), where("timestamp", ">=", startOfToday));
    onSnapshot(todayQ, (snap) => {
        document.getElementById("today-visits").innerText = snap.size;
    });

    // Active Now Count
    const activeQ = query(collection(db, "analytics"), where("timestamp", ">=", activeThreshold));
    onSnapshot(activeQ, (snap) => {
        document.getElementById("active-users").innerText = snap.size;
    });

    // Users on Map Markers
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

// --- 7. LEARNING APPROVALS ---
async function loadPending() {
    onSnapshot(collection(db, "temp_learning"), (snap) => {
        container.innerHTML = snap.empty ? "Sab approved hai! ✅" : "";
        snap.forEach(docSnap => {
            const data = docSnap.data();
            const id = docSnap.id;
            const div = document.createElement("div");
            div.className = "card";
            div.style.marginBottom = "10px";
            div.innerHTML = `
                <p><b>User Asked:</b> ${data.question}</p>
                <div style="display:flex; gap:10px;">
                    <button onclick="window.deleteLearned('${id}')" style="background:var(--danger); color:white; border:none; padding:8px; border-radius:5px; flex:1; cursor:pointer;">Discard ❌</button>
                </div>`;
            container.appendChild(div);
        });
    });
}

window.deleteLearned = async (id) => {
    if(confirm("Discard this learning?")) await deleteDoc(doc(db, "temp_learning", id));
};
