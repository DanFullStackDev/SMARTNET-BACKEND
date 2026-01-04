const express = require('express');
const router = express.Router();

// Helper delay function
const waitHuman = async (min = 3, max = 10) => {
    const ms = Math.floor(Math.random() * (max - min + 1) + min) * 1000;
    await new Promise(resolve => setTimeout(resolve, ms));
};

// 1. GET QR CODE
router.get('/qr', (req, res) => {
    // We access the global QR variable set in index.js
    res.json({ qr: global.qrCodeData });
});

// 2. GET GROUPS
router.get('/groups', async (req, res) => {
    const sock = req.botSock; // Access bot from request
    if (!sock) return res.status(500).json({ error: "Bot not connected" });
    
    try {
        const groupsObj = await sock.groupFetchAllParticipating();
        const groups = Object.values(groupsObj).map(g => ({
            id: g.id, 
            subject: g.subject, 
            size: g.participants.length 
        }));
        res.json({ success: true, groups });
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch groups" });
    }
});

// 3. BROADCAST
router.post('/broadcast-groups', async (req, res) => {
    const sock = req.botSock;
    const { groups, message } = req.body;

    if (!sock) return res.status(500).json({ error: "Bot not connected" });
    if (!groups || !groups.length) return res.status(400).json({ error: "No groups" });

    res.json({ success: true, message: "Broadcast started" });

    for (const groupJid of groups) {
        try {
            await sock.sendMessage(groupJid, { text: message });
            await waitHuman(5, 15);
        } catch (err) {
            console.error(`Failed to send to ${groupJid}`);
        }
    }
});

module.exports = router;