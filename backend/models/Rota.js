const pool = require('../config/database');

class Rota {
    static async getTodaysSweeper() {
        const today = new Date().toISOString().split('T')[0];
        const [rows] = await pool.query(
            `SELECT r.*, u.name, u.email, u.phone 
             FROM rota_schedule r 
             JOIN users u ON r.user_id = u.id 
             WHERE r.schedule_date = ? AND r.is_completed = FALSE`,
            [today]
        );
        return rows[0];
    }

    static async getNextSweeper() {
        const today = new Date().toISOString().split('T')[0];
        const [rows] = await pool.query(
            `SELECT r.*, u.name, u.email, u.phone 
             FROM rota_schedule r 
             JOIN users u ON r.user_id = u.id 
             WHERE r.schedule_date > ? AND r.is_completed = FALSE 
             ORDER BY r.schedule_date ASC LIMIT 1`,
            [today]
        );
        return rows[0];
    }

    static async createWeeklyRota(users) {
        const today = new Date();
        const startDate = new Date(today);
        startDate.setDate(today.getDate() + (7 - today.getDay()) % 7); // Next Monday
        
        const results = [];
        for (let i = 0; i < 7; i++) {
            const date = new Date(startDate);
            date.setDate(startDate.getDate() + i);
            const dateStr = date.toISOString().split('T')[0];
            
            // Check if already exists
            const [existing] = await pool.query(
                'SELECT id FROM rota_schedule WHERE schedule_date = ?',
                [dateStr]
            );
            
            if (existing.length === 0) {
                const userIndex = i % users.length;
                const [result] = await pool.query(
                    'INSERT INTO rota_schedule (user_id, schedule_date) VALUES (?, ?)',
                    [users[userIndex].id, dateStr]
                );
                results.push(result.insertId);
            }
        }
        return results;
    }

    static async markAsSwept(rotaId) {
        const [result] = await pool.query(
            'UPDATE rota_schedule SET is_completed = TRUE, completed_at = CURRENT_TIMESTAMP WHERE id = ?',
            [rotaId]
        );
        return result.affectedRows > 0;
    }

    static async getUpcomingSchedule(limit = 7) {
        const today = new Date().toISOString().split('T')[0];
        const [rows] = await pool.query(
            `SELECT r.*, u.name, u.email 
             FROM rota_schedule r 
             JOIN users u ON r.user_id = u.id 
             WHERE r.schedule_date >= ? 
             ORDER BY r.schedule_date ASC 
             LIMIT ?`,
            [today, limit]
        );
        return rows;
    }
}

module.exports = Rota;