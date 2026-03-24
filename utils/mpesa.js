const axios = require('axios');

const getMpesaCredentials = () => {
    const env = (process.env.MPESA_ENVIRONMENT || '').trim();
    const isProd = env === 'production';
    
    return {
        baseURL: isProd ? 'https://api.safaricom.co.ke' : 'https://sandbox.safaricom.co.ke',
        storeNumber: (process.env.MPESA_STORE_NUMBER || '').trim(), 
        tillNumber: (process.env.MPESA_TILL_NUMBER || '').trim(),
        passkey: (process.env.MPESA_PASSKEY || '').trim(),
        consumerKey: (process.env.MPESA_CONSUMER_KEY || '').trim(),
        consumerSecret: (process.env.MPESA_CONSUMER_SECRET || '').trim(),
        callbackUrl: (process.env.MPESA_CALLBACK_URL || '').trim()
    };
};

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

const formatPhoneNumber = (phone) => {
    let formatted = phone.replace(/\s+/g, '');
    if (formatted.startsWith('0')) formatted = '254' + formatted.slice(1);
    if (formatted.startsWith('+')) formatted = formatted.slice(1);
    return formatted;
};

const initiateSTKPush = async (phone, amount, accountReference, transactionDesc) => {
    const { baseURL, storeNumber, tillNumber, passkey, callbackUrl } = getMpesaCredentials();
    const token = await generateToken();
    const formattedPhone = formatPhoneNumber(phone);

    const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, -3);
    const password = Buffer.from(`${storeNumber}${passkey}${timestamp}`).toString('base64');

    // 👇 FORCING PAYBILL TO BYPASS SAFARICOM'S STRICT TYPING
    const isProd = process.env.MPESA_ENVIRONMENT === 'production';
    const transactionType = isProd ? "CustomerPayBillOnline" : "CustomerPayBillOnline";

    try {
        const response = await axios.post(`${baseURL}/mpesa/stkpush/v1/processrequest`, {
            BusinessShortCode: storeNumber, // Using the Daraja Short Code (4564171)
            Password: password,
            Timestamp: timestamp,
            TransactionType: transactionType, 
            Amount: amount,
            PartyA: formattedPhone,
            PartyB: tillNumber, // Using the Daraja Short Code (4564171)
            PhoneNumber: formattedPhone,
            CallBackURL: callbackUrl,
            AccountReference: accountReference,
            TransactionDesc: transactionDesc
        }, {
            headers: { Authorization: `Bearer ${token}` }
        });

        return response.data;
    } catch (error) {
        console.error("❌ STK Push Error:", error.response?.data || error.message);
        throw new Error("Failed to initiate STK Push");
    }
};

module.exports = { initiateSTKPush };