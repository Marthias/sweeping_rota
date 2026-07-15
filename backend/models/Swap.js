const pool = require('../config/database');

class Swap {
    // Create swap request
    static async createRequest(data) {
        const { from_user_id, to_user_id, from_date, to_date, message } = data;
        
        // Check if dates are valid
        const [existing] = await pool.query(
            `SELECT id FROM swap_requests 
             WHERE (from_user_id = ? OR to_user_id = ?) 
             AND status = 'pending'
             AND (from_date = ? OR to_date = ?)`,
            [from_user_id, to_user_id, from_date, to_date]
        );
        
        if (existing.length > 0) {
            throw new Error('A pending swap request already exists for these dates');
        }
        
        const [result] = await pool.query(
            `INSERT INTO swap_requests (from_user_id, to_user_id, from_date, to_date, message) 
             VALUES (?, ?, ?, ?, ?)`,
            [from_user_id, to_user_id, from_date, to_date, message]
        );
        
        return result.insertId;
    }

    // Get pending swap requests for user
    static async getPendingRequests(userId) {
        const [rows] = await pool.query(
            `SELECT 
                sr.*,
                fu.name as from_name,
                tu.name as to_name,
                fu.email as from_email,
                tu.email as to_email
             FROM swap_requests sr
             JOIN users fu ON sr.from_user_id = fu.id
             JOIN users tu ON sr.to_user_id = tu.id
             WHERE (sr.from_user_id = ? OR sr.to_user_id = ?)
             AND sr.status = 'pending'
             ORDER BY sr.created_at DESC`,
            [userId, userId]
        );
        return rows;
    }

    // Get all swap requests (admin)
    static async getAllRequests() {
        const [rows] = await pool.query(
            `SELECT 
                sr.*,
                fu.name as from_name,
                tu.name as to_name
             FROM swap_requests sr
             JOIN users fu ON sr.from_user_id = fu.id
             JOIN users tu ON sr.to_user_id = tu.id
             ORDER BY sr.created_at DESC
             LIMIT 50`
        );
        return rows;
    }

    // Approve swap request
    static async approveRequest(requestId) {
        // Get request details
        const [request] = await pool.query(
            'SELECT * FROM swap_requests WHERE id = ?',
            [requestId]
        );
        
        if (request.length === 0) {
            throw new Error('Swap request not found');
        }
        
        const swap = request[0];
        
        // Start transaction
        const connection = await pool.getConnection();
        await connection.beginTransaction();
        
        try {
            // Update request status
            await connection.query(
                'UPDATE swap_requests SET status = "approved" WHERE id = ?',
                [requestId]
            );
            
            // Swap the dates in rota_schedule
            await connection.query(
                `UPDATE rota_schedule 
                 SET user_id = ? 
                 WHERE schedule_date = ?`,
                [swap.to_user_id, swap.from_date]
            );
            
            await connection.query(
                `UPDATE rota_schedule 
                 SET user_id = ? 
                 WHERE schedule_date = ?`,
                [swap.from_user_id, swap.to_date]
            );
            
            await connection.commit();
            return true;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    // Reject swap request
    static async rejectRequest(requestId) {
        const [result] = await pool.query(
            'UPDATE swap_requests SET status = "rejected" WHERE id = ?',
            [requestId]
        );
        return result.affectedRows > 0;
    }

    // Cancel swap request (by creator)
    static async cancelRequest(requestId, userId) {
        const [result] = await pool.query(
            'UPDATE swap_requests SET status = "cancelled" WHERE id = ? AND from_user_id = ?',
            [requestId, userId]
        );
        return result.affectedRows > 0;
    }

    // Get swap history
    static async getHistory(userId) {
        const [rows] = await pool.query(
            `SELECT 
                sr.*,
                fu.name as from_name,
                tu.name as to_name
             FROM swap_requests sr
             JOIN users fu ON sr.from_user_id = fu.id
             JOIN users tu ON sr.to_user_id = tu.id
             WHERE (sr.from_user_id = ? OR sr.to_user_id = ?)
             AND sr.status != 'pending'
             ORDER BY sr.updated_at DESC
             LIMIT 20`,
            [userId, userId]
        );
        return rows;
    }
}

module.exports = Swap;