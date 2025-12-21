import { db } from "./firebase.js"; 
import { 
    collection, query, where, onSnapshot, orderBy, limit 
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

const MASTER_PASSWORD = "1234"; // 👈 Apna password yahan set karein
let userMap;

// --- LOGIN LOGIC (Global Scope Fix) ---
window.checkAuth = () => {
    const passInput = document.getElementById("admin-pass").value;
    const loginScreen = document.getElementById("admin-login");
    const dashboard = document.getElementById("dashboard-content");

    if (passInput === MASTER_PASSWORD) {
        sessionStorage.setItem("isAdmin", "true");
        // Forcefully switch views
        loginScreen.style.setProperty("display", "none", "important");
        dashboard.classList.remove("hidden");
        dashboard.style.display = "block";
        initDashboard();
    } else {
        alert("Incorrect Password! ❌");
    }
};

// Check login status on page refresh
window.addEventListener('load', () => {
    if (sessionStorage.getItem("isAdmin") === "true") {
        document.getElementById("admin-login").style.display = "none";
        document.getElementById("dashboard-content").classList.remove("hidden");
        document.getElementById("dashboard-content").style.display = "block";
        initDashboard();
    }
});

function initDashboard() {
    initMap();
    trackLiveStats();
    loadUsers();
}

// --- MAP & STATS ---
function initMap() {
    if (!userMap) {
        userMap = L.map('map').setView([20, 0], 2);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(userMap);
    }
}

function trackLiveStats() {
    const startOfToday = new Date();
    startOfToday.setHours(0,0,0,0);
    const activeThreshold = new Date(Date.now() - 5 * 60000);

    // Lifetime Visits
    onSnapshot(collection(db, "analytics"), (snap) => {
        document.getElementById("total-visits").innerText = snap.size;
    });

    // Today's Visits
    const todayQ = query(collection(db, "analytics"), where("timestamp", ">=", startOfToday));
    onSnapshot(todayQ, (snap) => {
        document.getElementById("today-visits").innerText = snap.size;
    });

    // Active Now (Real-time)
    const activeQ = query(collection(db, "analytics"), where("timestamp", ">=", activeThreshold));
    onSnapshot(activeQ, (snap) => {
        document.getElementById("active-users").innerText = snap.size;
    });

    // Markers on Map
    onSnapshot(collection(db, "users_list"), (snap) => {
        snap.forEach(docSnap => {
            const u = docSnap.data();
            if (u.lat && u.lng) {
                L.marker([u.lat, u.lng]).addTo(userMap).bindPopup(u.name);
            }
        });
    });
}

function loadUsers() {
    const table = document.getElementById("user-list-table");
    const q = query(collection(db, "users_list"), orderBy("lastSeen", "desc"), limit(20));
    onSnapshot(q, (snap) => {
        table.innerHTML = "";
        snap.forEach(d => {
            const u = d.data();
            const visits = u.visitCount || 1;
            const badge = visits > 10 ? '<span class="badge-vip">👑 VIP</span>' : '';
            table.innerHTML += `<tr>
                <td>${u.name} ${badge}</td>
                <td>${u.email}</td>
                <td>${visits}</td>
                <td>${u.lastSeen ? new Date(u.lastSeen).toLocaleTimeString() : 'N/A'}</td>
            </tr>`;
        });
    });
}
