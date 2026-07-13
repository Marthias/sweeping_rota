class SocketManager {
    constructor() {
        this.socket = io('http://localhost:3000', {
            withCredentials: true
        });
        this.setupSocketListeners();
    }

    setupSocketListeners() {
        this.socket.on('connect', () => {
            console.log('🟢 Connected to server');
        });

        this.socket.on('notification', (data) => {
            console.log('📨 Received notification:', data);
            if (window.app) {
                window.app.showNotification(data.message, 'info');
            }
        });

        this.socket.on('disconnect', () => {
            console.log('🔴 Disconnected from server');
        });
    }

    registerUser(userId) {
        if (userId) {
            this.socket.emit('register_user', userId);
            console.log(`👤 User ${userId} registered for notifications`);
        }
    }
}

// Initialize socket connection
const socketManager = new SocketManager();
window.socketManager = socketManager;