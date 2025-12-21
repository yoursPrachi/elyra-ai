import { db } from "./firebase.js"; 
import { 
    collection, query, where, onSnapshot, orderBy, limit 
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

let userMap;

// Dashboard initialization
function initDashboard() {
    initMap();
    trackLiveStats();
    loadUsers();
}

// 1. Map Setup
function initMap() {
    if (!userMap) {
        userMap = L.map('map').setView([20, 0], 2);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(userMap);
    }
}

// 2. Real-time Analytics
function trackLiveStats() {
    const startOfToday = new Date();
    startOfToday.setHours(0,0,0,0);
    const activeThreshold = new Date(Date.now() - 5 * 60000); 

    onSnapshot(collection(db, "analytics"), (snap) => {
        document.getElementById("total-visits").innerText = snap.size;
    });

    const todayQ = query(collection(db, "analytics"), where("timestamp", ">=", startOfToday));
    onSnapshot(todayQ, (snap) => {
        document.getElementById("today-visits").innerText = snap.size;
    });

    const activeQ = query(collection(db, "analytics"), where("timestamp", ">=", activeThreshold));
    onSnapshot(activeQ, (snap) => {
        document.getElementById("active-users").innerText = snap.size;
    });

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
            table.innerHTML += `<tr>
                <td>${u.name}</td>
                <td>${u.email}</td>
                <td>${u.visitCount || 1}</td>
                <td>${u.lastSeen ? new Date(u.lastSeen).toLocaleTimeString() : 'N/A'}</td>
            </tr>`;
        });
    });
}

// Start everything
window.addEventListener('load', initDashboard);
