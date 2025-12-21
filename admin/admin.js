import { db } from "./firebase.js"; 
import { 
    collection, query, where, onSnapshot, orderBy, limit 
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

let userMap;

// Dashboard initialization
window.addEventListener('DOMContentLoaded', () => {
    initMap();
    trackLiveStats();
    loadUsers();
    console.log("Admin Dashboard Active ✅");
});

// 1. Map Initialization
function initMap() {
    if (!userMap) {
        userMap = L.map('map').setView([20, 0], 2);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(userMap);
    }
}

// 2. Real-time Counters & Map Markers
function trackLiveStats() {
    const startOfToday = new Date();
    startOfToday.setHours(0,0,0,0);
    const activeThreshold = new Date(Date.now() - 5 * 60000); 

    // Lifetime Visits
    onSnapshot(collection(db, "analytics"), (snap) => {
        const el = document.getElementById("total-visits");
        if(el) el.innerText = snap.size;
    });

    // Today's Visits
    const todayQ = query(collection(db, "analytics"), where("timestamp", ">=", startOfToday));
    onSnapshot(todayQ, (snap) => {
        const el = document.getElementById("today-visits");
        if(el) el.innerText = snap.size;
    });

    // Active Now
    const activeQ = query(collection(db, "analytics"), where("timestamp", ">=", activeThreshold));
    onSnapshot(activeQ, (snap) => {
        const el = document.getElementById("active-users");
        if(el) el.innerText = snap.size;
    });

    // Update markers on Map
    onSnapshot(collection(db, "users_list"), (snap) => {
        snap.forEach(docSnap => {
            const u = docSnap.data();
            if (u.lat && u.lng) {
                L.marker([u.lat, u.lng]).addTo(userMap).bindPopup(u.name);
            }
        });
    });
}

// 3. User Table Data
function loadUsers() {
    const table = document.getElementById("user-list-table");
    const q = query(collection(db, "users_list"), orderBy("lastSeen", "desc"), limit(20));
    
    onSnapshot(q, (snap) => {
        if(!table) return;
        table.innerHTML = "";
        snap.forEach(d => {
            const u = d.data();
            const visits = u.visitCount || 1;
            const badge = visits > 10 ? '<span class="badge-vip">👑 VIP</span>' : '';
            const lastTime = u.lastSeen ? new Date(u.lastSeen).toLocaleTimeString() : 'N/A';
            
            table.innerHTML += `<tr>
                <td>${u.name} ${badge}</td>
                <td>${u.email}</td>
                <td>${u.city || 'Global'}</td>
                <td>${visits}</td>
                <td>${lastTime}</td>
            </tr>`;
        });
    });
}
