const express = require('express');
const router = express.Router();
const RotaController = require('../controllers/rotaController');

// Get today's sweeper
router.get('/today', RotaController.getToday);

// Mark as swept
router.post('/swept', RotaController.markSwept);

// Get upcoming schedule
router.get('/upcoming', RotaController.getUpcoming);

// Generate weekly rota
router.post('/generate', RotaController.generateWeekly);

//Get rota stats
router.get('/stats', RotaController.getStats);

module.exports = router;