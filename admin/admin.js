async function loadQueue() {
  const list = document.getElementById("queue-list");
  try {
    // Simple query bina kisi extra configuration ke
    const querySnapshot = await getDocs(collection(db, "learningQueue"));
    
    list.innerHTML = "";
    let count = 0;

    if (querySnapshot.empty) {
      list.innerHTML = "<p style='text-align:center; color:#8696a0;'>No new questions yet! Bot is doing great. ✨</p>";
      return;
    }

    querySnapshot.forEach((doc) => {
      count++;
      const data = doc.data();
      const card = document.createElement("div");
      card.className = "card";
      card.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center;">
           <p style="margin:0;"><strong>User Asked:</strong> "${data.question}"</p>
           <span style="background:#25d366; color:#0b141a; padding:2px 8px; border-radius:10px; font-size:11px; font-weight:bold;">
             ${data.count || 1} Times
           </span>
        </div>
        <div style="margin-top:12px; display:flex; gap:10px;">
           <button class="btn-train" onclick="trainBot('${doc.id}', '${data.question}')">✅ Train Bot</button>
           <button class="btn-ignore" onclick="ignoreQuestion('${doc.id}')" style="background:#ea0038;">🗑️ Delete</button>
        </div>
      `;
      list.appendChild(card);
    });

    console.log(`Successfully loaded ${count} items.`);
  } catch (error) {
    console.error("Critical Fetch Error:", error);
    list.innerHTML = `<p style='color:#ff5e5e;'>Error: ${error.message}</p>`;
  }
}
