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
        this.setupSettings();
        this.updateTime();
        setInterval(() => this.updateTime(), 1000);
        
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
        
        // Check saved dark mode
        const savedDarkMode = localStorage.getItem('darkMode') === 'true';
        if (savedDarkMode) {
            document.body.classList.add('dark-mode');
            const darkModeToggle = document.getElementById('darkModeToggle');
            if (darkModeToggle) {
                darkModeToggle.checked = true;
            }
        }
        
        this.loadTodaySweeper();
        this.loadUpcomingSchedule();
        this.loadSweptHistory();
        this.loadStats(); 
        
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
    // SETTINGS & MODAL CONTROLS
    // ============================================

    setupSettings() {
        console.log('Setting up settings...');
        
        const settingsBtn = document.getElementById('settingsBtn');
        const settingsModal = document.getElementById('settingsModal');
        const closeSettings = document.getElementById('closeSettings');
        const darkModeToggle = document.getElementById('darkModeToggle');
        const logoutBtnSettings = document.getElementById('logoutBtnSettings');
        const logoutModal = document.getElementById('logoutModal');
        const confirmLogout = document.getElementById('confirmLogout');
        const cancelLogout = document.getElementById('cancelLogout');
        const closeLogoutModal = document.getElementById('closeLogoutModal');

        // Check if elements exist
        if (!settingsBtn) {
            console.error('Settings button not found!');
            return;
        }

        // Open settings
        settingsBtn.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('Settings button clicked!');
            this.openSettings();
        });

        // Close settings
        if (closeSettings) {
            closeSettings.addEventListener('click', () => {
                settingsModal.style.display = 'none';
            });
        }

        // Close settings by clicking outside
        if (settingsModal) {
            settingsModal.addEventListener('click', (e) => {
                if (e.target === settingsModal) {
                    settingsModal.style.display = 'none';
                }
            });
        }

        // Dark mode toggle
        if (darkModeToggle) {
            darkModeToggle.addEventListener('change', (e) => {
                this.toggleDarkMode(e.target.checked);
            });

            // Check saved dark mode preference
            const savedDarkMode = localStorage.getItem('darkMode') === 'true';
            if (savedDarkMode) {
                document.body.classList.add('dark-mode');
                darkModeToggle.checked = true;
            }
        }

        // Logout from settings
        if (logoutBtnSettings) {
            logoutBtnSettings.addEventListener('click', () => {
                if (settingsModal) {
                    settingsModal.style.display = 'none';
                }
                if (logoutModal) {
                    logoutModal.style.display = 'block';
                }
            });
        }

        // Confirm logout
        if (confirmLogout) {
            confirmLogout.addEventListener('click', () => {
                this.logout();
            });
        }

        // Cancel logout
        if (cancelLogout) {
            cancelLogout.addEventListener('click', () => {
                if (logoutModal) {
                    logoutModal.style.display = 'none';
                }
            });
        }

        // Close logout modal
        if (closeLogoutModal) {
            closeLogoutModal.addEventListener('click', () => {
                if (logoutModal) {
                    logoutModal.style.display = 'none';
                }
            });
        }

        // Close logout by clicking outside
        if (logoutModal) {
            logoutModal.addEventListener('click', (e) => {
                if (e.target === logoutModal) {
                    logoutModal.style.display = 'none';
                }
            });
        }

        console.log('Settings setup complete!');
    }

    openSettings() {
        console.log('Opening settings...');
        const settingsModal = document.getElementById('settingsModal');
        const userEmail = document.getElementById('settingsUserEmail');
        const userName = document.getElementById('settingsUserName');
        
        if (!settingsModal) {
            console.error('Settings modal not found!');
            return;
        }
        
        // Update user info in settings
        if (this.currentUser) {
            if (userEmail) userEmail.textContent = this.currentUser.email;
            if (userName) userName.textContent = this.currentUser.name;
        }
        
        settingsModal.style.display = 'block';
        console.log('Settings modal opened');
    }

    toggleDarkMode(enabled) {
        if (enabled) {
            document.body.classList.add('dark-mode');
            localStorage.setItem('darkMode', 'true');
        } else {
            document.body.classList.remove('dark-mode');
            localStorage.setItem('darkMode', 'false');
        }
    }

    async logout() {
        try {
            const response = await fetch('/api/auth/logout', {
                method: 'POST',
                credentials: 'include'
            });
            
            if (response.ok) {
                // Close logout modal
                const logoutModal = document.getElementById('logoutModal');
                if (logoutModal) {
                    logoutModal.style.display = 'none';
                }
                
                // Reset app state
                this.currentUser = null;
                this.todaySweeper = null;
                
                // Show login screen
                this.showLoginScreen();
                this.showNotification('Logged out successfully', 'info');
            }
        } catch (error) {
            console.error('Logout failed:', error);
            this.showNotification('Logout failed. Please try again.', 'error');
        }
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
        // Swept button
        const sweptBtn = document.getElementById('sweptBtn');
        if (sweptBtn) {
            sweptBtn.addEventListener('click', () => {
                this.markAsSwept();
            });
        }
        
        // Generate Rota button
        const generateBtn = document.getElementById('generateRotaBtn');
        if (generateBtn) {
            generateBtn.addEventListener('click', () => {
                this.generateRota();
            });
        }
        
        // Close notification
        const closeNotification = document.getElementById('closeNotification');
        if (closeNotification) {
            closeNotification.addEventListener('click', () => {
                document.getElementById('notification').style.display = 'none';
            });
        }

        // Header logout button - now opens confirmation modal
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                const logoutModal = document.getElementById('logoutModal');
                if (logoutModal) {
                    logoutModal.style.display = 'block';
                }
            });
        }
    }

    async loadSweptHistory() {
    try {
        const response = await fetch('/api/rota/history', {
            credentials: 'include'
        });
        const data = await response.json();
        
        if (data.success && data.data) {
            this.displayHistory(data.data);
        }
    } catch (error) {
        console.error('Error loading history:', error);
    }
}

