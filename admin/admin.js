window.massUpload = async () => {
    const data = document.getElementById("bulkData").value.trim();
    if (!data) return alert("Pehle data toh daalo!");

    const lines = data.split("\n");
    const batch = [];
    
    try {
        for (let line of lines) {
            const [q, a] = line.split("|");
            if (q && a) {
                // 'brain' collection mein seedha data jayega
                batch.push(addDoc(collection(db, "brain"), {
                    question: q.trim().toLowerCase(),
                    answers: [a.trim()], // Array format for smart variations
                    timestamp: serverTimestamp(),
                    status: "approved"
                }));
            }
        }
        await Promise.all(batch);
        alert("Success! 🚀 Saare sawal Brain mein chale gaye.");
        document.getElementById("bulkData").value = "";
    } catch (e) {
        alert("Upload fail: " + e.message);
    }
};
