const Rota = require('../models/Rota');
const User = require('../models/User');

class RotaController {
    static async getToday(req, res) {
        try {
            const sweeper = await Rota.getTodaysSweeper();
            if (!sweeper) {
                // Generate rota for the week if none exists
                const users = await User.getAllActive();
                await Rota.createWeeklyRota(users);
                const newSweeper = await Rota.getTodaysSweeper();
                return res.json({ success: true, data: newSweeper });
            }
            res.json({ success: true, data: sweeper });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    static async markSwept(req, res) {
        try {
            const { rotaId } = req.body;
            const success = await Rota.markAsSwept(rotaId);
            if (success) {
                // Get next sweeper for response
                const nextSweeper = await Rota.getNextSweeper();
                res.json({ 
                    success: true, 
                    message: 'Room swept!',
                    nextSweeper 
                });
            } else {
                res.status(400).json({ error: 'Failed to mark as swept' });
            }
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    static async getUpcoming(req, res) {
        try {
            const schedule = await Rota.getUpcomingSchedule();
            res.json({ success: true, data: schedule });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    static async generateWeekly(req, res) {
        try {
            const users = await User.getAllActive();
            if (users.length === 0) {
                return res.status(400).json({ error: 'No active users found' });
            }
            await Rota.createWeeklyRota(users);
            res.json({ success: true, message: 'Weekly rota generated' });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    static async getHistory(req, res) {
    try {
        const history = await Rota.getSweptHistory(10);
        res.json({ success: true, data: history });
    } catch (error) {
        console.error('Error getting history:', error);
        res.status(500).json({ error: 'Failed to get history' });
    }
}

static async getStats(req, res) {
    try {
        const stats = await Rota.getStats();
        res.json({ success: true, data: stats });
    } catch (error) {
        console.error('Error getting stats:', error);
        res.status(500).json({ error: 'Failed to get stats' });
    }
}


}

module.exports = RotaController;