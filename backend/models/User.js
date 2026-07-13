const pool = require('../config/database');
const bcrypt = require('bcryptjs');

class User {
    static async create(userData) {
        const { name, email, phone, password } = userData;
        const hashedPassword = await bcrypt.hash(password, 10);
        
        const [result] = await pool.query(
            'INSERT INTO users (name, email, phone, password_hash) VALUES (?, ?, ?, ?)',
            [name, email, phone, hashedPassword]
        );
        return result.insertId;
    }

    static async findByEmail(email) {
        const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
        return rows[0];
    }

    static async findById(id) {
        const [rows] = await pool.query('SELECT id, name, email, phone, is_active FROM users WHERE id = ?', [id]);
        return rows[0];
    }

    static async getAllActive() {
        const [rows] = await pool.query('SELECT id, name, email, phone FROM users WHERE is_active = TRUE');
        return rows;
    }
}

module.exports = User;