displayHistory(history) {
    const list = document.getElementById('historyList');
    
    if (history.length === 0) {
        list.innerHTML = '<li style="text-align: center; color: #666; padding: 20px;">No sweeping history yet</li>';
        return;
    }

    list.innerHTML = history.map(item => {
        const date = new Date(item.schedule_date);
        const dateStr = date.toLocaleDateString('en-US', { 
            weekday: 'short', 
            month: 'short', 
            day: 'numeric' 
        });
        const completedDate = item.completed_at ? new Date(item.completed_at).toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit' 
        }) : '';
        
        return `
            <li class="schedule-item history-item">
                <span class="date">${dateStr}</span>
                <span class="person">
                    <i class="fas fa-check-circle" style="color: #28a745;"></i>
                    ${item.name}
                    <span style="font-size: 0.75rem; color: #888;">${completedDate}</span>
                </span>
            </li>
        `;
    }).join('');
}

async loadStats() {
    try {
        const response = await fetch('/api/rota/stats', {
            credentials: 'include'
        });
        const data = await response.json();
        
        if (data.success && data.data) {
            this.displayStats(data.data);
        }
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

displayStats(stats) {
    const content = document.getElementById('statsContent');
    
    if (!stats.sweeps || stats.sweeps.length === 0) {
        content.innerHTML = '<p style="text-align: center; color: #666;">No stats available yet</p>';
        return;
    }

    let html = `
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 15px; margin-bottom: 20px;">
            <div style="background: #667eea; color: white; padding: 15px; border-radius: 12px; text-align: center;">
                <div style="font-size: 1.8rem; font-weight: bold;">${stats.totalCompleted}</div>
                <div style="font-size: 0.85rem; opacity: 0.9;">Total Sweeps</div>
            </div>
            ${stats.topStreak ? `
            <div style="background: #ffc107; color: #333; padding: 15px; border-radius: 12px; text-align: center;">
                <div style="font-size: 1.8rem; font-weight: bold;">${stats.topStreak.streak_30days}</div>
                <div style="font-size: 0.85rem; opacity: 0.9;">${stats.topStreak.name}'s Streak</div>
            </div>
            ` : ''}
            <div style="background: #28a745; color: white; padding: 15px; border-radius: 12px; text-align: center;">
                <div style="font-size: 1.8rem; font-weight: bold;">${stats.sweeps.length}</div>
                <div style="font-size: 0.85rem; opacity: 0.9;">Active Sweepers</div>
            </div>
        </div>
        <div style="margin-top: 15px;">
            <h3 style="margin-bottom: 10px; font-size: 0.95rem; color: #666;">🏆 Leaderboard</h3>
            <ul style="list-style: none;">
    `;

    stats.sweeps.slice(0, 5).forEach((user, index) => {
        const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'];
        html += `
            <li style="display: flex; justify-content: space-between; padding: 8px 12px; background: white; margin-bottom: 5px; border-radius: 8px;">
                <span>${medals[index] || `${index + 1}.`} ${user.name}</span>
                <span style="font-weight: bold; color: #667eea;">${user.total_sweeps} sweeps</span>
            </li>
        `;
    });

    html += `</ul></div>`;
    content.innerHTML = html;
}
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing app...');
    const app = new SweepingRotaApp();
    window.app = app;
});