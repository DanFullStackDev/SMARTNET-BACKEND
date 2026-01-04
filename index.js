// index.js
require('dotenv').config();
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, delay } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const pino = require('pino');
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const fs = require('fs');

// Import Routes
const bundleRoutes = require('./routes/bundleRoutes');
const bundleAdminRoutes = require('./routes/bundleAdminRoutes');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// --- DATABASE CONNECTION ---
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB Connected'))
  .catch(err => console.error('❌ MongoDB Error:', err));

// --- API ROUTES ---
app.use('/api/bundles', bundleRoutes);
app.use('/api/bundle-admin', bundleAdminRoutes);

// --- WHATSAPP BOT LOGIC ---
let sock;
let qrCodeData = null;

async function connectToWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');

    sock = makeWASocket({
        auth: state,
        logger: pino({ level: 'silent' }),
    });

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;
        
        if (qr) {
            qrCodeData = qr;
            console.log("New QR Code generated");
        }

        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect.error)?.output?.statusCode !== DisconnectReason.loggedOut;
            if (!shouldReconnect) {
                console.log('🔒 Session ended (Logged Out). Clearing auth and restarting...');
                if (fs.existsSync('./auth_info_baileys')) {
                    fs.rmSync('./auth_info_baileys', { recursive: true, force: true });
                }
                connectToWhatsApp();
            } else {
                console.log('📡 Connection lost. Reconnecting...');
                connectToWhatsApp();
            }
        } else if (connection === 'open') {
            console.log('✅ WhatsApp Connected!');
            qrCodeData = "CONNECTED";
        }
    });

    sock.ev.on('creds.update', saveCreds);

    // Auto-Reply Logic
    sock.ev.on('messages.upsert', async m => {
        const msg = m.messages[0];
        if (!msg.message || msg.key.fromMe) return;
        
        const sender = msg.key.remoteJid;
        const text = (msg.message.conversation || msg.message.extendedTextMessage?.text || "").toLowerCase();

        if (text.includes('price') || text.includes('cost')) {
            await sock.sendMessage(sender, { text: "Smartnet Packages:\n5GB - KES 63\n10GB - KES 99" });
        }
    });
}

// --- HELPER: Random Human Delay ---
// Waits between min and max seconds
const waitHuman = async (min = 3, max = 10) => {
    const ms = Math.floor(Math.random() * (max - min + 1) + min) * 1000;
    await new Promise(resolve => setTimeout(resolve, ms));
};

// --- API ENDPOINTS ---

app.get('/api/qr', (req, res) => res.json({ qr: qrCodeData }));

app.get('/api/groups', async (req, res) => {
    try {
        if (!sock) return res.status(500).json({ error: "Bot not connected" });
        const groupsObj = await sock.groupFetchAllParticipating();
        const groups = Object.values(groupsObj).map(g => ({
            id: g.id,
            subject: g.subject,
            owner: g.owner,
            size: g.participants.length,
            creation: g.creation
        }));
        const myId = sock.user?.id ? sock.user.id.split(':')[0] + '@s.whatsapp.net' : null;
        res.json({ success: true, groups, myId });
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch groups" });
    }
});

// 1. GET MEMBERS OF A SPECIFIC GROUP
app.get('/api/groups/:jid/participants', async (req, res) => {
    const { jid } = req.params;
    try {
        if (!sock) return res.status(500).json({ error: "Bot not connected" });
        
        const metadata = await sock.groupMetadata(jid);
        
        // Clean up the list
        const participants = metadata.participants.map(p => ({
            id: p.id,
            admin: p.admin // 'admin', 'superadmin', or null
        }));

        res.json({ success: true, subject: metadata.subject, participants });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 2. SAFE BROADCAST (Multiple Groups)
app.post('/api/broadcast-groups', async (req, res) => {
    const { groups, message } = req.body; // Expects array of Group JIDs
    
    if (!groups || !Array.isArray(groups) || groups.length === 0) {
        return res.status(400).json({ error: "No groups selected" });
    }

    // Process in background so we don't block the request
    res.json({ success: true, message: `Broadcasting started for ${groups.length} groups.` });

    console.log(`🚀 Starting broadcast to ${groups.length} groups...`);

    for (const groupJid of groups) {
        try {
            console.log(`--> Sending to: ${groupJid}`);
            
            // Get participants to tag them (Optional, risky for spam detection if used too much)
            // Ideally, for safety, just send text without tagging everyone if sending to MANY groups.
            // But since you asked to tag, we fetch metadata.
            const metadata = await sock.groupMetadata(groupJid);
            const participants = metadata.participants.map(p => p.id);

            await sock.sendMessage(groupJid, { text: message, mentions: participants });
            
            // HUMAN DELAY: Wait 5-15 seconds between groups
            await waitHuman(5, 15); 

        } catch (err) {
            console.error(`❌ Failed to send to ${groupJid}:`, err.message);
        }
    }
    console.log("✅ Broadcast Complete");
});

// 3. SAFE DM BLAST (Multiple Members)
app.post('/api/broadcast-members', async (req, res) => {
    const { members, message } = req.body; // Expects array of User JIDs
    
    if (!members || !Array.isArray(members) || members.length === 0) {
        return res.status(400).json({ error: "No members selected" });
    }

    res.json({ success: true, message: `DM Blast started for ${members.length} users.` });

    console.log(`🚀 Starting DM blast to ${members.length} users...`);

    for (const userJid of members) {
        try {
            console.log(`--> DMing: ${userJid}`);
            await sock.sendMessage(userJid, { text: message });
            
            // HUMAN DELAY: Wait 7-20 seconds between DMs (DMs are stricter than groups)
            await waitHuman(7, 20); 

        } catch (err) {
            console.error(`❌ Failed to DM ${userJid}:`, err.message);
        }
    }
    console.log("✅ DM Blast Complete");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    connectToWhatsApp();
});