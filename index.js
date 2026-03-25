// index.js (Final Safe Version)
require('dotenv').config();
// Added fetchLatestBaileysVersion and Browsers to the import
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, Browsers } = require('@whiskeysockets/baileys');
const pino = require('pino');
const express = require('express');
const fs = require('fs');

// Import Custom Modules
const connectDB = require('./config/db');
const corsMiddleware = require('./config/cors');
const { handleSmartMenu } = require('./utils/smartMenu');
const { initScheduler } = require('./utils/scheduler'); 
const botRoutes = require('./routes/botRoutes');
const bundleRoutes = require('./routes/bundleRoutes');
const bundleAdminRoutes = require('./routes/bundleAdminRoutes');

const app = express();

// --- MIDDLEWARE ---
app.use(corsMiddleware);
app.use(express.json());

// --- DATABASE ---
connectDB();

// --- GLOBALS ---
global.sock = null;
global.qrCodeData = null;

// Middleware to pass the bot instance to routes
app.use((req, res, next) => {
    req.botSock = global.sock;
    next();
});

// --- ROUTES ---
app.use('/api/bundles', bundleRoutes);
app.use('/api/bundle-admin', bundleAdminRoutes);
app.use('/api', botRoutes);
// Find your existing route definitions and add this:
app.use('/api/support', require('./routes/supportRoutes'));
// --- WHATSAPP BOT CONNECTION ---
async function connectToWhatsApp() {
    console.log("🔌 Connecting to WhatsApp...");
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');

    // Fetch the absolute latest version of WA Web to prevent connection rejections
    const { version, isLatest } = await fetchLatestBaileysVersion();
    console.log(`📡 Using WA v${version.join('.')}, isLatest: ${isLatest}`);

    const sock = makeWASocket({
        version,                               // Forces the newest WhatsApp Web version
        auth: state,
        logger: pino({ level: 'silent' }),
        browser: Browsers.macOS('Desktop')     // Native, highly-trusted browser disguise
    });

    global.sock = sock; 

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;
        
        if (qr) {
            global.qrCodeData = qr; // Sets the QR for your frontend to fetch!
            console.log("✅ New QR Code generated and ready for frontend!");
        }

        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect.error)?.output?.statusCode !== DisconnectReason.loggedOut;
            
            if (shouldReconnect) {
                // Log the exact reason WhatsApp disconnected us
                console.log('❌ Disconnect Reason:', lastDisconnect?.error?.message || lastDisconnect.error);
                console.log('📡 Reconnecting in 5 seconds...');
                setTimeout(connectToWhatsApp, 5000); // Wait 5 seconds before trying again
            } else {
                console.log('🔒 Logged out. Delete session and restart.');
                if (fs.existsSync('./auth_info_baileys')) {
                    fs.rmSync('./auth_info_baileys', { recursive: true, force: true });
                }
                setTimeout(connectToWhatsApp, 5000); // Wait 5 seconds to prevent spamming
            }
        } else if (connection === 'open') {
            console.log('✅ WhatsApp Connected!');
            global.qrCodeData = "CONNECTED";
        }
    });

    sock.ev.on('creds.update', saveCreds);

    // Smart Menu & AI Handler
    sock.ev.on('messages.upsert', async m => {
        const msg = m.messages[0];
        if (!msg.message || msg.key.fromMe) return;
        
        await handleSmartMenu(sock, msg);
    });
}

// Start Server & Bot
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    
    // --- 🛡️ SAFEGUARD: Prevent Double-Replies ---
    // If running on Localhost, we DISABLE the bot to let the VPS handle messages.
    if (process.env.DISABLE_BOT === 'true') {
        console.log("🛑 Bot Disabled Locally (Safe Mode Active)");
    } else {
        // On VPS, this variable won't exist, so it connects normally.
        initScheduler();       // Starts ONLY ONCE when the server boots
        connectToWhatsApp();   // Starts the WhatsApp connection
    }
});