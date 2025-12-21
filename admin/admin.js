import { db } from "./firebase.js"; 
import { 
    collection, query, where, onSnapshot, orderBy, limit 
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

let userMap;

// Dashboard initialization
window.addEventListener('load', () => {
    initMap();
    trackLiveStats();
    loadUsers();
    console.log("Dashboard Loaded Successfully ✅");
});

// 1. Initialize Global Map
function initMap() {
    if (!userMap) {
        userMap = L.map('map').setView([20, 0], 2);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© Elyra AI'
        }).addTo(userMap);
    }
}

// 2. Real-time Analytics & Counters
function trackLiveStats() {
    const startOfToday = new Date();
    startOfToday.setHours(0,0,0,0);
    const activeThreshold = new Date(Date.now() - 5 * 60000); // Last 5 mins

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

    // Update Map Markers
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

// 3. User Table with Loyalty Badges
function loadUsers() {
    const table = document.getElementById("user-list-table");
    const q = query(collection(db, "users_list"), orderBy("lastSeen", "desc"), limit(30));
    
    onSnapshot(q, (snap) => {
        table.innerHTML = "";
        if(snap.empty) {
            table.innerHTML = "<tr><td colspan='5' style='text-align:center;'>No users found.</td></tr>";
            return;
        }
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
