const { askAI } = require('./aiAgent'); // Import the AI Brain

const handleSmartMenu = async (sock, msg) => {
    const sender = msg.key.remoteJid;
    const isGroup = sender.endsWith('@g.us');
    const text = (msg.message.conversation || msg.message.extendedTextMessage?.text || "").trim();
    const cleanText = text.toLowerCase();
    const WEBSITE_URL = "https://fastdatabundles.co.ke";

    // 1. GLOBAL KEYWORDS (Priority)
    if (cleanText.includes('price') || cleanText.includes('cost') || cleanText.includes('bundle')) {
        await sock.sendMessage(sender, { 
            text: "⚡ *SmartNet Packages:*\n\n✅ 5GB (Weekly) - KES 63\n✅ 10GB (Monthly) - KES 99\n✅ Unlimited - KES 1000\n\nReply *1* to buy now!" 
        });
        return;
    }

    // 2. DM LOGIC
    if (!isGroup) {
        // --- HARDCODED MENUS ---
        if (cleanText === '1') {
            await sock.sendMessage(sender, { text: `🚀 *Get Connected Now*\n\nClick here to buy:\n👉 ${WEBSITE_URL}` });
            return;
        }
        if (cleanText === '2') {
            await sock.sendMessage(sender, { text: `🔍 *Balance Check*\n\nDial *544#* on your phone.` });
            return;
        }
        if (cleanText === '3') {
            await sock.sendMessage(sender, { text: `📞 *Support Ticket Created*\n\nA human agent will reply shortly.` });
            return;
        }

        // --- 🤖 AI FALLBACK (The Magic) ---
        // If the user text is NOT a number, ask the AI
        // We filter out very short messages to avoid spamming AI with "ok" or "lol"
        if (text.length > 2) {
            // Show "typing..." status to make it feel real
            await sock.sendPresenceUpdate('composing', sender); 
            
            const aiReply = await askAI(text);
            
            await sock.sendMessage(sender, { text: aiReply });
        }
    }
};

module.exports = { handleSmartMenu };