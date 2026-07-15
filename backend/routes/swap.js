const express = require('express');
const router = express.Router();
const SwapController = require('../controllers/swapController');

// Create swap request
router.post('/request', SwapController.createRequest);

// Get pending swaps for current user
router.get('/pending', SwapController.getPending);

// Get all swap requests (admin)
router.get('/all', SwapController.getAll);

// Approve swap
router.post('/approve', SwapController.approve);

// Reject swap
router.post('/reject', SwapController.reject);

// Cancel swap
router.post('/cancel', SwapController.cancel);

// Get swap history
router.get('/history', SwapController.getHistory);

module.exports = router;