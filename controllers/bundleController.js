const asyncHandler = require('express-async-handler');
const BundleTransaction = require('../models/BundleTransaction'); // Import the NEW model
const axios = require('axios');
const crypto = require('crypto');

// @desc    Initiate Bundle Payment
// @route   POST /api/bundles/initiate
const initiateBundlePayment = asyncHandler(async (req, res) => {
  const { customerName, email, phoneNumber, amount, bundlePackage } = req.body;

  if (!amount || !email || !phoneNumber || !bundlePackage) {
    res.status(400);
    throw new Error('Please fill in all fields');
  }

  // 1. Create DB Record
  const transaction = await BundleTransaction.create({
    customerName,
    phoneNumber,
    email,
    amountPaid: amount,
    bundlePackage,
    reference: 'PENDING_' + Date.now(), // Temporary ref until Paystack responds
    status: 'pending'
  });

  // FIX: Removed "callback_url: " text from the string. It must be just the URL.
  const callbackUrl = process.env.NODE_ENV === 'production' 
      ? 'https://fastdatabundles.co.ke/payment-success' 
      : 'http://localhost:5173/payment-success';

  // 2. Call Paystack (Using Bundle Secret Key)
  try {
    const response = await axios.post(
      'https://api.paystack.co/transaction/initialize',
      {
        email: email,
        amount: amount * 100, // Convert to kobo/cents
        currency: 'KES',
        callback_url: callbackUrl,
        metadata: {
          transaction_id: transaction._id.toString(),
          custom_field: "bundle_payment" // distinctive tag
        }
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY_BUNDLES}`,
          'Content-Type': 'application/json'
        }
      }
    );

    // Update reference with the real one from Paystack
    transaction.reference = response.data.data.reference;
    await transaction.save();

    res.json({
      success: true,
      authorization_url: response.data.data.authorization_url,
      reference: response.data.data.reference
    });

  } catch (error) {
    transaction.status = 'failed';
    await transaction.save();
    res.status(500);
    throw new Error('Paystack Error: ' + error.message);
  }
});

// @desc    Verify Transaction (Used by Frontend Activation Page)
// @route   GET /api/bundles/verify/:reference
const verifyBundleTransaction = asyncHandler(async (req, res) => {
  const { reference } = req.params;

  if (!reference) {
    res.status(400);
    throw new Error('No reference provided');
  }

  // Find transaction by the Paystack reference
  const transaction = await BundleTransaction.findOne({ reference });

  if (!transaction) {
    res.status(404);
    throw new Error('Transaction not found');
  }

  res.status(200).json({
    success: true,
    data: {
      phoneNumber: transaction.phoneNumber,
      planName: transaction.bundlePackage, // Sends back "5GB Weekly" etc.
      amountPaid: transaction.amountPaid,
      status: transaction.status
    }
  });
});

// @desc    Bundle Webhook
// @route   POST /api/bundles/webhook
const handleBundleWebhook = asyncHandler(async (req, res) => {
  const hash = crypto.createHmac('sha512', process.env.PAYSTACK_SECRET_KEY_BUNDLES)
                     .update(JSON.stringify(req.body))
                     .digest('hex');

  if (hash !== req.headers['x-paystack-signature']) {
    return res.status(400).send('Invalid Signature');
  }

  const event = req.body;
  if (event.event === 'charge.success') {
    const { metadata, reference } = event.data;
    
    // Find using the NEW model
    const transaction = await BundleTransaction.findById(metadata.transaction_id);

    if (transaction && transaction.status !== 'completed') {
      transaction.status = 'completed';
      transaction.reference = reference;
      await transaction.save();
      
      console.log(`✅ Bundle Success: ${transaction.bundlePackage} for ${transaction.phoneNumber}`);
    }
  }
  res.sendStatus(200);
});

module.exports = { 
  initiateBundlePayment, 
  verifyBundleTransaction, 
  handleBundleWebhook 
};