const webpush = require('web-push');
const pool = require('../config/database');

class PushService {
    constructor() {
        // Configure web-push with VAPID keys
        webpush.setVapidDetails(
            process.env.VAPID_SUBJECT || 'mailto:sweepingrota@gmail.com',
            process.env.VAPID_PUBLIC_KEY,
            process.env.VAPID_PRIVATE_KEY
        );
    }

    // Save subscription to database
    async saveSubscription(userId, subscription) {
        try {
            // Check if subscription exists
            const [existing] = await pool.query(
                'SELECT id FROM push_subscriptions WHERE user_id = ? AND endpoint = ?',
                [userId, subscription.endpoint]
            );

            if (existing.length > 0) {
                // Update existing
                await pool.query(
                    `UPDATE push_subscriptions 
                     SET subscription_data = ?, updated_at = CURRENT_TIMESTAMP 
                     WHERE id = ?`,
                    [JSON.stringify(subscription), existing[0].id]
                );
            } else {
                // Insert new
                await pool.query(
                    `INSERT INTO push_subscriptions (user_id, endpoint, subscription_data) 
                     VALUES (?, ?, ?)`,
                    [userId, subscription.endpoint, JSON.stringify(subscription)]
                );
            }

            console.log(`✅ Push subscription saved for user ${userId}`);
            return { success: true };
        } catch (error) {
            console.error('❌ Error saving subscription:', error);
            return { success: false, error: error.message };
        }
    }

    // Remove subscription
    async removeSubscription(userId, endpoint) {
        try {
            await pool.query(
                'DELETE FROM push_subscriptions WHERE user_id = ? AND endpoint = ?',
                [userId, endpoint]
            );
            console.log(`✅ Push subscription removed for user ${userId}`);
            return { success: true };
        } catch (error) {
            console.error('❌ Error removing subscription:', error);
            return { success: false, error: error.message };
        }
    }

    // Get all subscriptions for a user
    async getUserSubscriptions(userId) {
        try {
            const [subscriptions] = await pool.query(
                'SELECT subscription_data FROM push_subscriptions WHERE user_id = ?',
                [userId]
            );
            return subscriptions.map(s => JSON.parse(s.subscription_data));
        } catch (error) {
            console.error('❌ Error getting subscriptions:', error);
            return [];
        }
    }

    // Send notification to a specific user
    async sendNotification(userId, title, body, data = {}) {
        try {
            const subscriptions = await this.getUserSubscriptions(userId);
            
            if (subscriptions.length === 0) {
                console.log(`ℹ️ No push subscriptions for user ${userId}`);
                return { success: false, message: 'No subscriptions' };
            }

            const payload = JSON.stringify({
                title: title,
                body: body,
                data: data,
                icon: '/icon-192x192.png',
                badge: '/badge-96x96.png',
                vibrate: [200, 100, 200],
                requireInteraction: true,
                actions: [
                    {
                        action: 'open',
                        title: '📱 Open App'
                    },
                    {
                        action: 'swept',
                        title: '✅ Mark as Swept'
                    }
                ]
            });

            let sent = 0;
            let failed = 0;

            // Send to all subscriptions
            for (const subscription of subscriptions) {
                try {
                    await webpush.sendNotification(subscription, payload);
                    sent++;
                } catch (error) {
                    failed++;
                    // If subscription expired, remove it
                    if (error.statusCode === 410 || error.statusCode === 404) {
                        await this.removeSubscription(userId, subscription.endpoint);
                        console.log(`🗑️ Removed expired subscription for user ${userId}`);
                    }
                    console.error(`❌ Send failed: ${error.message}`);
                }
            }

            console.log(`📨 Push sent: ${sent} delivered, ${failed} failed`);
            return { success: true, sent, failed };

        } catch (error) {
            console.error('❌ Push send error:', error);
            return { success: false, error: error.message };
        }
    }

    // Send sweeping reminder via push
    async sendSweepingReminder(sweeper) {
        const appUrl = process.env.APP_URL || 'https://sweepingrota-production.up.railway.app';
        
        return await this.sendNotification(
            sweeper.user_id,
            '🧹 Time to Sweep!',
            `Good morning ${sweeper.name}! It's your day to sweep the room.`,
            {
                url: appUrl,
                rotaId: sweeper.id,
                type: 'sweep_reminder'
            }
        );
    }

    // Send swap notification via push
    async sendSwapNotification(userId, fromName, fromDate, toDate) {
        return await this.sendNotification(
            userId,
            '🔄 Swap Request',
            `${fromName} wants to swap days: ${fromDate} → ${toDate}`,
            {
                type: 'swap_request',
                url: process.env.APP_URL + '/swaps'
            }
        );
    }

    // Send achievement notification
    async sendAchievementNotification(userId, achievement) {
        return await this.sendNotification(
            userId,
            '🏆 Achievement Unlocked!',
            achievement,
            {
                type: 'achievement',
                url: process.env.APP_URL + '/profile'
            }
        );
    }
}

module.exports = PushService;