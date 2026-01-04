const mongoose = require('mongoose');

const BundleTransactionSchema = new mongoose.Schema({
  phoneNumber: { type: String, required: true },
  amountPaid: { type: Number, required: true },
  bundlePackage: { type: String, required: true }, // e.g., "5GB Weekly"
  customerName: { type: String }, // Stores "Safaricom" or "Airtel"
  email: { type: String },
  reference: { type: String, unique: true }, // Paystack Reference
  status: { type: String, default: 'pending' }, // pending, completed, failed
  date: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('BundleTransaction', BundleTransactionSchema);