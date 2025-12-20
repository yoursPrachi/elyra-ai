// --- Conversational Starters ---
const conversationStarters = [
    "Wese, tumhari pasandida movie kaunsi hai? ✨",
    "Chalo ye batao, aaj ka din kaisa guzra? 😊",
    "Tumhe music sunna pasand hai? Main toh hamesha sunti hoon! 🎵",
    "Mera dimaag toh digital hai, par tumhara dimaag kya soch raha hai? 😂"
];

// --- UI Message Function (Time and Ticks outside text) ---
function addMsg(text, cls) {
    const d = document.createElement("div");
    d.className = `msg ${cls}`;
    
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const ticks = cls === 'user' ? '<span class="ticks">✓✓</span>' : '';

    // Message Content aur Time alag-alag div mein
    d.innerHTML = `
        <div class="msg-content">${text}</div>
        <div class="time">${timeStr} ${ticks}</div>
    `;

    chat.appendChild(d);
    scrollToBottom();
}


// --- MAIN SEND FUNCTION ---
window.send = async () => {
    const text = input.value.trim();
    if (!text) return;

    input.value = "";
    addMsg(text, "user");

    // FIX: Pehle check karo ki kya hum seekh rahe hain?
    if (isLearning) {
        typing.classList.remove("hidden");
        
        // 1. Background mein answer save karein
        await saveLearnedAnswer(pendingQuestion, text);
        
        // 2. Bot ka smart reaction
        setTimeout(() => {
            typing.classList.add("hidden");
            const nextTopic = conversationStarters[Math.floor(Math.random() * conversationStarters.length)];
            
            // Yahan bot react karega
            addMsg(`Wah! Ye toh bahut sahi jawab hai. Maine yaad kar liya! 😍\n\n${nextTopic}`, "bot");
            
            // Reset states
            isLearning = false;
            pendingQuestion = "";
        }, 1200);
        return; // Yahan se exit ho jao taaki search logic na chale
    }

    // --- AGAR NORMAL CHAT HAI TO SEARCH KAREIN ---
    typing.classList.remove("hidden");
    try {
        const botReply = await getSmartReply(text);
        
        setTimeout(() => {
            typing.classList.add("hidden");
            
            if (typeof botReply === "object" && botReply !== null) {
                // Jab bot ko jawab nahi pata toh Learning Mode ON
                isLearning = true;
                pendingQuestion = botReply.question;
                addMsg(botReply.msg, "bot");
            } else {
                // Normal reply
                addMsg(botReply, "bot");
            }
        }, 1200);
    } catch (e) {
        typing.classList.add("hidden");
        console.error(e);
    }
};
