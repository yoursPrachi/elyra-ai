import { db } from "./firebase.js";
import { collection, getDocs, deleteDoc, doc, addDoc, updateDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

const pendingTable = document.getElementById("pending-table");

// --- Data Fetch Karein ---
async function loadPendingData() {
    pendingTable.innerHTML = "<tr><td colspan='4'>Loading...</td></tr>";
    const querySnapshot = await getDocs(collection(db, "temp_learning"));
    pendingTable.innerHTML = "";

    querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${data.question}</td>
            <td><input type="text" value="${data.answer}" id="ans-${docSnap.id}"></td>
            <td><span class="badge">${data.count || 1} users</span></td>
            <td>
                <button class="btn btn-approve" onclick="approveAns('${docSnap.id}', '${data.question}')">Approve</button>
                <button class="btn btn-delete" onclick="deleteAns('${docSnap.id}')">Delete</button>
            </td>
        `;
        pendingTable.appendChild(row);
    });
}

// --- Approve Function (Brain mein move karein) ---
window.approveAns = async (id, question) => {
    const newAns = document.getElementById(`ans-${id}`).value;
    try {
        // 1. Brain mein add karein
        await addDoc(collection(db, "brain"), {
            question: question,
            answer: newAns.toLowerCase().trim(),
            type: "approved",
            time: serverTimestamp()
        });
        // 2. Temp se delete karein
        await deleteDoc(doc(db, "temp_learning", id));
        alert("Approved and added to Brain!");
        loadPendingData();
    } catch (e) { alert("Error: " + e); }
};

// --- Delete Function ---
window.deleteAns = async (id) => {
    if(confirm("Are you sure?")) {
        await deleteDoc(doc(db, "temp_learning", id));
        loadPendingData();
    }
};

// Initial Load
loadPendingData();
