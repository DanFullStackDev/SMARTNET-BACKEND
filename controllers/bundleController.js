// controllers/bundleController.js
const BundleTransaction = require('../models/BundleTransaction');
const { initiateSTKPush } = require('../utils/mpesa');

// 1. Initiate Purchase (Trigger STK Push)
exports.initiateBundlePurchase = async (req, res) => {
    try {
        const { phoneNumber, bundleName, amount } = req.body;

        // Ensure we have the basic requirements
        if (!phoneNumber || !amount || !bundleName) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        // Generate a unique reference for our database
        const reference = `FDB-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

        // Trigger the M-Pesa STK prompt on the user's phone
        const stkResponse = await initiateSTKPush(
            phoneNumber, 
            amount, 
            reference, 
            `Payment for ${bundleName}` 
        );

        // Save the pending transaction tracking the Safaricom CheckoutRequestID
        const transaction = new BundleTransaction({
            phoneNumber,
            bundleName,
            amount,
            reference,
            checkoutRequestId: stkResponse.CheckoutRequestID, // Crucial for matching the webhook later
            status: 'pending'
        });
        await transaction.save();

        res.status(200).json({ 
            success: true, 
            message: "STK Push sent successfully. Please enter your PIN.",
            checkoutRequestId: stkResponse.CheckoutRequestID 
        });

    } catch (error) {
        console.error("Bundle Purchase Error:", error);
        res.status(500).json({ error: "Failed to initiate M-Pesa payment" });
    }
};

// 2. M-Pesa Webhook (Callback from Safaricom)
exports.mpesaWebhook = async (req, res) => {
    try {
        // Safaricom sends the result payload here
        const callbackData = req.body?.Body?.stkCallback;
        
        if (!callbackData) {
            return res.status(400).send("Invalid callback data");
        }

        const checkoutRequestId = callbackData.CheckoutRequestID;
        const resultCode = callbackData.ResultCode; // 0 means Success

        // Find the pending transaction in your database
        const transaction = await BundleTransaction.findOne({ checkoutRequestId });
        if (!transaction) {
            console.log(`⚠️ Webhook received for unknown transaction: ${checkoutRequestId}`);
            return res.status(404).send("Transaction not found");
        }

        // Handle Failed Payments (Cancelled by user, insufficient funds, etc.)
        if (resultCode !== 0) {
            transaction.status = 'failed';
            transaction.failReason = callbackData.ResultDesc;
            await transaction.save();
            console.log(`❌ M-Pesa Payment Failed: ${callbackData.ResultDesc}`);
            return res.status(200).send("Callback received and marked as failed");
        }

        // Handle SUCCESSFUL Payments
        const metadataItems = callbackData.CallbackMetadata?.Item || [];
        const receiptItem = metadataItems.find(item => item.Name === 'MpesaReceiptNumber');
        const mpesaReceipt = receiptItem ? receiptItem.Value : 'N/A';

        // Update database to reflect success
        transaction.status = 'success';
        transaction.mpesaReceipt = mpesaReceipt;
        await transaction.save();

        console.log(`✅ M-Pesa Success! Bundle: ${transaction.bundleName}, Phone: ${transaction.phoneNumber}, Receipt: ${mpesaReceipt}`);

        // TODO: This is where you trigger the API to actually provision the internet bundle to the user!
        
        // Always respond with 200 OK so Safaricom knows you successfully received the webhook
        res.status(200).json({ ResultCode: 0, ResultDesc: "Success" });

    } catch (error) {
        console.error("❌ M-Pesa Webhook Error:", error);
        res.status(500).send("Server Error");
    }
};
// --- ADD THIS TO THE BOTTOM OF controllers/bundleController.js ---

// 3. Verify Transaction (Frontend Polling Endpoint)
exports.verifyTransaction = async (req, res) => {
    try {
        const { checkoutRequestId } = req.params;
        
        // Look up the transaction Safaricom just updated
        const transaction = await BundleTransaction.findOne({ checkoutRequestId });

        if (!transaction) {
            return res.status(404).json({ success: false, message: "Transaction not found" });
        }

        // If the webhook marked it as success
        if (transaction.status === 'success' || transaction.status === 'completed') {
            return res.json({ 
                success: true, 
                data: {
                    phoneNumber: transaction.phoneNumber,
                    planName: transaction.bundleName // Important: match this exactly
                } 
            });
        } 
        // If the webhook marked it as failed (cancelled, no funds, etc)
        else if (transaction.status === 'failed') {
            return res.json({ success: false, status: 'failed' });
        } 
        // If it's still pending
        else {
            return res.status(202).json({ success: false, message: "Still pending" });
        }
    } catch (error) {
        console.error("Verify Error:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};