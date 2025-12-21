// --- Updated MAIN CHAT LOGIC ---
window.send = async () => {
    const text = input.value.trim();
    if (!text) return;

    input.value = "";
    addMsg(text, "user");
    
    saveToGlobalMemory(text); 
    conversationHistory.push({ role: "user", text });
    if (conversationHistory.length > 6) conversationHistory.shift();

    if (isLearning) {
        typing.classList.remove("hidden");
        setTimeout(async () => {
            try {
                await addDoc(collection(db, "temp_learning"), {
                    question: pendingQuestion,
                    answer: text,
                    learnedFrom: localStorage.getItem("userName"),
                    timestamp: serverTimestamp()
                });
                typing.classList.add("hidden");
                addMsg(`Theek hai **${localStorage.getItem("userName")}**, maine yaad kar liya! 🎓`, "bot");
                isLearning = false;
                localStorage.removeItem("isLearning");
            } catch (e) { console.error(e); }
        }, 1200);
        return;
    }

    const thinkTime = Math.random() * (1500 - 800) + 800; 
    setTimeout(async () => {
        typing.classList.remove("hidden");
        try {
            const botReply = await getSmartReply(text, conversationHistory);
            
            // FIX: Object ko String mein convert karna
            let replyText = "";
            let isNeedLearning = false;

            if (typeof botReply === "object" && botReply !== null) {
                replyText = botReply.msg || "Hmm.. thoda detail mein batao? ✨";
                if (botReply.status === "NEED_LEARNING") isNeedLearning = true;
            } else {
                replyText = botReply;
            }

            // Repetitive Loop Filter: Agar bot baar-baar sikhne ko bole
            if (isNeedLearning && Math.random() > 0.5) {
                const softFallbacks = ["Achha? Phir kya hua? 🙈", "Baat toh sahi hai.. par main thoda confuse ho gayi. 😜", "Hmm.. main samajh rahi hoon. ✨"];
                replyText = softFallbacks[Math.floor(Math.random() * softFallbacks.length)];
                isNeedLearning = false; // Is baar learning mode bypass karein
            }

            const typingDuration = Math.min(Math.max(replyText.length * 35, 1200), 4500);

            setTimeout(() => {
                typing.classList.add("hidden");
                
                if (isNeedLearning) {
                    isLearning = true;
                    pendingQuestion = botReply.question;
                    localStorage.setItem("isLearning", "true");
                }

                const girlHabits = [" ✨", " 🙈", " na?", " 😊"];
                const finalReply = replyText + (Math.random() > 0.7 ? girlHabits[Math.floor(Math.random() * girlHabits.length)] : "");
                
                addMsg(finalReply, "bot");
                conversationHistory.push({ role: "bot", text: finalReply });
            }, typingDuration);
        } catch (e) {
            typing.classList.add("hidden");
            addMsg("Satellite connection slow hai yaar.. 🛰️", "bot");
        }
    }, thinkTime);
};
