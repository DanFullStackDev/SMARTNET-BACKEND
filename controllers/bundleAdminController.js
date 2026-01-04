const asyncHandler = require('express-async-handler');
const BundleTransaction = require('../models/BundleTransaction');

// @desc    Get all bundle transactions
// @route   GET /api/bundle-admin/transactions
// @access  Public (Protected by frontend PIN for now)
const getAllBundleTransactions = asyncHandler(async (req, res) => {
  // Fetch all transactions, sorted by newest first
  const transactions = await BundleTransaction.find({}).sort({ createdAt: -1 });

  // Calculate generic stats
  const totalRevenue = transactions.reduce((acc, curr) => acc + (curr.amountPaid || 0), 0);
  const totalSales = transactions.length;

  res.json({
    success: true,
    count: totalSales,
    totalRevenue,
    transactions
  });
});

module.exports = { getAllBundleTransactions };