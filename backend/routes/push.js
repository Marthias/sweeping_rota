const express = require('express');
const router = express.Router();
const PushService = require('../utils/pushService');

const pushService = new PushService();

// Subscribe to push notifications
router.post('/subscribe', async (req, res) => {
    try {
        const userId = req.session.userId;
        
        if (!userId) {
            return res.status(401).json({
                success: false,
                error: 'Not authenticated'
            });
        }

        const { subscription } = req.body;
        
        if (!subscription) {
            return res.status(400).json({
                success: false,
                error: 'Subscription data required'
            });
        }

        const result = await pushService.saveSubscription(userId, subscription);
        
        if (result.success) {
            res.json({
                success: true,
                message: 'Push notifications enabled'
            });
        } else {
            res.status(500).json({
                success: false,
                error: result.error
            });
        }
    } catch (error) {
        console.error('Subscribe error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Unsubscribe from push notifications
router.post('/unsubscribe', async (req, res) => {
    try {
        const userId = req.session.userId;
        
        if (!userId) {
            return res.status(401).json({
                success: false,
                error: 'Not authenticated'
            });
        }

        const { endpoint } = req.body;
        
        if (!endpoint) {
            return res.status(400).json({
                success: false,
                error: 'Endpoint required'
            });
        }

        const result = await pushService.removeSubscription(userId, endpoint);
        
        if (result.success) {
            res.json({
                success: true,
                message: 'Push notifications disabled'
            });
        } else {
            res.status(500).json({
                success: false,
                error: result.error
            });
        }
    } catch (error) {
        console.error('Unsubscribe error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Test notification (for debugging)
router.post('/test', async (req, res) => {
    try {
        const userId = req.session.userId;
        
        if (!userId) {
            return res.status(401).json({
                success: false,
                error: 'Not authenticated'
            });
        }

        const result = await pushService.sendNotification(
            userId,
            '🔔 Test Notification',
            'This is a test push notification from Sweeping Rota!',
            { type: 'test' }
        );

        res.json({
            success: result.success,
            message: result.success ? 'Test notification sent!' : 'Failed to send test',
            details: result
        });
    } catch (error) {
        console.error('Test error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;