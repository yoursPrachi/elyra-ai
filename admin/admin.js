import { db } from "./firebase.js"; 
import { 
    collection, query, where, onSnapshot, orderBy, limit 
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

// Page Load Hote Hi Dashboard Initialize Karein
window.addEventListener('DOMContentLoaded', () => {
    initDashboard();
});

function initDashboard() {
    trackLiveStats();
    loadUsers();
    loadBrainData();
}

// 1. LIVE ANALYTICS (Analytics Collection Se)
function trackLiveStats() {
    // A. Total Lifetime Visits
    onSnapshot(collection(db, "analytics"), (snap) => {
        const totalVisits = snap.size;
        document.getElementById("total-visits").innerText = totalVisits;
    });

    // B. Today's Visits (Simplest Logic: Fetch all and count if date matches)
    onSnapshot(collection(db, "analytics"), (snap) => {
        let todayCount = 0;
        const todayStr = new Date().toDateString();
        
        snap.forEach(doc => {
            const data = doc.data();
            // Agar timestamp field hai toh use check karein
            if (data.timestamp) {
                const docDate = data.timestamp.toDate ? data.timestamp.toDate().toDateString() : new Date(data.timestamp).toDateString();
                if (docDate === todayStr) todayCount++;
            }
        });
        document.getElementById("today-visits").innerText = todayCount;
    });

    // C. Active Now (Last 10 Analytics docs ko active maan rahe hain)
    const activeQ = query(collection(db, "analytics"), limit(10));
    onSnapshot(activeQ, (snap) => {
        document.getElementById("active-users").innerText = snap.size;
    });
}

// 2. USER LIST (users_list Collection Se)
function loadUsers() {
    const table = document.getElementById("user-list-table");
    // Snapshot bina kisi order ke rakhte hain taaki error na aaye
    onSnapshot(collection(db, "users_list"), (snap) => {
        if (!table) return;
        table.innerHTML = "";
        
        if (snap.empty) {
            table.innerHTML = "<tr><td colspan='5' style='text-align:center;'>No users found in Firebase.</td></tr>";
            return;
        }

        snap.forEach(docSnap => {
            const u = docSnap.data();
            const visits = u.visitCount || 1;
            const badge = visits > 5 ? `<span class="badge-loyal">⭐ Loyal</span>` : "🆕 New";
            
            table.innerHTML += `
                <tr>
                    <td><b>${u.name || 'Unknown'}</b> ${badge}</td>
                    <td>${u.email || 'N/A'}</td>
                    <td>${u.city || 'Global'}</td>
                    <td>${visits}</td>
                    <td>${u.lastSeen ? new Date(u.lastSeen).toLocaleTimeString() : 'Recent'}</td>
                </tr>`;
        });
    });
}

// 3. BRAIN DATA (Optional: Trending sawal dekhne ke liye)
function loadBrainData() {
    const container = document.getElementById("review-container");
    onSnapshot(collection(db, "temp_learning"), (snap) => {
        if (!container) return;
        container.innerHTML = snap.empty ? "Sab approved hai! ✅" : "";
        // Content load karein...
    });
}
