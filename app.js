// --- Inhe app.js mein sabse upar add karein ---
const conversationStarters = [
    "Wese, tumhari pasandida movie kaunsi hai? ✨",
    "Chalo ye batao, aaj ka din kaisa guzra? 😊",
    "Tumhe music sunna pasand hai? Main toh hamesha sunti hoon! 🎵",
    "Wese, kya tumne kabhi kisi AI se itni lambi baat ki hai? 😂",
    "Mera dimaag toh thoda digital hai, tumhare dimaag mein kya chal raha hai? 🤔",
    "Interesting! Wese aur kuch naya puchenge?"
];

// --- Ye function bot ke reply ko 'extend' karega ---
function makeChatty(reply) {
    // 30% chance ki bot normal reply ke baad khud se kuch pooche
    if (Math.random() > 0.7) {
        const extra = conversationStarters[Math.floor(Math.random() * conversationStarters.length)];
        return `${reply}\n\n${extra}`;
    }
    return reply;
}

// --- window.send function ke andar ye badlav karein ---
window.send = async () => {
    // ... (purana input/spam logic same rahega) ...

    if (isLearning) {
        await saveLearnedAnswer(pendingQuestion, text);
        typing.classList.remove("hidden");
        setTimeout(() => {
            typing.classList.add("hidden");
            // Yahan break khatam karne ke liye starter add kiya
            const starter = conversationStarters[Math.floor(Math.random() * conversationStarters.length)];
            addMsg(`Maine yaad kar liya! Sikhane ke liye thnx. 😍\n\n${starter}`, "bot");
            isLearning = false;
            pendingQuestion = "";
        }, 1000);
        return;
    }

    // Normal Reply section mein:
    const botReply = await getSmartReply(text);
    setTimeout(() => {
        typing.classList.add("hidden");
        if (typeof botReply === "object") {
            // Learning mode prompt
            addMsg(botReply.msg, "bot");
            isLearning = true;
            pendingQuestion = botReply.question;
        } else {
            // Normal reply ko 'makeChatty' function se pass karein
            addMsg(makeChatty(botReply), "bot");
        }
    }, 1200);
};
