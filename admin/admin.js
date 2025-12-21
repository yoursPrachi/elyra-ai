import { db } from "./firebase.js"; 
import { 
    collection, addDoc, getDocs, deleteDoc, doc, updateDoc, 
    serverTimestamp, query, orderBy, limit, where, onSnapshot 
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

// --- 1. CONFIG ---
const MASTER_PASSWORD = "apna_secret_pass"; 
let userMap;

// --- 2. LOGIN LOGIC (Super-Fixed) ---
window.checkAuth = () => {
    const passInput = document.getElementById("admin-pass").value;
    console.log("Login attempt with:", passInput); // Console mein check karein

    if (passInput === MASTER_PASSWORD) {
        sessionStorage.setItem("isAdmin", "true");
        // Manual CSS override agar hidden class kaam na kare
        document.getElementById("admin-login").style.display = "none";
        document.getElementById("dashboard-content").style.display = "block";
        document.getElementById("dashboard-content").classList.remove("hidden");
        
        initDashboard();
        alert("Login Successful! ✅");
    } else {
        alert("Ghalat Password! ❌");
    }
};

// Auto-Login check
window.addEventListener('load', () => {
    if (sessionStorage.getItem("isAdmin") === "true") {
        document.getElementById("admin-login").style.display = "none";
        document.getElementById("dashboard-content").style.display = "block";
        document.getElementById("dashboard-content").classList.remove("hidden");
        initDashboard();
    }
});

// --- 3. DASHBOARD INIT ---
function initDashboard() {
    console.log("Dashboard initializing...");
    try {
        initMap();
        trackLiveStats();
        loadUsers();
        loadPending();
    } catch (err) {
        console.error("Dashboard Error:", err);
    }
}

// --- 4. DATA LOGIC (Real-time) ---
function trackLiveStats() {
    // Analytics Tracker
    onSnapshot(collection(db, "analytics"), (snap) => {
        document.getElementById("total-visits").innerText = snap.size;
    }, (err) => console.error("Firestore Permission Error:", err));

    // Today's Visits
    const startOfToday = new Date();
    startOfToday.setHours(0,0,0,0);
    const todayQ = query(collection(db, "analytics"), where("timestamp", ">=", startOfToday));
    onSnapshot(todayQ, (snap) => {
        document.getElementById("today-visits").innerText = snap.size;
    });
}

// Map, Users, aur baaki functions niche same rahenge...
function initMap() {
    if (!userMap) {
        userMap = L.map('map').setView([20, 0], 2);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(userMap);
    }
}

async function loadUsers() {
    const table = document.getElementById("user-list-table");
    const q = query(collection(db, "users_list"), orderBy("lastSeen", "desc"), limit(50));
    onSnapshot(q, (snap) => {
        table.innerHTML = "";
        snap.forEach(d => {
            const u = d.data();
            table.innerHTML += `<tr><td>${u.name}</td><td>${u.email}</td><td>${u.city || 'Global'}</td><td>${u.visitCount || 1}</td><td>${u.lastSeen ? new Date(u.lastSeen).toLocaleTimeString() : 'N/A'}</td></tr>`;
        });
    });
}

async function loadPending() {
    const container = document.getElementById("review-container");
    onSnapshot(collection(db, "temp_learning"), (snap) => {
        container.innerHTML = snap.empty ? "Sab clear hai! ✅" : "";
        snap.forEach(d => {
            const data = d.data();
            container.innerHTML += `<div style="background:#fff; padding:10px; margin-bottom:10px; border-radius:8px; border-left:5px solid #075e54;">
                <p>Q: ${data.question}</p>
                <button onclick="window.deleteLearned('${d.id}')" style="background:red; color:white; border:none; padding:5px; border-radius:4px; cursor:pointer;">Discard</button>
            </div>`;
        });
    });
}

window.deleteLearned = async (id) => {
    await deleteDoc(doc(db, "temp_learning", id));
};
