const express = require('express');
const router = express.Router();
const ScheduledJob = require('../models/ScheduledJob');
const { generatePost } = require('../utils/aiAgent');

const waitHuman = async (min = 15, max = 45) => {
    const ms = Math.floor(Math.random() * (max - min + 1) + min) * 1000;
    await new Promise(resolve => setTimeout(resolve, ms));
};

// 1. GET QR
router.get('/qr', (req, res) => {
    res.json({ qr: global.qrCodeData });
});

// 2. GET GROUPS (Enhanced with Admin/Open Status)
router.get('/groups', async (req, res) => {
    const sock = req.botSock;
    if (!sock) return res.status(500).json({ error: "Bot not connected" });
    
    try {
        const groupsObj = await sock.groupFetchAllParticipating();
        const myId = sock.user?.id?.split(':')[0] + '@s.whatsapp.net';

        const groups = Object.values(groupsObj).map(g => {
            const me = g.participants.find(p => p.id === myId);
            return {
                id: g.id, 
                subject: g.subject, 
                size: g.participants.length,
                isAdmin: !!me?.admin,         // Am I admin?
                isOpen: !g.announce,          // Can anyone message?
                creation: g.creation
            };
        });
        res.json({ success: true, groups, myId });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch groups" });
    }
});

// 3. GET MEMBERS
router.get('/groups/:jid/participants', async (req, res) => {
    const sock = req.botSock;
    const { jid } = req.params;
    if (!sock) return res.status(500).json({ error: "Bot not connected" });

    try {
        const metadata = await sock.groupMetadata(jid);
        const participants = metadata.participants.map(p => ({ id: p.id, admin: p.admin }));
        res.json({ success: true, subject: metadata.subject, participants });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 4. GET INVITE CODE (Admin Only)
router.get('/groups/:jid/invite', async (req, res) => {
    const sock = req.botSock;
    const { jid } = req.params;
    if (!sock) return res.status(500).json({ error: "Bot not connected" });

    try {
        const code = await sock.groupInviteCode(jid);
        res.json({ success: true, link: `https://chat.whatsapp.com/${code}` });
    } catch (err) {
        res.status(400).json({ error: "Failed. Are you admin?" });
    }
});

// 5. JOIN GROUP VIA LINK
router.post('/groups/join', async (req, res) => {
    const sock = req.botSock;
    const { link } = req.body;
    if (!sock) return res.status(500).json({ error: "Bot not connected" });

    try {
        const code = link.split('chat.whatsapp.com/')[1];
        if (!code) return res.status(400).json({ error: "Invalid Link" });
        
        const response = await sock.groupAcceptInvite(code);
        res.json({ success: true, groupId: response });
    } catch (err) {
        res.status(500).json({ error: "Failed to join group" });
    }
});

// 6. GENERATE AI POST
router.post('/generate-content', async (req, res) => {
    const { topic } = req.body;
    if (!topic) return res.status(400).json({ error: "Topic required" });

    const content = await generatePost(topic);
    res.json({ success: true, content });
});

// 7. BROADCASTS (Existing)
router.post('/broadcast-groups', async (req, res) => {
    const sock = req.botSock;
    const { groups, message } = req.body;
    if (!sock) return res.status(500).json({ error: "Bot disconnected" });

    // Respond to the frontend immediately so the dashboard doesn't hang/timeout
    res.json({ success: true, message: "Broadcast initiated in the background safely..." });
    
    // Process the loop asynchronously
    for (const groupJid of groups) {
        try {
            // 1. Simulate a human typing for 2 to 5 seconds
            await sock.sendPresenceUpdate('composing', groupJid);
            await waitHuman(2, 5); 
            
            // 2. Send the actual payload
            await sock.sendMessage(groupJid, { text: message });
            console.log(`✅ Broadcast sent to ${groupJid}`);

            // 3. The crucial cooldown before opening the next group (15-45 seconds)
            await waitHuman(15, 45); 
        } catch (err) {
            console.error(`❌ Failed to broadcast to ${groupJid}:`, err.message);
        }
    }
});
router.post('/schedule-broadcast', async (req, res) => {
    const { type, targets, message, scheduledTime } = req.body;
    try {
        const newJob = new ScheduledJob({
            type, targets, message,
            scheduledTime: new Date(scheduledTime),
            status: 'pending'
        });
        await newJob.save();
        res.json({ success: true, message: "Scheduled" });
    } catch (err) {
        res.status(500).json({ error: "Failed to schedule" });
    }
});

module.exports = router;