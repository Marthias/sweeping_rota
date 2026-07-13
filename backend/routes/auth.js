const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/authController');

// Register route
router.post('/register', AuthController.register);

// Login route
router.post('/login', AuthController.login);

// Logout route
router.post('/logout', AuthController.logout);

// Get current user
router.get('/me', AuthController.getCurrentUser);

module.exports = router;