const express = require('express');
const router = express.Router();
const ProfileController = require('../controllers/profileController');

// Get profile
router.get('/me', ProfileController.getProfile);

// Update profile
router.put('/update', ProfileController.updateProfile);

// Upload avatar - with multer middleware
router.post('/avatar', ProfileController.upload.single('avatar'), ProfileController.uploadAvatar);

// Change password
router.post('/change-password', ProfileController.changePassword);

// Delete account
router.delete('/delete-account', ProfileController.deleteAccount);

module.exports = router;