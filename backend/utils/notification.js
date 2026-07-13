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
            return true;
        } else {
            console.log(`⚠️ User ${userId} is not connected`);
            return false;
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

    // Broadcast to all connected clients
    broadcast(message) {
        this.io.emit('notification', {
            message,
            timestamp: new Date().toISOString(),
            type: 'broadcast'
        });
    }
}

module.exports = NotificationService;