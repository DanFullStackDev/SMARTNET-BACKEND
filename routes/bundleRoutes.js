const express = require('express');
const router = express.Router();
const { 
  initiateBundlePayment, 
  handleBundleWebhook, 
  verifyBundleTransaction // Import the new function
} = require('../controllers/bundleController');

router.post('/initiate', initiateBundlePayment);
router.post('/webhook', handleBundleWebhook);

// New GET route for fetching transaction details by reference
router.get('/verify/:reference', verifyBundleTransaction);

module.exports = router;