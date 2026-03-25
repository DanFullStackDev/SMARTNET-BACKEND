// routes/supportRoutes.js
const express = require('express');
const router = express.Router();
const supportController = require('../controllers/supportController');

// POST /api/support/submit
router.post('/submit', supportController.submitTicket);

// GET /api/support/tickets
router.get('/tickets', supportController.getTickets);

module.exports = router;