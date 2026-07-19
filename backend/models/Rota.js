const pool = require('../config/database');

class Rota {
    static async getTodaysSweeper() {
    const today = new Date().toISOString().split('T')[0];
    const [rows] = await pool.query(
        `SELECT r.*, u.name, u.email, u.phone, u.avatar_url 
         FROM rota_schedule r 
         JOIN users u ON r.user_id = u.id 
         WHERE r.schedule_date = ?`,
        [today]
    );
    return rows[0];
}

    static async getNextSweeper() {
    const today = new Date().toISOString().split('T')[0];
    const [rows] = await pool.query(
        `SELECT r.*, u.name, u.email, u.phone, u.avatar_url 
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

    static async getSweptHistory(limit = 10) {
    const [rows] = await pool.query(
        `SELECT r.*, u.name, u.email 
         FROM rota_schedule r 
         JOIN users u ON r.user_id = u.id 
         WHERE r.is_completed = TRUE 
         ORDER BY r.completed_at DESC 
         LIMIT ?`,
        [limit]
    );
    return rows;
}

static async getStats() {
    // Get total sweeps per user
    const [sweeps] = await pool.query(
        `SELECT u.id, u.name, COUNT(r.id) as total_sweeps 
         FROM users u 
         LEFT JOIN rota_schedule r ON u.id = r.user_id AND r.is_completed = TRUE 
         WHERE u.is_active = TRUE 
         GROUP BY u.id, u.name 
         ORDER BY total_sweeps DESC`
    );
    
    // Get current streak (consecutive days)
    const [streak] = await pool.query(
        `SELECT u.id, u.name, 
         (SELECT COUNT(*) FROM rota_schedule r2 
          WHERE r2.user_id = u.id 
          AND r2.is_completed = TRUE 
          AND r2.schedule_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)) as streak_30days
         FROM users u 
         WHERE u.is_active = TRUE 
         ORDER BY streak_30days DESC 
         LIMIT 1`
    );
    
    // Get total completed sweeps
    const [total] = await pool.query(
        `SELECT COUNT(*) as total FROM rota_schedule WHERE is_completed = TRUE`
    );
    
    return {
        sweeps,
        topStreak: streak[0] || null,
        totalCompleted: total[0]?.total || 0
    };
}


}

module.exports = Rota;