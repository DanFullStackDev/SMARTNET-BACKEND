require('dotenv').config();
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const pino = require('pino');
const express = require('express');
const fs = require('fs');

// Import Custom Modules
const connectDB = require('./config/db');
const corsMiddleware = require('./config/cors');
const { handleSmartMenu } = require('./utils/smartMenu');
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
// We use globals so routes can access the bot status
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
app.use('/api', botRoutes); // This now handles /api/qr, /api/groups, etc.

// --- WHATSAPP BOT CONNECTION ---
async function connectToWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');

    const sock = makeWASocket({
        auth: state,
        logger: pino({ level: 'silent' }),
    });

    global.sock = sock; // Update global instance

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;
        
        if (qr) {
            global.qrCodeData = qr;
            console.log("New QR Code generated");
        }

        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect.error)?.output?.statusCode !== DisconnectReason.loggedOut;
            if (shouldReconnect) {
                console.log('📡 Reconnecting...');
                connectToWhatsApp();
            } else {
                console.log('🔒 Logged out. Delete session and restart.');
                if (fs.existsSync('./auth_info_baileys')) fs.rmSync('./auth_info_baileys', { recursive: true, force: true });
                connectToWhatsApp();
            }
        } else if (connection === 'open') {
            console.log('✅ WhatsApp Connected!');
            global.qrCodeData = "CONNECTED";
        }
    });

    sock.ev.on('creds.update', saveCreds);

    // Smart Menu Handler
    sock.ev.on('messages.upsert', async m => {
        const msg = m.messages[0];
        if (!msg.message || msg.key.fromMe) return;
        
        // Call the separate logic file
        await handleSmartMenu(sock, msg);
    });
}

// Start Server & Bot
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    connectToWhatsApp();
});