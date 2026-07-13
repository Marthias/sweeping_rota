class SweepingRotaApp {
    constructor() {
        this.apiBase = '';
        this.currentUser = null;
        this.todaySweeper = null;
        this.init();
    }

    async init() {
        this.setupAuthListeners();
        this.setupEventListeners();
        this.updateTime();
        setInterval(() => this.updateTime(), 1000);
        
        // Check if user is already logged in
        await this.checkAuth();
    }

    updateTime() {
        const now = new Date();
        const timeElement = document.getElementById('currentTime');
        if (timeElement) {
            timeElement.textContent = now.toLocaleString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        }
    }

    // ============================================
    // AUTHENTICATION
    // ============================================

    async checkAuth() {
        try {
            const response = await fetch('/api/auth/me', {
                credentials: 'include'
            });
            
            if (response.ok) {
                const data = await response.json();
                this.currentUser = data.user;
                this.showMainApp();
            } else {
                this.showLoginScreen();
            }
        } catch (error) {
            console.error('Auth check failed:', error);
            this.showLoginScreen();
        }
    }

    showLoginScreen() {
        document.getElementById('loginScreen').style.display = 'block';
        document.getElementById('registerScreen').style.display = 'none';
        document.getElementById('mainApp').style.display = 'none';
    }

    showRegisterScreen() {
        document.getElementById('loginScreen').style.display = 'none';
        document.getElementById('registerScreen').style.display = 'block';
        document.getElementById('mainApp').style.display = 'none';
    }

    showMainApp() {
        document.getElementById('loginScreen').style.display = 'none';
        document.getElementById('registerScreen').style.display = 'none';
        document.getElementById('mainApp').style.display = 'block';
        
        document.getElementById('userName').textContent = `👋 ${this.currentUser.name}`;
        
        // Load data
        this.loadTodaySweeper();
        this.loadUpcomingSchedule();
        
        // Register for notifications
        if (window.socketManager) {
            window.socketManager.registerUser(this.currentUser.id);
        }
    }

    setupAuthListeners() {
        // Login
        document.getElementById('loginForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('loginEmail').value;
            const password = document.getElementById('loginPassword').value;
            
            try {
                const response = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password }),
                    credentials: 'include'
                });
                
                const data = await response.json();
                
                if (data.success) {
                    this.currentUser = data.user;
                    this.showMainApp();
                    this.showNotification('Welcome back! 🎉', 'success');
                } else {
                    this.showError('loginError', data.error || 'Invalid credentials');
                }
            } catch (error) {
                this.showError('loginError', 'Login failed. Please try again.');
            }
        });

        // Register
        document.getElementById('registerForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('regName').value;
            const email = document.getElementById('regEmail').value;
            const phone = document.getElementById('regPhone').value;
            const password = document.getElementById('regPassword').value;
            
            try {
                const response = await fetch('/api/auth/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, email, phone, password }),
                    credentials: 'include'
                });
                
                const data = await response.json();
                
                if (data.success) {
                    this.showNotification('Account created! Please login. 🎉', 'success');
                    this.showLoginScreen();
                    document.getElementById('loginEmail').value = email;
                    document.getElementById('loginPassword').value = '';
                } else {
                    this.showError('registerError', data.error || 'Registration failed');
                }
            } catch (error) {
                this.showError('registerError', 'Registration failed. Please try again.');
            }
        });

        // Switch between login and register
        document.getElementById('showRegister').addEventListener('click', (e) => {
            e.preventDefault();
            this.showRegisterScreen();
        });

        document.getElementById('showLogin').addEventListener('click', (e) => {
            e.preventDefault();
            this.showLoginScreen();
        });

        // Logout
        document.getElementById('logoutBtn').addEventListener('click', async () => {
            try {
                await fetch('/api/auth/logout', {
                    method: 'POST',
                    credentials: 'include'
                });
                this.currentUser = null;
                this.showLoginScreen();
                this.showNotification('Logged out successfully', 'info');
            } catch (error) {
                console.error('Logout failed:', error);
            }
        });
    }

    showError(elementId, message) {
        const element = document.getElementById(elementId);
        element.textContent = message;
        element.style.display = 'block';
        setTimeout(() => {
            element.style.display = 'none';
        }, 5000);
    }

    // ============================================
    // ROTA FUNCTIONS
    // ============================================

    async loadTodaySweeper() {
        try {
            const response = await fetch('/api/rota/today', {
                credentials: 'include'
            });
            const data = await response.json();
            
            if (data.success && data.data) {
                this.todaySweeper = data.data;
                this.displaySweeper(data.data);
            } else {
                document.getElementById('sweeperInfo').innerHTML = 
                    '<p style="color: #666;">No sweeper assigned for today</p>';
            }
        } catch (error) {
            console.error('Error loading today\'s sweeper:', error);
            document.getElementById('sweeperInfo').innerHTML = 
                '<p style="color: #dc3545;">Failed to load today\'s sweeper</p>';
        }
    }

    displaySweeper(sweeper) {
        const sweeperInfo = document.getElementById('sweeperInfo');
        const isCompleted = sweeper.is_completed;
        const isCurrentUser = this.currentUser && this.currentUser.id === sweeper.user_id;
        
        sweeperInfo.innerHTML = `
            <div class="sweeper-card">
                <div class="name">${sweeper.name}</div>
                <div class="details">
                    <i class="fas fa-envelope"></i> ${sweeper.email || 'No email'}<br>
                    <i class="fas fa-phone"></i> ${sweeper.phone || 'No phone'}
                    ${isCurrentUser ? '<br><i class="fas fa-star" style="color: #ffc107;"></i> <strong>You!</strong>' : ''}
                </div>
                <div class="badge ${isCompleted ? 'badge-success' : 'badge-warning'}">
                    ${isCompleted ? '✅ Swept Today' : '⏳ Pending'}
                </div>
            </div>
        `;

        // Enable/disable swept button
        const sweptBtn = document.getElementById('sweptBtn');
        if (isCurrentUser && !isCompleted) {
            sweptBtn.disabled = false;
            sweptBtn.innerHTML = '<i class="fas fa-check"></i> I\'ve Swept!';
        } else {
            sweptBtn.disabled = true;
            if (isCompleted) {
                sweptBtn.innerHTML = '<i class="fas fa-check-circle"></i> Already Swept';
            } else if (!isCurrentUser) {
                sweptBtn.innerHTML = '<i class="fas fa-user"></i> Not Your Turn';
            }
        }
    }

    async loadUpcomingSchedule() {
        try {
            const response = await fetch('/api/rota/upcoming', {
                credentials: 'include'
            });
            const data = await response.json();
            
            if (data.success && data.data) {
                this.displaySchedule(data.data);
            }
        } catch (error) {
            console.error('Error loading schedule:', error);
        }
    }

    displaySchedule(schedule) {
        const list = document.getElementById('scheduleList');
        
        if (schedule.length === 0) {
            list.innerHTML = '<li style="text-align: center; color: #666; padding: 20px;">No upcoming schedule</li>';
            return;
        }

        list.innerHTML = schedule.map(item => {
            const date = new Date(item.schedule_date);
            const dateStr = date.toLocaleDateString('en-US', { 
                weekday: 'short', 
                month: 'short', 
                day: 'numeric' 
            });
            
            const isCurrentUser = this.currentUser && this.currentUser.id === item.user_id;
            
            return `
                <li class="schedule-item">
                    <span class="date">${dateStr}</span>
                    <span class="person">
                        ${item.name} ${isCurrentUser ? '⭐' : ''}
                        <span class="status ${item.is_completed ? 'status-completed' : 'status-pending'}">
                            ${item.is_completed ? '✅' : '⏳'}
                        </span>
                    </span>
                </li>
            `;
        }).join('');
    }

    async markAsSwept() {
        if (!this.todaySweeper) return;
        
        try {
            const response = await fetch('/api/rota/swept', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ rotaId: this.todaySweeper.id }),
                credentials: 'include'
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.showNotification('✅ Great job! Room marked as swept! 🎉', 'success');
                await this.loadTodaySweeper();
                await this.loadUpcomingSchedule();
            } else {
                this.showNotification('❌ Failed to mark as swept', 'error');
            }
        } catch (error) {
            console.error('Error marking as swept:', error);
            this.showNotification('❌ Error marking as swept', 'error');
        }
    }

    async generateRota() {
        try {
            const response = await fetch('/api/rota/generate', {
                method: 'POST',
                credentials: 'include'
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.showNotification('✅ New rota generated successfully!', 'success');
                await this.loadTodaySweeper();
                await this.loadUpcomingSchedule();
            } else {
                this.showNotification('❌ Failed to generate rota', 'error');
            }
        } catch (error) {
            console.error('Error generating rota:', error);
            this.showNotification('❌ Error generating rota', 'error');
        }
    }

    // ============================================
    // UI HELPERS
    // ============================================

    showNotification(message, type = 'info') {
        const notification = document.getElementById('notification');
        const notificationMessage = document.getElementById('notificationMessage');
        
        notificationMessage.textContent = message;
        notification.style.display = 'flex';
        notification.style.background = type === 'success' ? '#28a745' : 
                                     type === 'error' ? '#dc3545' : '#333';
        
        setTimeout(() => {
            notification.style.display = 'none';
        }, 5000);
    }

    setupEventListeners() {
        document.getElementById('sweptBtn').addEventListener('click', () => {
            this.markAsSwept();
        });
        
        document.getElementById('generateRotaBtn').addEventListener('click', () => {
            this.generateRota();
        });
        
        document.getElementById('closeNotification').addEventListener('click', () => {
            document.getElementById('notification').style.display = 'none';
        });
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const app = new SweepingRotaApp();
    window.app = app;
});