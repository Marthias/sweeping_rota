const express = require('express');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const dotenv = require('dotenv');
const cron = require('node-cron');
const path = require('path');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcryptjs');

dotenv.config({ path: path.join(__dirname, '../.env') });

const promisePool = require("./config/database");

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "http://localhost:3000",
        methods: ["GET", "POST"],
        credentials: true
    }
});

// Test database connection
(async () => {
    try {
        const [rows] = await promisePool.query('SELECT 1');
        console.log('✅ Database connected successfully!');
    } catch (error) {
        console.error('❌ Database connection failed:', error.message);
        console.log('💡 Please check your MySQL credentials in .env file');
        process.exit(1);
    }
})();

// Middleware
app.use(cors({
    origin: "http://localhost:3000",
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(session({
    secret: 'sweeping_rota_secret_key_2024', // Simple hardcoded secret for now
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: false, 
        maxAge: 24 * 60 * 60 * 1000
    }
}));

// Serve static files from frontend
app.use(express.static(path.join(__dirname, '../frontend')));

// Serve the main HTML file
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// ============================================
// DATABASE HELPER FUNCTIONS
// ============================================

class User {
    static async create(userData) {
        const { name, email, phone, password } = userData;
        const hashedPassword = await bcrypt.hash(password, 10);
        
        const [result] = await promisePool.query(
            'INSERT INTO users (name, email, phone, password_hash) VALUES (?, ?, ?, ?)',
            [name, email, phone, hashedPassword]
        );
        return result.insertId;
    }

    static async findByEmail(email) {
        const [rows] = await promisePool.query('SELECT * FROM users WHERE email = ?', [email]);
        return rows[0];
    }

    static async findById(id) {
        const [rows] = await promisePool.query('SELECT id, name, email, phone, is_active FROM users WHERE id = ?', [id]);
        return rows[0];
    }

    static async getAllActive() {
        const [rows] = await promisePool.query('SELECT id, name, email, phone FROM users WHERE is_active = TRUE');
        return rows;
    }
}

class Rota {
    static async getTodaysSweeper() {
        const today = new Date().toISOString().split('T')[0];
        const [rows] = await promisePool.query(
            `SELECT r.*, u.name, u.email, u.phone 
             FROM rota_schedule r 
             JOIN users u ON r.user_id = u.id 
             WHERE r.schedule_date = ?`,
            [today]
        );
        return rows[0];
    }

    static async getNextSweeper() {
        const today = new Date().toISOString().split('T')[0];
        const [rows] = await promisePool.query(
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
        startDate.setDate(today.getDate() + (7 - today.getDay()) % 7);
        
        const results = [];
        for (let i = 0; i < 7; i++) {
            const date = new Date(startDate);
            date.setDate(startDate.getDate() + i);
            const dateStr = date.toISOString().split('T')[0];
            
            const [existing] = await promisePool.query(
                'SELECT id FROM rota_schedule WHERE schedule_date = ?',
                [dateStr]
            );
            
            if (existing.length === 0) {
                const userIndex = i % users.length;
                const [result] = await promisePool.query(
                    'INSERT INTO rota_schedule (user_id, schedule_date) VALUES (?, ?)',
                    [users[userIndex].id, dateStr]
                );
                results.push(result.insertId);
            }
        }
        return results;
    }

    static async markAsSwept(rotaId) {
        const [result] = await promisePool.query(
            'UPDATE rota_schedule SET is_completed = TRUE, completed_at = CURRENT_TIMESTAMP WHERE id = ?',
            [rotaId]
        );
        return result.affectedRows > 0;
    }

    static async getUpcomingSchedule(limit = 7) {
        const today = new Date().toISOString().split('T')[0];
        const [rows] = await promisePool.query(
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

// ============================================
// NOTIFICATION SERVICE
// ============================================

class NotificationService {
    constructor(io) {
        this.io = io;
        this.clients = new Map();
    }

    sendRealtimeNotification(userId, message) {
        const clientSocket = this.clients.get(userId);
        if (clientSocket) {
            clientSocket.emit('notification', {
                message,
                timestamp: new Date().toISOString(),
                type: 'daily_reminder'
            });
            console.log(`📨 Notification sent to user ${userId}`);
        } else {
            console.log(`⚠️ User ${userId} is not connected`);
        }
    }

    registerClient(userId, socket) {
        this.clients.set(userId, socket);
        console.log(`👤 User ${userId} registered for notifications`);
    }

    unregisterClient(userId) {
        this.clients.delete(userId);
        console.log(`👋 User ${userId} disconnected`);
    }
}

const notificationService = new NotificationService(io);

// ============================================
// AUTH ROUTES
// ============================================

// Register user
app.post('/api/auth/register', async (req, res) => {
    try {
        const { name, email, phone, password } = req.body;
        
        // Validate input
        if (!name || !email || !password) {
            return res.status(400).json({ error: 'Name, email and password are required' });
        }
        
        const existingUser = await User.findByEmail(email);
        if (existingUser) {
            return res.status(400).json({ error: 'User already exists' });
        }
        
        const userId = await User.create({ name, email, phone, password });
        res.json({ success: true, message: 'User registered successfully! Please login.', userId });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Login user
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }
        
        const user = await User.findByEmail(email);
        
        if (!user) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }
        
        const validPassword = await bcrypt.compare(password, user.password_hash);
        
        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }
        
        req.session.userId = user.id;
        req.session.user = {
            id: user.id,
            name: user.name,
            email: user.email
        };
        
        res.json({ 
            success: true, 
            user: {
                id: user.id,
                name: user.name,
                email: user.email
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed. Please try again.' });
    }
});

// Logout
app.post('/api/auth/logout', (req, res) => {
    req.session.destroy();
    res.json({ success: true, message: 'Logged out' });
});

// Get current user
app.get('/api/auth/me', async (req, res) => {
    try {
        if (!req.session.userId) {
            return res.status(401).json({ error: 'Not authenticated' });
        }
        
        const user = await User.findById(req.session.userId);
        if (!user) {
            return res.status(401).json({ error: 'User not found' });
        }
        
        res.json({ user });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// ROTA ROUTES
// ============================================

// Get today's sweeper
app.get('/api/rota/today', async (req, res) => {
    try {
        let sweeper = await Rota.getTodaysSweeper();
        if (!sweeper) {
            const users = await User.getAllActive();
            if (users.length > 0) {
                await Rota.createWeeklyRota(users);
                sweeper = await Rota.getTodaysSweeper();
            }
        }
        res.json({ success: true, data: sweeper });
    } catch (error) {
        console.error('Error getting today\'s sweeper:', error);
        res.status(500).json({ error: error.message });
    }
});

// Mark as swept
app.post('/api/rota/swept', async (req, res) => {
    try {
        const { rotaId } = req.body;
        if (!rotaId) {
            return res.status(400).json({ error: 'Rota ID required' });
        }
        
        const success = await Rota.markAsSwept(rotaId);
        if (success) {
            const nextSweeper = await Rota.getNextSweeper();
            res.json({ 
                success: true, 
                message: 'Room swept! 🎉',
                nextSweeper 
            });
        } else {
            res.status(400).json({ error: 'Failed to mark as swept' });
        }
    } catch (error) {
        console.error('Error marking as swept:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get upcoming schedule
app.get('/api/rota/upcoming', async (req, res) => {
    try {
        const schedule = await Rota.getUpcomingSchedule(7);
        res.json({ success: true, data: schedule });
    } catch (error) {
        console.error('Error getting upcoming schedule:', error);
        res.status(500).json({ error: error.message });
    }
});

// Generate weekly rota
app.post('/api/rota/generate', async (req, res) => {
    try {
        const users = await User.getAllActive();
        if (users.length === 0) {
            return res.status(400).json({ error: 'No active users found' });
        }
        await Rota.createWeeklyRota(users);
        res.json({ success: true, message: 'Weekly rota generated successfully' });
    } catch (error) {
        console.error('Error generating rota:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// SOCKET.IO CONNECTION
// ============================================

io.on('connection', (socket) => {
    console.log('🟢 New client connected');
    
    socket.on('register_user', (userId) => {
        notificationService.registerClient(userId, socket);
    });

    socket.on('disconnect', () => {
        for (let [userId, clientSocket] of notificationService.clients) {
            if (clientSocket === socket) {
                notificationService.unregisterClient(userId);
                break;
            }
        }
    });
});

// ============================================
// CRON JOB - 7:00 AM DAILY REMINDER
// ============================================

cron.schedule('0 7 * * *', async () => {
    try {
        const todaySweeper = await Rota.getTodaysSweeper();
        if (todaySweeper && !todaySweeper.is_completed) {
            const message = `🧹 Good morning ${todaySweeper.name}! It's your day to sweep the room. Please mark as swept when done.`;
            notificationService.sendRealtimeNotification(todaySweeper.user_id, message);
            console.log('📨 Morning reminder sent to:', todaySweeper.name);
        }
    } catch (error) {
        console.error('Error sending daily reminder:', error);
    }
});

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// ============================================
// START SERVER
// ============================================

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`\n🚀 Server running on http://localhost:${PORT}`);
    console.log(`📱 Open your browser: http://localhost:${PORT}`);
    console.log(`🔌 Socket.io is ready for real-time notifications`);
    console.log(`\n📝 Default Login Credentials:`);
    console.log(`   john@example.com / password123`);
    console.log(`   jane@example.com / password123`);
    console.log(`   bob@example.com / password123`);
    console.log(`\n💡 Or register a new account!\n`);
});