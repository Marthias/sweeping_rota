/**
 * Database migrations
 *
 * Creates the tables required by the application if they do not already
 * exist. This allows the app to boot successfully against a freshly
 * provisioned MySQL database without any manual setup.
 */

const CREATE_USERS_TABLE = `
    CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        phone VARCHAR(50),
        password_hash VARCHAR(255) NOT NULL,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
`;

const CREATE_ROTA_SCHEDULE_TABLE = `
    CREATE TABLE IF NOT EXISTS rota_schedule (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        schedule_date DATE NOT NULL,
        is_completed BOOLEAN DEFAULT FALSE,
        completed_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
    )
`;

/**
 * Runs all database migrations required for the app to function.
 * Safe to call on every startup — uses IF NOT EXISTS so it is idempotent.
 *
 * @param {import('mysql2/promise').Pool} pool
 */
async function runMigrations(pool) {
    console.log('🔧 Running database migrations...');

    try {
        await pool.query(CREATE_USERS_TABLE);
        console.log('✅ Migration: "users" table is ready');

        await pool.query(CREATE_ROTA_SCHEDULE_TABLE);
        console.log('✅ Migration: "rota_schedule" table is ready');

        console.log('✅ Database migrations completed successfully!');
    } catch (error) {
        console.error('❌ Database migrations failed:', error.message);
        throw error;
    }
}

module.exports = { runMigrations };
