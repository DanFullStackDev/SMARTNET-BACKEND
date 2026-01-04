// Function to handle the menu logic
const handleSmartMenu = async (sock, msg) => {
    const sender = msg.key.remoteJid;
    const isGroup = sender.endsWith('@g.us');
    const text = (msg.message.conversation || msg.message.extendedTextMessage?.text || "").trim().toLowerCase();
    const WEBSITE_URL = "https://fastdatabundles.co.ke";

    // 1. GLOBAL KEYWORDS
    if (text.includes('price') || text.includes('cost') || text.includes('bundle')) {
        await sock.sendMessage(sender, { 
            text: "⚡ *SmartNet Packages:*\n\n✅ 5GB (Weekly) - KES 63\n✅ 10GB (Monthly) - KES 99\n✅ Unlimited - KES 1000\n\nReply *1* to buy now!" 
        });
        return;
    }

    // 2. DM-ONLY MENU
    if (!isGroup) {
        const greetings = ['hi', 'hello', 'hey', 'start', 'menu', 'test', 'morning'];
        
        if (greetings.some(word => text.includes(word))) {
            await sock.sendMessage(sender, { 
                text: `🤖 *Welcome to SmartNet!* \n\nI can help you get connected instantly. Reply with a number:\n\n1️⃣ *Buy Data Bundles* \n2️⃣ *Check My Balance* \n3️⃣ *Talk to Agent*` 
            });
            return;
        }

        if (text === '1') {
            await sock.sendMessage(sender, { text: `🚀 *Get Connected Now*\n\nClick here to buy:\n👉 ${WEBSITE_URL}` });
            return;
        }
        if (text === '2') {
            await sock.sendMessage(sender, { text: `🔍 *Balance Check*\n\nDial *544#* on your phone.` });
            return;
        }
        if (text === '3') {
            await sock.sendMessage(sender, { text: `📞 *Support Ticket Created*\n\nA human agent will reply shortly.` });
            return;
        }
    }
};

module.exports = { handleSmartMenu };