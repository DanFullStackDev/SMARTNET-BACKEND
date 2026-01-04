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

// --- CORS CONFIGURATION (UPDATED) ---
// This allows your Localhost, Vercel, and Custom Domain to talk to this backend.
const allowedOrigins = [
    'http://localhost:5173',                 // Vite Localhost (Frontend)
    'http://localhost:3000',                 // CRA Localhost or other tools
    'https://buy-fast-data-bundles.vercel.app',  // ⚠️ REPLACE with your actual Vercel domain
    'https://www.fastdatabundles.co.ke',    // ⚠️ REPLACE with your bought domain
    'https://fastdatabundles.co.ke'         // Non-www version
];

const corsOptions = {
    origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps, curl, or Postman)
        if (!origin) return callback(null, true);
        
        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            console.log("Blocked by CORS:", origin); // Helpful for debugging
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true, // Important for cookies/sessions
    optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
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
let qrCodeData = null; // Variable to store the QR code

async function connectToWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');

    sock = makeWASocket({
        auth: state,
        logger: pino({ level: 'silent' }),
    });

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;
        
        if (qr) {
            qrCodeData = qr; // Update variable when new QR is generated
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
            qrCodeData = "CONNECTED"; // Clear QR code when connected
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

// 1. GET QR CODE (For Frontend)
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

// 2. GET MEMBERS OF A SPECIFIC GROUP
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

// 3. SAFE BROADCAST (Multiple Groups)
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

// 4. SAFE DM BLAST (Multiple Members)
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