const mongoose = require('mongoose');

const scheduledJobSchema = new mongoose.Schema({
    type: { type: String, enum: ['group', 'member'], required: true },
    targets: [{ type: String }], // Array of JIDs (Group IDs or Phone Numbers)
    message: { type: String, required: true },
    scheduledTime: { type: Date, required: true },
    status: { type: String, enum: ['pending', 'completed', 'failed'], default: 'pending' },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('ScheduledJob', scheduledJobSchema);