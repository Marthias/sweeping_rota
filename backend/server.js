const express = require('express');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const dotenv = require('dotenv');
const cron = require('node-cron');
const path = require('path');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const pushRoutes = require('./routes/push');

const PushService = require('./utils/pushService');
const pushService = new PushService();


// Import EmailService
const EmailService = require('./utils/emailService');
const emailService = new EmailService();

// Import routes
const authRoutes = require('./routes/auth');
const rotaRoutes = require('./routes/rota');
const profileRoutes = require('./routes/profile');
const swapRoutes = require('./routes/swap');

// Import models and utils
const Rota = require('./models/Rota');
const User = require('./models/User');
const NotificationService = require('./utils/notification');



dotenv.config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: process.env.CLIENT_URL || process.env.APP_URL || true,
        methods: ["GET", "POST"],
        credentials: true
    }
});

// Trust proxy when running behind Railway / other HTTPS proxies
app.set('trust proxy', 1);

// Database connection
const mysql = require('mysql2');
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'sweeping_rota',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});
const promisePool = pool.promise();

// Import migrations
const { runMigrations } = require('./migrations');

// Initialize database
(async () => {
    try {
        console.log('🔌 Connecting to database...');
        
        // Run migrations first to create tables
        await runMigrations(promisePool);
        
        // Test database connection
        const [rows] = await promisePool.query('SELECT 1');
        console.log('✅ Database connected successfully!');
        console.log('🚀 Database ready for operation');
    } catch (error) {
        console.error('❌ Database connection failed:', error.message);
        console.log('💡 Please check your database credentials in .env file');
        process.exit(1);
    }
})();

// Make pool available globally
app.set('db', promisePool);

const clientOrigin = process.env.CLIENT_URL || process.env.APP_URL || true;

// Middleware
app.use(cors({
    origin: clientOrigin,
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(session({
    secret: process.env.JWT_SECRET || 'sweeping_rota_secret_key_2024',
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        maxAge: 24 * 60 * 60 * 1000
    }
}));

// Serve static files from frontend
const frontendPath = path.resolve(__dirname, '../frontend');
const frontendExists = require('fs').existsSync(frontendPath);

if (frontendExists) {
    app.use(express.static(frontendPath));
    app.get('/', (req, res) => {
        res.sendFile(path.join(frontendPath, 'index.html'));
    });
} else {
    app.get('/', (req, res) => {
        res.status(200).json({
            status: 'ok',
            message: 'Backend is running, but the frontend assets are not available in this deployment.'
        });
    });
}

// ============================================
// USE ROUTES
// ============================================

app.use('/api/auth', authRoutes);
app.use('/api/rota', rotaRoutes);
app.use('/api/swap', swapRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/push', pushRoutes);

// ============================================
// NOTIFICATION SERVICE
// ============================================

const notificationService = new NotificationService(io);

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


// Update cron job
cron.schedule('0 7 * * *', async () => {
    try {
        const todaySweeper = await Rota.getTodaysSweeper();
        
        if (todaySweeper && !todaySweeper.is_completed) {
            const today = new Date().toISOString().split('T')[0];
            
            // 1. Socket.io notification
            notificationService.sendRealtimeNotification(
                todaySweeper.user_id, 
                `🧹 Good morning ${todaySweeper.name}! It's your day to sweep the room.`
            );
            
            // 2. Email notification
            await emailService.sendSweepingReminder(todaySweeper, today);
            
            // // 3. WhatsApp notification (if available)
            // if (todaySweeper.whatsapp_enabled) {
            //     await whatsappService.sendSweepingReminder(todaySweeper, today);
            // }
            
            // 4. Push notification (NEW!)
            const pushResult = await pushService.sendSweepingReminder(todaySweeper);
            if (pushResult.success && pushResult.sent > 0) {
                console.log(`🔔 Push notification sent to ${todaySweeper.name}`);
            }
            
            console.log(`📨 Morning reminders sent to: ${todaySweeper.name}`);
        }
    } catch (error) {
        console.error('Error sending daily reminders:', error);
    }
});

// Health check
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        database: 'Connected',
        session: 'Active'
    });
});

// ============================================
// TEST EMAIL ENDPOINT
// ============================================

app.post('/api/test-email', async (req, res) => {
    try {
        const { email, name } = req.body;
        
        console.log('📧 Test email request received:', { email, name });
        
        if (!email) {
            return res.status(400).json({ 
                success: false, 
                error: 'Email is required' 
            });
        }
        
        // Make sure EmailService is imported
        const EmailService = require('./utils/emailService');
        const emailService = new EmailService();
        
        const result = await emailService.sendSweepingReminder(
            { 
                email: email, 
                name: name || 'Test User' 
            },
            new Date().toISOString().split('T')[0]
        );
        
        if (result.success) {
            res.json({ 
                success: true, 
                message: '✅ Test email sent successfully! Check your inbox.' 
            });
        } else {
            res.status(500).json({ 
                success: false, 
                error: '❌ Email failed: ' + result.error 
            });
        }
    } catch (error) {
        console.error('Test email error:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// ============================================
// START SERVER
// ============================================

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`\n🚀 Server running on port ${PORT}`);
    console.log(`📱 Open your browser: http://localhost:${PORT}`);
    console.log(`🔌 Socket.io is ready for real-time notifications`);
});
