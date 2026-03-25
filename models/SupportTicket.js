// models/SupportTicket.js
const mongoose = require('mongoose');

const supportTicketSchema = new mongoose.Schema({
    phoneNumber: { 
        type: String, 
        required: true 
    },
    formType: { 
        type: String, 
        enum: ['returning', 'support'], 
        required: true 
    },
    issueType: { 
        type: String, // Holds either the "Previous Package" or the "Type of Issue"
        required: true
    },
    message: { 
        type: String, 
        required: true 
    },
    status: { 
        type: String, 
        default: 'open' // Can be 'open' or 'resolved'
    }
}, { timestamps: true }); // Automatically adds createdAt and updatedAt

module.exports = mongoose.model('SupportTicket', supportTicketSchema);