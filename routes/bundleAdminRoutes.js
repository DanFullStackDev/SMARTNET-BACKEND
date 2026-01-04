// backend/routes/bundleAdminRoutes.js
const express = require('express');
const router = express.Router();
const { getAllBundleTransactions } = require('../controllers/bundleAdminController');

// GET /api/bundle-admin/transactions
router.get('/transactions', getAllBundleTransactions);

// --- IMPORTANT: This line prevents the crash ---
module.exports = router;