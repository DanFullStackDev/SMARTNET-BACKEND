// controllers/supportController.js
const SupportTicket = require('../models/SupportTicket');

// 1. Save a new ticket from the Homepage
exports.submitTicket = async (req, res) => {
    try {
        const { phoneNumber, formType, issueType, message } = req.body;

        if (!phoneNumber || !formType || !message) {
            return res.status(400).json({ success: false, error: "Missing required fields" });
        }

        const ticket = new SupportTicket({
            phoneNumber,
            formType,
            issueType: issueType || 'Not specified',
            message
        });

        await ticket.save();
        res.status(201).json({ success: true, message: "Ticket submitted successfully" });

    } catch (error) {
        console.error("Support Ticket Error:", error);
        res.status(500).json({ success: false, error: "Server error" });
    }
};

// 2. Fetch all tickets for the Admin Dashboard
exports.getTickets = async (req, res) => {
    try {
        // Fetch tickets sorted by newest first
        const tickets = await SupportTicket.find({}).sort({ createdAt: -1 });
        res.status(200).json({ success: true, tickets });
    } catch (error) {
        console.error("Fetch Tickets Error:", error);
        res.status(500).json({ success: false, error: "Server error" });
    }
};