// utils/mpesa.js
const axios = require('axios');

const getMpesaCredentials = () => {
    const isProd = process.env.MPESA_ENVIRONMENT === 'production';
    return {
        baseURL: isProd ? 'https://api.safaricom.co.ke' : 'https://sandbox.safaricom.co.ke',
        // In sandbox, 174379 acts as the shortcode. 
        // In production for a Till Number, your Shortcode is your Store Number, and PartyB is the Till Number.
        shortcode: process.env.MPESA_SHORTCODE, 
        passkey: process.env.MPESA_PASSKEY,
        consumerKey: process.env.MPESA_CONSUMER_KEY,
        consumerSecret: process.env.MPESA_CONSUMER_SECRET,
        callbackUrl: process.env.MPESA_CALLBACK_URL
    };
};

// 1. Generate OAuth Access Token
const generateToken = async () => {
    const { baseURL, consumerKey, consumerSecret } = getMpesaCredentials();
    const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');

    try {
        const response = await axios.get(`${baseURL}/oauth/v1/generate?grant_type=client_credentials`, {
            headers: { Authorization: `Basic ${auth}` }
        });
        return response.data.access_token;
    } catch (error) {
        console.error("❌ M-Pesa Token Error:", error.response?.data || error.message);
        throw new Error("Failed to generate M-Pesa token");
    }
};

// 2. Format Phone Number (Must be 2547... or 2541...)
const formatPhoneNumber = (phone) => {
    let formatted = phone.replace(/\s+/g, '');
    if (formatted.startsWith('0')) formatted = '254' + formatted.slice(1);
    if (formatted.startsWith('+')) formatted = formatted.slice(1);
    return formatted;
};

// 3. Initiate STK Push
const initiateSTKPush = async (phone, amount, accountReference, transactionDesc) => {
    const { baseURL, shortcode, passkey, callbackUrl } = getMpesaCredentials();
    const token = await generateToken();
    const formattedPhone = formatPhoneNumber(phone);

    // Generate Timestamp & Password
    const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, -3);
    const password = Buffer.from(`${shortcode}${passkey}${timestamp}`).toString('base64');

    try {
        const response = await axios.post(`${baseURL}/mpesa/stkpush/v1/processrequest`, {
            BusinessShortCode: shortcode,
            Password: password,
            Timestamp: timestamp,
            TransactionType: "CustomerBuyGoodsOnline", // 🛒 EXPLICITLY SET FOR TILL NUMBERS
            Amount: amount,
            PartyA: formattedPhone,
            PartyB: shortcode, // The Till Number receiving the funds
            PhoneNumber: formattedPhone,
            CallBackURL: callbackUrl,
            AccountReference: accountReference,
            TransactionDesc: transactionDesc
        }, {
            headers: { Authorization: `Bearer ${token}` }
        });

        return response.data; // Returns CheckoutRequestID
    } catch (error) {
        console.error("❌ STK Push Error:", error.response?.data || error.message);
        throw new Error("Failed to initiate STK Push");
    }
};

module.exports = { initiateSTKPush };