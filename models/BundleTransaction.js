const mongoose = require('mongoose');

const BundleTransactionSchema = new mongoose.Schema({
  phoneNumber: { type: String, required: true },
  amount: { type: Number, required: true }, // Updated to match controller
  bundleName: { type: String, required: true }, // Updated to match controller
  customerName: { type: String }, 
  email: { type: String },
  reference: { type: String, unique: true }, // Internal tracking (e.g., FDB-123456)
  checkoutRequestId: { type: String, unique: true, sparse: true }, // 🔗 Safaricom's webhook tracker
  mpesaReceipt: { type: String }, // 🧾 The actual M-Pesa confirmation code (e.g., QWE123456)
  failReason: { type: String }, // ❌ Stores the reason if the user cancels or lacks funds
  status: { type: String, default: 'pending' }, // pending, success, failed
  date: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('BundleTransaction', BundleTransactionSchema);