const { askAI } = require('./aiAgent');

const handleSmartMenu = async (sock, msg) => {
    const sender = msg.key.remoteJid;
    const isGroup = sender.endsWith('@g.us');
    
    // Clean the text: Remove spaces, lowercase it
    const text = (msg.message.conversation || msg.message.extendedTextMessage?.text || "").trim();
    const cleanText = text.toLowerCase();
    
    const WEBSITE_URL = "https://fastdatabundles.co.ke";

    // --- 🛑 RULE 1: SILENCE IN GROUPS ---
    // The user explicitly requested the bot NOT to reply randomly in groups.
    // It should only speak when the Admin broadcasts via the Dashboard.
    if (isGroup) return; 


    // --- 👋 RULE 2: THE WELCOME MESSAGE ---
    // Triggers on: hi, hello, menu, start, smartnet
    const greetings = ['hi', 'hello', 'hey', 'start', 'menu', 'morning', 'evening', 'afternoon'];
    
    if (greetings.some(word => cleanText.includes(word))) {
        await sock.sendMessage(sender, { 
            text: `🌟 *Welcome to SmartNet FastDataBundles!* 🌟\n\nWe provide high-speed, affordable internet powered by *Starlink technology*. 🚀\n\n✅ *No expensive hardware needed*\n✅ *Works with your existing Safaricom/Airtel line*\n✅ *Available all over Kenya*\n\n👇 *Reply with a number to proceed:*\n\n1️⃣ *See Prices & Buy Bundles* \n2️⃣ *Check My Balance* \n3️⃣ *Talk to Customer Care*` 
        });
        return;
    }

    // --- 🔢 RULE 3: THE MENU OPTIONS ---

    // Option 1: Buy (Link)
    if (cleanText === '1' || cleanText.includes('price') || cleanText.includes('buy')) {
        await sock.sendMessage(sender, { 
            text: `⚡ *SmartNet Packages:*\n\n✅ 5GB (Weekly) - KES 63\n✅ 10GB (14 Days) - KES 99\n✅ 25GB (30 Days) - KES 273\n✅ 60GB (30 Days) - KES 699.\n✅ Unlimited (Monthly) - KES 1000\n\n🚀 *Click here to Activate Instantly:*\n👉 ${WEBSITE_URL}` 
        });
        return;
    }

    // Option 2: Check Balance
    if (cleanText === '2' || cleanText.includes('balance')) {
        await sock.sendMessage(sender, { 
            text: `🔍 *Balance Check*\n\nTo check your balance, please dial *544#* on your phone line.\n\n(Automated balance checking coming soon!)` 
        });
        return;
    }

    // Option 3: Support
    if (cleanText === '3' || cleanText.includes('agent') || cleanText.includes('help')) {
        await sock.sendMessage(sender, { 
            text: `📞 *Customer Care*\n\nA human agent has been notified. Please describe your issue here, and we will reply shortly.` 
        });
        return;
    }

    // --- 🤖 RULE 4: AI CHAT (With "Silence" Fallback) ---
    // Only send to AI if it's a real sentence (more than 3 words) to avoid spamming on "ok", "lol", etc.
    if (text.length > 10) {
        await sock.sendPresenceUpdate('composing', sender);
        
        const aiReply = await askAI(text);
        
        // If AI returns null (meaning it failed/crashed), WE DO NOTHING.
        // This stops the "Hey I'm busy" spam.
        if (aiReply) {
            await sock.sendMessage(sender, { text: aiReply });
        }
    }
};

module.exports = { handleSmartMenu };