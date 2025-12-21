import { db } from "./firebase.js"; 
import { 
    collection, addDoc, getDocs, deleteDoc, doc, updateDoc, 
    serverTimestamp, query, orderBy, limit, where, onSnapshot 
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

// --- 1. INITIALIZATION ---
window.addEventListener('DOMContentLoaded', () => {
    initDashboard();
});

function initDashboard() {
    trackLiveStats();   
    loadUsers();        
    loadBrainData();    
    loadPending(); // 👈 New: Approval System load karein
}

// --- 2. REAL-TIME STATS (Active, Today, Total) ---
function trackLiveStats() {
    const now = new Date();
    const startOfToday = new Date(now.setHours(0,0,0,0));
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
}

// --- 3. APPROVAL SYSTEM (temp_learning Collection) ---
function loadPending() {
    const container = document.getElementById("review-container");
    
    // Real-time listener for user-taught questions
    onSnapshot(collection(db, "temp_learning"), (snap) => {
        if (!container) return;
        
        if (snap.empty) {
            container.innerHTML = "<p style='text-align:center; padding:20px; color:#666;'>Sab approved hai! Naye sawal ka intezar karein.. 🕊️</p>";
            return;
        }

        container.innerHTML = ""; 
        snap.forEach(docSnap => {
            const data = docSnap.data();
            const id = docSnap.id;

            const card = document.createElement("div");
            card.className = "card";
            card.style = "border-left: 5px solid #f1c40f; margin-bottom: 15px; padding: 15px; background: #fff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);";
            
            card.innerHTML = `
                <div style="margin-bottom: 10px;">
                    <p style="font-size: 11px; color: #888; text-transform: uppercase; font-weight: bold;">User Taught: ${data.learnedFrom || 'Dost'}</p>
                    <p style="margin: 5px 0;"><b>Q:</b> ${data.question}</p>
                    <p style="margin: 5px 0;"><b>A:</b> <span style="color:#075e54">${data.answer}</span></p>
                </div>
                <div style="display: flex; gap: 10px;">
                    <button onclick="window.approveKnowledge('${id}')" style="background:#27ae60; color:white; border:none; padding:8px; border-radius:5px; flex:1; cursor:pointer; font-weight:bold;">Approve ✅</button>
                    <button onclick="window.rejectKnowledge('${id}')" style="background:#e74c3c; color:white; border:none; padding:8px; border-radius:5px; flex:1; cursor:pointer; font-weight:bold;">Reject ❌</button>
                </div>
            `;
            container.appendChild(card);
        });
    });
}

// --- 4. ACTION LOGIC: APPROVE & REJECT ---
window.approveKnowledge = async (id) => {
    try {
        // 1. Find the specific document in temp_learning
        const snap = await getDocs(collection(db, "temp_learning"));
        let targetData = null;
        snap.forEach(d => { if(d.id === id) targetData = d.data(); });

        if (targetData) {
            // 2. Add to permanent brain
            await addDoc(collection(db, "brain"), {
                question: targetData.question.toLowerCase().trim(),
                answers: [targetData.answer.trim()],
                hitCount: 1,
                timestamp: serverTimestamp()
            });

            // 3. Delete from temp collection
            await deleteDoc(doc(db, "temp_learning", id));
            alert("Approval Successful! Bot ab iska jawab dega. ✨");
        }
    } catch (e) { console.error("Error approving:", e); }
};

window.rejectKnowledge = async (id) => {
    if (confirm("Kya aap is galat data ko delete karna chahte hain?")) {
        try {
            await deleteDoc(doc(db, "temp_learning", id));
            alert("Rejected and Deleted. 🗑️");
        } catch (e) { console.error("Error rejecting:", e); }
    }
};

// --- 5. MOST ASKED QUESTIONS & UPDATE LOGIC ---
function loadBrainData() {
    const table = document.getElementById("trending-table");
    const q = query(collection(db, "brain"), orderBy("hitCount", "desc"), limit(10));
    
    onSnapshot(q, (snap) => {
        if (!table) return;
        table.innerHTML = "";
        snap.forEach(d => {
            const data = d.data();
            const id = d.id;
            const answers = data.answers ? data.answers.join(", ") : "No Answer";
            
            table.innerHTML += `
                <tr>
                    <td><b>${data.question}</b></td>
                    <td><input type="text" value="${answers}" id="ans-${id}" style="width:100%; padding:5px; border:1px solid #ddd; border-radius:4px;"></td>
                    <td style="text-align:center;">${data.hitCount || 0}</td>
                    <td>
                        <div style="display:flex; gap:5px;">
                            <button onclick="window.updateAnswer('${id}')" style="background:#3498db; color:white; border:none; padding:5px 10px; border-radius:4px; cursor:pointer;">Update</button>
                            <button onclick="window.deleteBrainDoc('${id}')" style="background:#e74c3c; color:white; border:none; padding:5px 10px; border-radius:4px; cursor:pointer;">🗑️</button>
                        </div>
                    </td>
                </tr>`;
        });
    });
}

window.updateAnswer = async (id) => {
    const newAns = document.getElementById(`ans-${id}`).value;
    if(!newAns) return alert("Answer khali nahi ho sakta!");
    try {
        await updateDoc(doc(db, "brain", id), {
            answers: [newAns.trim()],
            timestamp: serverTimestamp()
        });
        alert("Bot ka knowledge update ho gaya! 🧠");
    } catch (e) { console.error(e); }
};

// --- 6. ALL TIME USER DATA ---
function loadUsers() {
    const table = document.getElementById("user-list-table");
    const q = query(collection(db, "users_list"), orderBy("visitCount", "desc"));

    onSnapshot(q, (snap) => {
        if (!table) return;
        table.innerHTML = "";
        snap.forEach(docSnap => {
            const u = docSnap.data();
            table.innerHTML += `
                <tr>
                    <td>${u.name || 'Anonymous'}</td>
                    <td>${u.email || 'N/A'}</td>
                    <td>${u.city || 'Global'}</td>
                    <td><b>${u.visitCount || 1}</b></td>
                    <td>${u.lastSeen ? new Date(u.lastSeen).toLocaleDateString() : 'N/A'}</td>
                </tr>`;
        });
    });
}

window.deleteBrainDoc = async (id) => {
    if(confirm("Permanent delete from brain?")) {
        await deleteDoc(doc(db, "brain", id));
    }
};
