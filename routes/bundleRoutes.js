// routes/bundleRoutes.js
const express = require('express');
const router = express.Router();
const bundleController = require('../controllers/bundleController');

// Route for the frontend to hit when a user clicks "Pay"
router.post('/initiate', bundleController.initiateBundlePurchase);

// Route for Safaricom Daraja to ping silently in the background
router.post('/mpesa/webhook', bundleController.mpesaWebhook);

// 👇 ADDED THIS LINE: Route for the frontend to check if payment succeeded
router.get('/verify/:checkoutRequestId', bundleController.verifyTransaction);

module.exports = router;