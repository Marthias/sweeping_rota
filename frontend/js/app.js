class SweepingRotaApp {
    constructor() {
        this.apiBase = '';
        this.currentUser = null;
        this.todaySweeper = null;
        this.initializeDashboardModals();
        this.init();
    }

    async init() {
        this.setupAuthListeners();
        this.setupEventListeners();
        this.setupSettings();
        window.navigationManager.init();
        this.setupSwapListeners(); 
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

   
    // AUTHENTICATION
  
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
        this.loadSwapData(); 
        this.loadStats(); 
        this.loadSweptHistory();
        this.loadProfile();
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

    // SETTINGS & MODAL CONTROLS
   
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

    
    // ROTA FUNCTIONS

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
                    <span class="roommate-name" onclick="window.app.viewUserProfile(${item.user_id})" title="Click to view profile">
                        ${item.name} ${isCurrentUser ? '⭐' : ''}
                    </span>
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
    
    // Show loading state
    const sweptBtn = document.getElementById('sweptBtn');
    sweptBtn.disabled = true;
    sweptBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Updating...';
    
    try {
        const response = await fetch('/api/rota/swept', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ rotaId: this.todaySweeper.id }),
            credentials: 'include'
        });
        
        const data = await response.json();
        
        if (data.success) {
            this.showNotification('Great job! Room marked as swept! 🎉', 'success');
            
            // Update all UI components immediately
            await this.loadTodaySweeper();
            await this.loadUpcomingSchedule();
            await this.loadSwapData();
            await this.loadStats();
            await this.loadProfile();
            
            // Also refresh calendar if visible
            const today = new Date();
            this.loadCalendar(today.getFullYear(), today.getMonth());
            
            this.showNotification('All views updated!', 'success');
        } else {
            this.showNotification('❌ Failed to mark as swept', 'error');
            // Re-enable button
            sweptBtn.disabled = false;
            sweptBtn.innerHTML = '<i class="fas fa-check"></i> I\'ve Swept!';
        }
    } catch (error) {
        console.error('Error marking as swept:', error);
        this.showNotification('❌ Error marking as swept', 'error');
        sweptBtn.disabled = false;
        sweptBtn.innerHTML = '<i class="fas fa-check"></i> I\'ve Swept!';
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
                this.showNotification('New rota generated successfully!', 'success');
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
    
    if (!history || history.length === 0) {
        list.innerHTML = '<li style="text-align: center; color: #888; padding: 20px;">No sweeping history yet</li>';
        return;
    }

    list.innerHTML = history.map(item => {
        const date = new Date(item.schedule_date);
        const dateStr = date.toLocaleDateString('en-US', { 
            weekday: 'short', 
            month: 'short', 
            day: 'numeric' 
        });
        
        const isCurrentUser = this.currentUser && this.currentUser.id === item.user_id;
        
        return `
            <li class="history-item" onclick="window.app.viewUserProfile(${item.user_id})" style="cursor: pointer;">
                <div class="history-left">
                    <span class="history-check">✅</span>
                    <span class="history-name" style="font-weight: ${isCurrentUser ? '600' : '400'}; color: ${isCurrentUser ? '#667eea' : '#333'};">
                        ${item.name} ${isCurrentUser ? '⭐' : ''}
                    </span>
                </div>
                <span class="history-date">${dateStr}</span>
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


// SWAP FEATURE


async loadSwapData() {
    await this.loadPendingSwaps();
    await this.loadSwapHistory();
    await this.loadUsersForSwap();
}

async loadUsersForSwap() {
    try {
        const response = await fetch('/api/users', {
            credentials: 'include'
        });
        const data = await response.json();
        
        if (data.success) {
            const select = document.getElementById('swapToUser');
            const currentUserId = this.currentUser.id;
            
            select.innerHTML = '<option value="">Select roommate...</option>';
            data.users.forEach(user => {
                if (user.id !== currentUserId) {
                    select.innerHTML += `
                        <option value="${user.id}">${user.name}</option>
                    `;
                }
            });
        }
    } catch (error) {
        console.error('Error loading users:', error);
    }
}

async loadPendingSwaps() {
    try {
        const response = await fetch('/api/swap/pending', {
            credentials: 'include'
        });
        const data = await response.json();
        
        if (data.success && data.data.length > 0) {
            this.displayPendingSwaps(data.data);
        } else {
            document.getElementById('pendingSwapsList').innerHTML = 
                '<p style="color: #888; text-align: center;">No pending swap requests</p>';
        }
    } catch (error) {
        console.error('Error loading pending swaps:', error);
    }
}

displayPendingSwaps(swaps) {
    const list = document.getElementById('pendingSwapsList');
    
    list.innerHTML = swaps.map(swap => {
        const isFromMe = swap.from_user_id === this.currentUser.id;
        const isToMe = swap.to_user_id === this.currentUser.id;
        
        let actions = '';
        if (isToMe) {
            actions = `
                <button onclick="window.app.approveSwap(${swap.id})" class="btn btn-success btn-sm">
                    ✅ Approve
                </button>
                <button onclick="window.app.rejectSwap(${swap.id})" class="btn btn-danger btn-sm">
                    ❌ Reject
                </button>
            `;
        } else if (isFromMe) {
            actions = `
                <button onclick="window.app.cancelSwap(${swap.id})" class="btn btn-secondary btn-sm">
                    Cancel
                </button>
            `;
        }
        
        return `
            <div class="swap-item">
                <div class="swap-info">
                    <strong>${swap.from_name}</strong> 
                    ↔️ <strong>${swap.to_name}</strong>
                    <br>
                    📅 ${new Date(swap.from_date).toLocaleDateString()} → ${new Date(swap.to_date).toLocaleDateString()}
                    ${swap.message ? `<br>💬 "${swap.message}"` : ''}
                    <span class="badge badge-warning">⏳ Pending</span>
                </div>
                <div class="swap-actions">
                    ${actions}
                </div>
            </div>
        `;
    }).join('');
}


async loadSwapHistory() {
    try {
        const response = await fetch('/api/swap/history', {
            credentials: 'include'
        });
        const data = await response.json();
        
        if (data.success && data.data.length > 0) {
            this.displaySwapHistory(data.data);
        }
    } catch (error) {
        console.error('Error loading swap history:', error);
    }
}

displaySwapHistory(history) {
    const list = document.getElementById('swapHistoryList');
    
    list.innerHTML = history.map(swap => {
        const statusColors = {
            'approved': '✅',
            'rejected': '❌',
            'cancelled': '🚫'
        };
        
        return `
            <div class="swap-item history-item">
                <div class="swap-info">
                    <strong>${swap.from_name}</strong> 
                    ↔️ <strong>${swap.to_name}</strong>
                    <br>
                    📅 ${new Date(swap.from_date).toLocaleDateString()} → ${new Date(swap.to_date).toLocaleDateString()}
                    <span class="badge ${swap.status}">
                        ${statusColors[swap.status] || ''} ${swap.status}
                    </span>
                </div>
            </div>
        `;
    }).join('');
}

async createSwapRequest() {
    const to_user_id = document.getElementById('swapToUser').value;
    const from_date = document.getElementById('swapFromDate').value;
    const to_date = document.getElementById('swapToDate').value;
    const message = document.getElementById('swapMessage').value;
    
    if (!to_user_id || !from_date || !to_date) {
        this.showNotification('Please fill in all required fields', 'error');
        return;
    }
    
    try {
        const response = await fetch('/api/swap/request', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ to_user_id, from_date, to_date, message }),
            credentials: 'include'
        });
        
        const data = await response.json();
        
        if (data.success) {
            this.showNotification('✅ Swap request sent!', 'success');
            // Clear form
            document.getElementById('swapToUser').value = '';
            document.getElementById('swapFromDate').value = '';
            document.getElementById('swapToDate').value = '';
            document.getElementById('swapMessage').value = '';
            await this.loadPendingSwaps();
        } else {
            this.showNotification('❌ ' + data.error, 'error');
        }
    } catch (error) {
        console.error('Error creating swap request:', error);
        this.showNotification('❌ Failed to create swap request', 'error');
    }
}

async approveSwap(requestId) {
    if (!confirm('Approve this swap request?')) return;
    
    try {
        const response = await fetch('/api/swap/approve', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ requestId }),
            credentials: 'include'
        });
        
        const data = await response.json();
        
        if (data.success) {
            this.showNotification('✅ Swap approved! Dates updated.', 'success');
            await this.loadPendingSwaps();
            await this.loadSwapHistory();
            await this.loadTodaySweeper();
            await this.loadUpcomingSchedule();
        } else {
            this.showNotification('❌ ' + data.error, 'error');
        }
    } catch (error) {
        console.error('Error approving swap:', error);
        this.showNotification('❌ Failed to approve swap', 'error');
    }
}

async rejectSwap(requestId) {
    if (!confirm('Reject this swap request?')) return;
    
    try {
        const response = await fetch('/api/swap/reject', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ requestId }),
            credentials: 'include'
        });
        
        const data = await response.json();
        
        if (data.success) {
            this.showNotification('Swap request rejected', 'info');
            await this.loadPendingSwaps();
            await this.loadSwapHistory();
        } else {
            this.showNotification('❌ ' + data.error, 'error');
        }
    } catch (error) {
        console.error('Error rejecting swap:', error);
        this.showNotification('❌ Failed to reject swap', 'error');
    }
}

async cancelSwap(requestId) {
    if (!confirm('Cancel this swap request?')) return;
    
    try {
        const response = await fetch('/api/swap/cancel', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ requestId }),
            credentials: 'include'
        });
        
        const data = await response.json();
        
        if (data.success) {
            this.showNotification('Swap request cancelled', 'info');
            await this.loadPendingSwaps();
            await this.loadSwapHistory();
        } else {
            this.showNotification('❌ ' + data.error, 'error');
        }
    } catch (error) {
        console.error('Error cancelling swap:', error);
        this.showNotification('❌ Failed to cancel swap', 'error');
    }
}

//to here

// ============================================
// PROFILE FEATURE
// ============================================

async loadProfile() {
    try {
        const response = await fetch('/api/profile/me', {
            credentials: 'include'
        });
        const data = await response.json();
        
        if (data.success) {
            this.displayProfile(data.user, data.stats);
            // Show profile section
            document.getElementById('profileSection').style.display = 'block';
        } else {
            this.showNotification('Failed to load profile', 'error');
        }
    } catch (error) {
        console.error('Error loading profile:', error);
        this.showNotification('Error loading profile', 'error');
    }
}

// displayProfile(user, stats) {
//     const container = document.getElementById('profileContent');
    
//     // Create avatar initials if no avatar
//     const initials = user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
//     //const avatarUrl = user.avatar_url || '';
    
//     const avatarUrl = user.avatar_url
//     ? `${user.avatar_url}?t=${Date.now()}`
//     : '';

//     container.innerHTML = `
//         <div class="profile-container">
//             <!-- Avatar Section -->
//             <div class="profile-avatar-section">
//                 <div class="profile-avatar-wrapper">
//                     ${avatarUrl ? 
//                         `<img src="${avatarUrl}" alt="${user.name}" class="profile-avatar">` :
//                         `<div class="profile-avatar" style="background: #667eea; display: flex; align-items: center; justify-content: center; font-size: 2.5rem; color: white;">${initials}</div>`
//                     }
//                     <label class="profile-avatar-upload" title="Change avatar">
//                         <i class="fas fa-camera"></i>
//                         <input type="file" id="avatarInput" accept="image/*">
//                     </label>
//                 </div>
//             </div>
            
//             <!-- Profile Info -->
//             <div class="profile-info">
//                 <div class="profile-name">${user.name}</div>
//                 <div class="profile-email"><i class="fas fa-envelope"></i> ${user.email}</div>
//                 ${user.phone ? `<div class="profile-phone"><i class="fas fa-phone"></i> ${user.phone}</div>` : ''}
                
//                 <div class="profile-bio ${!user.bio ? 'profile-bio-empty' : ''}">
//                     ${user.bio || 'No bio yet. Tell your roommates about yourself!'}
//                 </div>
                
//                 <div class="profile-stats-grid">
//                     <div class="profile-stat-item">
//                         <span class="profile-stat-number">${stats.total_sweeps}</span>
//                         <span class="profile-stat-label">🧹 Total Sweeps</span>
//                     </div>
//                     <div class="profile-stat-item">
//                         <span class="profile-stat-number">${stats.streak}</span>
//                         <span class="profile-stat-label">🔥 Day Streak</span>
//                     </div>
//                     <div class="profile-stat-item">
//                         <span class="profile-stat-number">#${stats.rank}</span>
//                         <span class="profile-stat-label">🏆 Rank</span>
//                     </div>
//                     <div class="profile-stat-item">
//                         <span class="profile-stat-number">${stats.monthly_sweeps}</span>
//                         <span class="profile-stat-label">📅 This Month</span>
//                     </div>
//                 </div>
                
//                 <!-- Edit Profile Button -->
//                 <button id="editProfileBtn" class="btn btn-primary" style="width: 100%; margin-top: 15px;">
//                     <i class="fas fa-edit"></i> Edit Profile
//                 </button>
                
//                 <!-- Edit Form -->
//                 <div id="editProfileForm" style="display: none;" class="profile-edit-form">
//                     <h3 style="margin-bottom: 15px;"><i class="fas fa-user-edit"></i> Edit Profile</h3>
//                     <div class="form-group">
//                         <label for="editName"><i class="fas fa-user"></i> Full Name</label>
//                         <input type="text" id="editName" class="form-control" value="${user.name}">
//                     </div>
//                     <div class="form-group">
//                         <label for="editEmail"><i class="fas fa-envelope"></i> Email</label>
//                         <input type="email" id="editEmail" class="form-control" value="${user.email}">
//                     </div>
//                     <div class="form-group">
//                         <label for="editPhone"><i class="fas fa-phone"></i> Phone</label>
//                         <input type="tel" id="editPhone" class="form-control" value="${user.phone || ''}" placeholder="Enter phone number">
//                     </div>
//                     <div class="form-group">
//                         <label for="editBio"><i class="fas fa-comment"></i> Bio</label>
//                         <textarea id="editBio" class="form-control" rows="3" placeholder="Tell your roommates about yourself...">${user.bio || ''}</textarea>
//                     </div>
//                     <div class="profile-edit-actions">
//                         <button id="saveProfileBtn" class="btn btn-success">
//                             <i class="fas fa-save"></i> Save Changes
//                         </button>
//                         <button id="cancelEditBtn" class="btn btn-secondary">
//                             <i class="fas fa-times"></i> Cancel
//                         </button>
//                     </div>
//                 </div>
                
//                 <!-- Account Settings -->
//                 <div class="profile-settings-section">
//                     <h3><i class="fas fa-cog"></i> Account Settings</h3>
                    
//                     <button id="changePasswordBtn" class="btn btn-primary" style="width: 100%; margin-bottom: 10px;">
//                         <i class="fas fa-key"></i> Change Password
//                     </button>
                    
//                     <div id="changePasswordForm" style="display: none;" class="profile-edit-form">
//                         <h3 style="margin-bottom: 15px;"><i class="fas fa-key"></i> Change Password</h3>
//                         <div class="form-group">
//                             <label><i class="fas fa-lock"></i> Current Password</label>
//                             <input type="password" id="currentPassword" class="form-control" placeholder="Enter current password">
//                         </div>
//                         <div class="form-group">
//                             <label><i class="fas fa-lock"></i> New Password</label>
//                             <input type="password" id="newPassword" class="form-control" placeholder="Enter new password (min 6 chars)">
//                         </div>
//                         <div class="form-group">
//                             <label><i class="fas fa-lock"></i> Confirm New Password</label>
//                             <input type="password" id="confirmPassword" class="form-control" placeholder="Confirm new password">
//                         </div>
//                         <div class="profile-edit-actions">
//                             <button id="savePasswordBtn" class="btn btn-success">
//                                 <i class="fas fa-save"></i> Update Password
//                             </button>
//                             <button id="cancelPasswordBtn" class="btn btn-secondary">
//                                 <i class="fas fa-times"></i> Cancel
//                             </button>
//                         </div>
//                     </div>
                    
//                     <div class="danger-zone">
//                         <h4><i class="fas fa-exclamation-triangle"></i> Danger Zone</h4>
//                         <p>Once you delete your account, all your data will be permanently removed. This action cannot be undone.</p>
//                         <button id="deleteAccountBtn" class="btn btn-danger">
//                             <i class="fas fa-trash"></i> Delete Account
//                         </button>
//                     </div>
//                 </div>
//             </div>
//         </div>
//     `;
    
//     // Attach event listeners
//     this.attachProfileListeners();
// }

displayProfile(user, stats) {
    const container = document.getElementById('profileContent');
    
    // Create avatar initials if no avatar
    const initials = user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

      // Update the profile name on the quick card
    const profileName = document.getElementById('profileName');
    if (profileName) {
        profileName.textContent = user.name;
    }
    
    const avatarUrl = user.avatar_url
        ? `${user.avatar_url}?t=${Date.now()}`
        : '';

    container.innerHTML = `
        <div class="profile-container">

            <!-- Avatar Section -->

            <div class="profile-avatar-section">
                <div class="profile-avatar-wrapper">
                    ${avatarUrl ? 
                        `<img src="${avatarUrl}" alt="${user.name}" class="profile-avatar">` :
                        `<div class="profile-avatar" style="background: #667eea; display: flex; align-items: center; justify-content: center; font-size: 2.5rem; color: white;">${initials}</div>`
                    }
                    <label class="profile-avatar-upload" title="Change avatar">
                        <input type="file" id="avatarInput" accept="image/*">
                    </label>
                </div>
            </div>
            
            <!-- Profile Info -->

            <div class="profile-info">
                <div class="profile-name">${user.name}</div>
                <div class="profile-email">
                  <i class="fas fa-envelope"></i> ${user.email}
                
                </div>
                ${user.phone ? `<div class="profile-phone"><i class="fas fa-phone"></i> ${user.phone}</div>` : ''}
                
                <div class="profile-bio ${!user.bio ? 'profile-bio-empty' : ''}">
                    ${user.bio || 'No bio yet. Tell your roommates about yourself!'}
                </div>
                
                <div class="profile-stats-grid">
                    <div class="profile-stat-item">
                        <span class="profile-stat-number">${stats.total_sweeps}</span>
                        <span class="profile-stat-label">🧹 Total Sweeps</span>
                    </div>
                    <div class="profile-stat-item">
                        <span class="profile-stat-number">${stats.streak}</span>
                        <span class="profile-stat-label">🔥 Day Streak</span>
                    </div>
                    <div class="profile-stat-item">
                        <span class="profile-stat-number">#${stats.rank}</span>
                        <span class="profile-stat-label">🏆 Rank</span>
                    </div>
                    <div class="profile-stat-item">
                        <span class="profile-stat-number">${stats.monthly_sweeps}</span>
                        <span class="profile-stat-label">📅 This Month</span>
                    </div>
                </div>
                
                <!-- Edit Profile Button -->
                <button id="editProfileBtn" class="btn btn-primary" style="width: 100%; margin-top: 15px;">
                    <i class="fas fa-edit"></i> Edit Profile
                </button>
                
                <!-- Edit Form -->
                <div id="editProfileForm" style="display: none;" class="profile-edit-form">
                    <h3 style="margin-bottom: 15px;"><i class="fas fa-user-edit"></i> Edit Profile</h3>
                    <div class="form-group">
                        <label for="editName"><i class="fas fa-user"></i> Full Name</label>
                        <input type="text" id="editName" class="form-control" value="${user.name}">
                    </div>
                    <div class="form-group">
                        <label for="editEmail"><i class="fas fa-envelope"></i> Email</label>
                        <input type="email" id="editEmail" class="form-control" value="${user.email}">
                    </div>
                    <div class="form-group">
                        <label for="editPhone"><i class="fas fa-phone"></i> Phone</label>
                        <input type="tel" id="editPhone" class="form-control" value="${user.phone || ''}" placeholder="Enter phone number">
                    </div>
                    <div class="form-group">
                        <label for="editBio"><i class="fas fa-comment"></i> Bio</label>
                        <textarea id="editBio" class="form-control" rows="3" placeholder="Tell your roommates about yourself...">${user.bio || ''}</textarea>
                    </div>
                    <div class="profile-edit-actions">
                        <button id="saveProfileBtn" class="btn btn-success">
                            <i class="fas fa-save"></i> Save Changes
                        </button>
                        <button id="cancelEditBtn" class="btn btn-secondary">
                            <i class="fas fa-times"></i> Cancel
                        </button>
                    </div>
                </div>
                
                <!-- Account Settings -->
                <div class="profile-settings-section">
                    <h3><i class="fas fa-cog"></i> Account Settings</h3>
                    
                    <button id="changePasswordBtn" class="btn btn-primary" style="width: 100%; margin-bottom: 10px;">
                        <i class="fas fa-key"></i> Change Password
                    </button>
                    
                    <div id="changePasswordForm" style="display: none;" class="profile-edit-form">
                        <h3 style="margin-bottom: 15px;"><i class="fas fa-key"></i> Change Password</h3>
                        <div class="form-group">
                            <label><i class="fas fa-lock"></i> Current Password</label>
                            <input type="password" id="currentPassword" class="form-control" placeholder="Enter current password">
                        </div>
                        <div class="form-group">
                            <label><i class="fas fa-lock"></i> New Password</label>
                            <input type="password" id="newPassword" class="form-control" placeholder="Enter new password (min 6 chars)">
                        </div>
                        <div class="form-group">
                            <label><i class="fas fa-lock"></i> Confirm New Password</label>
                            <input type="password" id="confirmPassword" class="form-control" placeholder="Confirm new password">
                        </div>
                        <div class="profile-edit-actions">
                            <button id="savePasswordBtn" class="btn btn-success">
                                <i class="fas fa-save"></i> Update Password
                            </button>
                            <button id="cancelPasswordBtn" class="btn btn-secondary">
                                <i class="fas fa-times"></i> Cancel
                            </button>
                        </div>
                    </div>
                    
                    <!-- 👇 PUSH NOTIFICATIONS SECTION (NEW) 👇 -->
                    <div class="profile-settings-section" style="margin-top: 20px; padding-top: 16px; border-top: 1px solid #e4e6eb;">
                        <h3><i class="fas fa-bell"></i> Push Notifications</h3>
                        
                        <div class="settings-item" style="cursor: default; display: flex; justify-content: space-between; align-items: center; padding: 8px 0;">
                            <div class="settings-item-left" style="display: flex; align-items: center; gap: 12px;">
                                <i class="fas fa-bell" style="color: #667eea; font-size: 1.2rem;"></i>
                                <div>
                                    <span style="font-weight: 500;">Browser Notifications</span>
                                    <div style="font-size: 0.8rem; color: #65676b; margin-top: 2px;">
                                        Get notifications even when the app is closed
                                    </div>
                                </div>
                            </div>
                            <label class="switch">
                                <input type="checkbox" id="pushToggle">
                                <span class="slider round"></span>
                            </label>
                        </div>

                        <div id="pushStatus" style="font-size: 0.85rem; padding: 8px 12px; border-radius: 6px; margin-top: 8px; background: #d1ecf1; color: #0c5460;">
                            Loading...
                        </div>

                        <button id="pushTestBtn" class="btn btn-primary" style="margin-top: 10px; width: 100%; justify-content: center; display: none;">
                            <i class="fas fa-paper-plane"></i> Test Notification
                        </button>
                    </div>
                    <!-- 👆 END OF PUSH NOTIFICATIONS 👆 -->
                    

                    <div class="danger-zone">
                        <h4><i class="fas fa-exclamation-triangle"></i> Danger Zone</h4>
                        <p>Once you delete your account, all your data will be permanently removed. This action cannot be undone.</p>
                        <button id="deleteAccountBtn" class="btn btn-danger">
                            <i class="fas fa-trash"></i> Delete Account
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Attach event listeners
    this.attachProfileListeners();
}

attachProfileListeners() {
    // Toggle edit form
    const editBtn = document.getElementById('editProfileBtn');
    const editForm = document.getElementById('editProfileForm');
    
    if (editBtn) {
        editBtn.addEventListener('click', () => {
            editForm.style.display = editForm.style.display === 'none' ? 'block' : 'none';
        });
    }
    
    const cancelEdit = document.getElementById('cancelEditBtn');
    if (cancelEdit) {
        cancelEdit.addEventListener('click', () => {
            editForm.style.display = 'none';
        });
    }
    
    // Save profile
    const saveBtn = document.getElementById('saveProfileBtn');
    if (saveBtn) {
        saveBtn.addEventListener('click', () => {
            this.saveProfile();
        });
    }
    
    // Avatar upload
    const avatarInput = document.getElementById('avatarInput');
    if (avatarInput) {
        avatarInput.addEventListener('change', (e) => {
            this.uploadAvatar(e);
        });
    }
    
    // Toggle password form
    const passBtn = document.getElementById('changePasswordBtn');
    const passForm = document.getElementById('changePasswordForm');
    if (passBtn) {
        passBtn.addEventListener('click', () => {
            passForm.style.display = passForm.style.display === 'none' ? 'block' : 'none';
        });
    }
    
    const cancelPass = document.getElementById('cancelPasswordBtn');
    if (cancelPass) {
        cancelPass.addEventListener('click', () => {
            passForm.style.display = 'none';
        });
    }
    
    // Save password
    const savePass = document.getElementById('savePasswordBtn');
    if (savePass) {
        savePass.addEventListener('click', () => {
            this.changePassword();
        });
    }
    
    // Delete account
    const deleteBtn = document.getElementById('deleteAccountBtn');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', () => {
            this.deleteAccount();
        });
    }

    // Setup push notification listeners
    this.setupPushListeners();
}

async saveProfile() {
    const name = document.getElementById('editName').value.trim();
    const email = document.getElementById('editEmail').value.trim();
    const phone = document.getElementById('editPhone').value.trim();
    const bio = document.getElementById('editBio').value.trim();
    
    if (!name || !email) {
        this.showNotification('Name and email are required', 'error');
        return;
    }
    
    try {
        const response = await fetch('/api/profile/update', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, phone, bio }),
            credentials: 'include'
        });
        
        const data = await response.json();
        
        if (data.success) {
            this.showNotification('Profile updated successfully!', 'success');
            document.getElementById('editProfileForm').style.display = 'none';
            await this.loadProfile();
            document.getElementById('userName').textContent = `👋 ${data.user.name}`;
        } else {
            this.showNotification('❌ ' + data.error, 'error');
        }
    } catch (error) {
        console.error('Error saving profile:', error);
        this.showNotification('Error saving profile', 'error');
    }
}

async uploadAvatar(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    if (file.size > 2 * 1024 * 1024) {
        this.showNotification('Image must be less than 2MB', 'error');
        return;
    }
    
    const formData = new FormData();
    formData.append('avatar', file);
    
    try {
        const response = await fetch('/api/profile/avatar', {
            method: 'POST',
            body: formData,
            credentials: 'include'
        });
        
        const data = await response.json();
        
        if (data.success) {
            this.showNotification('Avatar updated!', 'success');
            await this.loadProfile();
        } else {
            this.showNotification('❌ ' + data.error, 'error');
        }
    } catch (error) {
        console.error('Error uploading avatar:', error);
        this.showNotification('Error uploading avatar', 'error');
    }
    
    event.target.value = '';
}

async changePassword() {
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    if (!currentPassword || !newPassword || !confirmPassword) {
        this.showNotification('All password fields are required', 'error');
        return;
    }
    
    if (newPassword.length < 6) {
        this.showNotification('New password must be at least 6 characters', 'error');
        return;
    }
    
    if (newPassword !== confirmPassword) {
        this.showNotification('New passwords do not match', 'error');
        return;
    }
    
    try {
        const response = await fetch('/api/profile/change-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
            credentials: 'include'
        });
        
        const data = await response.json();
        
        if (data.success) {
            this.showNotification('Password changed successfully!', 'success');
            document.getElementById('changePasswordForm').style.display = 'none';
            document.getElementById('currentPassword').value = '';
            document.getElementById('newPassword').value = '';
            document.getElementById('confirmPassword').value = '';
        } else {
            this.showNotification('❌ ' + data.error, 'error');
        }
    } catch (error) {
        console.error('Error changing password:', error);
        this.showNotification('Error changing password', 'error');
    }
}

async deleteAccount() {
    const confirmed = confirm(
        '⚠️ WARNING: This will permanently delete your account and all data.\n\n' +
        'This action CANNOT be undone.\n\n' +
        'Are you sure you want to continue?'
    );
    
    if (!confirmed) return;
    
    const password = prompt('Please enter your password to confirm account deletion:');
    if (!password) return;
    
    try {
        const response = await fetch('/api/profile/delete-account', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ confirmPassword: password }),
            credentials: 'include'
        });
        
        const data = await response.json();
        
        if (data.success) {
            this.showNotification('Account deleted successfully', 'info');
            // Redirect to login
            setTimeout(() => {
                window.location.reload();
            }, 2000);
        } else {
            this.showNotification('❌ ' + data.error, 'error');
        }
    } catch (error) {
        console.error('Error deleting account:', error);
        this.showNotification('Error deleting account', 'error');
    }
}


async saveProfile() {
    const name = document.getElementById('editName').value.trim();
    const email = document.getElementById('editEmail').value.trim();
    const phone = document.getElementById('editPhone').value.trim();
    const bio = document.getElementById('editBio').value.trim();
    
    if (!name || !email) {
        this.showNotification('Name and email are required', 'error');
        return;
    }
    
    try {
        const response = await fetch('/api/profile/update', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, phone, bio }),
            credentials: 'include'
        });
        
        const data = await response.json();
        
        if (data.success) {
            this.showNotification('Profile updated successfully!', 'success');
            document.getElementById('editProfileForm').style.display = 'none';
            
            // RELOAD PROFILE IMMEDIATELY
            await this.loadProfile();
            
            // Update header
            document.getElementById('userName').textContent = `👋 ${data.user.name}`;
            
            // Update notification
            this.showNotification('Bio updated successfully!', 'success');
        } else {
            this.showNotification('❌ ' + data.error, 'error');
        }
    } catch (error) {
        console.error('Error saving profile:', error);
        this.showNotification('Error saving profile', 'error');
    }
}


  // ============================================
// VIEW OTHER USER'S PROFILE
// ============================================

async viewUserProfile(userId) {
    try {
        console.log('🔍 Viewing profile for user:', userId);
        
        const response = await fetch(`/api/profile/user/${userId}`, {
            credentials: 'include'
        });
        
        console.log('📡 Response status:', response.status);
        
        const data = await response.json();
        console.log('📊 Profile data:', data);
        
        if (data.success) {
            // Check if the user object has all required properties
            if (!data.user) {
                console.error('❌ No user data in response');
                this.showNotification('User data not found', 'error');
                return;
            }
            
            // Ensure stats have default values
            if (!data.stats) {
                data.stats = {
                    total_sweeps: 0,
                    monthly_sweeps: 0,
                    streak: 0,
                    rank: 1
                };
            }
            
            this.displayUserProfile(data.user, data.stats);
            document.getElementById('userProfileModal').style.display = 'block';
        } else {
            console.error('❌ API returned error:', data.error);
            this.showNotification(data.error || 'Failed to load user profile', 'error');
        }
    } catch (error) {
        console.error('❌ Error loading user profile:', error);
        this.showNotification('Error loading user profile', 'error');
    }
}

displayUserProfile(user, stats) {
    const container = document.getElementById('userProfileContent');
    
    // Safety check - ensure user data exists
    if (!user) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px 20px;">
                <p style="color: #dc3545;">User not found</p>
                <button onclick="document.getElementById('userProfileModal').style.display='none'" class="btn btn-secondary">
                    Close
                </button>
            </div>
        `;
        return;
    }
    
    // Get initials for avatar fallback
    const initials = user.name ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : '?';
    const avatarUrl = user.avatar_url || '';
    
    // Ensure stats have default values
    const totalSweeps = stats?.total_sweeps || 0;
    const monthlySweeps = stats?.monthly_sweeps || 0;
    const streak = stats?.streak || 0;
    const rank = stats?.rank || 1;
    
    container.innerHTML = `
        <div class="profile-container" style="text-align: center;">
            <!-- Avatar Section -->
            <div class="profile-avatar-section" style="padding: 10px 0;">
                <div class="profile-avatar-wrapper" style="display: inline-block;">
                    ${avatarUrl ? 
                        `<img src="${avatarUrl}" alt="${user.name}" class="profile-avatar" style="width: 100px; height: 100px; border-radius: 50%; object-fit: cover; border: 4px solid #667eea;">` :
                        `<div class="profile-avatar" style="width: 100px; height: 100px; border-radius: 50%; background: #667eea; display: flex; align-items: center; justify-content: center; font-size: 2.5rem; color: white; margin: 0 auto;">${initials}</div>`
                    }
                </div>
            </div>
            
            <!-- Profile Info -->
            <div class="profile-info" style="padding: 10px 0;">
                <div class="profile-name" style="font-size: 1.5rem; font-weight: 700; color: #1a1a2e; margin-bottom: 2px;">
                    ${user.name || 'Unknown User'}
                </div>
                <div class="profile-email" style="color: #65676b; font-size: 0.95rem;">
                    <i class="fas fa-envelope" style="color: #667eea;"></i> ${user.email || 'No email'}
                </div>
                ${user.phone ? `<div class="profile-phone" style="color: #65676b; font-size: 0.9rem; margin-top: 2px;"><i class="fas fa-phone" style="color: #667eea;"></i> ${user.phone}</div>` : ''}
                
                <!-- Bio -->
                <div class="profile-bio" style="margin: 15px 0; padding: 12px 16px; background: #f0f2f5; border-radius: 8px; color: #1a1a2e; ${!user.bio ? 'font-style: italic; color: #65676b;' : ''}">
                    ${user.bio || 'No bio yet.'}
                </div>
                
                <!-- Stats -->
                <div class="profile-stats-grid" style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin: 16px 0; padding: 12px 0; border-top: 1px solid #e4e6eb; border-bottom: 1px solid #e4e6eb;">
                    <div class="profile-stat-item" style="text-align: center;">
                        <span class="profile-stat-number" style="font-size: 1.5rem; font-weight: 700; color: #1a1a2e; display: block;">${totalSweeps}</span>
                        <span class="profile-stat-label" style="font-size: 0.75rem; color: #65676b; display: block; margin-top: 2px; text-transform: uppercase;">Sweeps</span>
                    </div>
                    <div class="profile-stat-item" style="text-align: center;">
                        <span class="profile-stat-number" style="font-size: 1.5rem; font-weight: 700; color: #1a1a2e; display: block;">${streak}</span>
                        <span class="profile-stat-label" style="font-size: 0.75rem; color: #65676b; display: block; margin-top: 2px; text-transform: uppercase;">Streak</span>
                    </div>
                    <div class="profile-stat-item" style="text-align: center;">
                        <span class="profile-stat-number" style="font-size: 1.5rem; font-weight: 700; color: #1a1a2e; display: block;">#${rank}</span>
                        <span class="profile-stat-label" style="font-size: 0.75rem; color: #65676b; display: block; margin-top: 2px; text-transform: uppercase;">Rank</span>
                    </div>
                    <div class="profile-stat-item" style="text-align: center;">
                        <span class="profile-stat-number" style="font-size: 1.5rem; font-weight: 700; color: #1a1a2e; display: block;">${monthlySweeps}</span>
                        <span class="profile-stat-label" style="font-size: 0.75rem; color: #65676b; display: block; margin-top: 2px; text-transform: uppercase;">This Month</span>
                    </div>
                </div>
                
                <!-- Viewing indicator -->
                <div style="margin-top: 12px; padding: 8px 12px; background: #f0f2f5; border-radius: 6px; font-size: 0.85rem; color: #65676b;">
                    <i class="fas fa-eye" style="color: #667eea;"></i> Viewing ${user.name || 'user'}'s profile
                </div>
            </div>
        </div>
    `;
    
    // Close modal handlers
    const closeBtn = document.getElementById('closeUserProfile');
    if (closeBtn) {
        closeBtn.onclick = () => {
            document.getElementById('userProfileModal').style.display = 'none';
        };
    }
    
    const modal = document.getElementById('userProfileModal');
    if (modal) {
        modal.onclick = (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        };
    }
}

// PUSH NOTIFICATIONS

setupPushListeners() {
    const toggle = document.getElementById('pushToggle');
    const testBtn = document.getElementById('pushTestBtn');
    const statusEl = document.getElementById('pushStatus');
    
    if (!toggle) {
        console.error('Push toggle not found');
        return;
    }
    
    // Update status initially
    this.updatePushStatus();
    
    toggle.addEventListener('change', async () => {
        console.log('Push toggle changed to:', toggle.checked);
        
        if (toggle.checked) {
            // Check if push manager exists
            if (!window.pushManager) {
                console.error('Push manager not initialized');
                this.showNotification('Push notifications not supported in this browser', 'error');
                toggle.checked = false;
                return;
            }
            
            const result = await window.pushManager.subscribe();
            console.log('Subscribe result:', result);
            
            if (result.success) {
                this.showNotification('✅ Push notifications enabled!', 'success');
                this.updatePushStatus();
            } else {
                toggle.checked = false;
                this.showNotification('❌ Failed to enable push notifications: ' + (result.error || 'Unknown error'), 'error');
                this.updatePushStatus();
            }
        } else {
            const result = await window.pushManager.unsubscribe();
            console.log('Unsubscribe result:', result);
            this.showNotification('🔕 Push notifications disabled', 'info');
            this.updatePushStatus();
        }
    });
    
    if (testBtn) {
        testBtn.addEventListener('click', async () => {
            if (!window.pushManager) {
                this.showNotification('Push notifications not available', 'error');
                return;
            }
            
            const result = await window.pushManager.testNotification();
            console.log('Test result:', result);
            
            if (result.success) {
                this.showNotification('✅ Test notification sent! Check your browser.', 'success');
            } else {
                this.showNotification('❌ Failed to send test notification: ' + (result.error || 'Unknown error'), 'error');
            }
        });
    }
}

updatePushStatus() {
    const statusEl = document.getElementById('pushStatus');
    const testBtn = document.getElementById('pushTestBtn');
    const toggle = document.getElementById('pushToggle');
    
    if (!statusEl) return;
    
    // Check if push is supported
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        statusEl.textContent = '❌ Push notifications not supported in this browser';
        statusEl.className = 'error';
        if (toggle) toggle.disabled = true;
        return;
    }
    
    // Check permission
    if (Notification.permission === 'denied') {
        statusEl.textContent = '❌ Notifications blocked. Please enable in browser settings.';
        statusEl.className = 'error';
        if (toggle) {
            toggle.checked = false;
            toggle.disabled = true;
        }
        return;
    }
    
    // Check if subscribed
    if (window.pushManager && window.pushManager.isSubscribed) {
        statusEl.textContent = '✅ Push notifications enabled';
        statusEl.className = 'success';
        if (testBtn) testBtn.style.display = 'inline-block';
    } else {
        statusEl.textContent = '🔕 Push notifications disabled. Toggle to enable.';
        statusEl.className = 'info';
        if (testBtn) testBtn.style.display = 'none';
    }
}


// TAB SWITCHING


switchTab(tabName) {
    console.log('🔄 Switching to tab:', tabName);
    
    // Get all tabs and contents
    const tabs = document.querySelectorAll('.nav-item');
    const contents = document.querySelectorAll('.tab-content');
    
    // Remove active class from all
    tabs.forEach(t => t.classList.remove('active'));
    contents.forEach(c => c.classList.remove('active'));
    
    // Find and activate the target tab
    const targetTab = document.querySelector(`.nav-item[data-tab="${tabName}"]`);
    const targetContent = document.getElementById(`tab-${tabName}`);
    
    if (targetTab) {
        targetTab.classList.add('active');
        // Scroll to top of page smoothly
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    
    if (targetContent) {
        targetContent.classList.add('active');
    }
    
    // Load content if needed
    if (tabName === 'profile') {
        this.loadProfile();
    } else if (tabName === 'schedule') {
        this.loadFullSchedule();
    } else if (tabName === 'swaps') {
        this.loadSwapData();
    }
}

// TAB SWITCHING

switchTab(tabName) {
    console.log('🔄 Switching to tab:', tabName);
    
    // Get all tabs and contents
    const tabs = document.querySelectorAll('.nav-item');
    const contents = document.querySelectorAll('.tab-content');
    
    // Remove active class from all
    tabs.forEach(t => t.classList.remove('active'));
    contents.forEach(c => c.classList.remove('active'));
    
    // Find and activate the target tab
    const targetTab = document.querySelector(`.nav-item[data-tab="${tabName}"]`);
    const targetContent = document.getElementById(`tab-${tabName}`);
    
    if (targetTab) {
        targetTab.classList.add('active');
        // Scroll to top of page smoothly
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    
    if (targetContent) {
        targetContent.classList.add('active');
    }
    
    // Load content if needed
    if (tabName === 'profile') {
        this.loadProfile();
    } else if (tabName === 'schedule') {
        this.loadFullSchedule();
    } else if (tabName === 'swaps') {
        this.loadSwapData();
    }
}


setupModal(
    triggerId,
    modalId,
    closeId,
    sectionId,
    containerId
) {

    const trigger = document.getElementById(triggerId);

    const modal = document.getElementById(modalId);

    const closeBtn = document.getElementById(closeId);

    const section = document.getElementById(sectionId);

    const container = document.getElementById(containerId);

    if (
        !trigger ||
        !modal ||
        !closeBtn ||
        !section ||
        !container
    ) {
        return;
    }

    // Move section only once
    if (!container.contains(section)) {
        container.appendChild(section);
    }

    window.addEventListener("click", (event) => {

    if (event.target === modal) {

        modal.style.display = "none";

    }

});

    closeBtn.onclick = () => {

        modal.style.display = "none";

    };

}


initializeDashboardModals() {

    const profileCard = document.querySelector(".quick-card:last-child");

    const profileModal = document.getElementById("profileModal");

    const closeBtn = document.getElementById("closeProfileModal");

    const profileSection = document.getElementById("profileSection");

    const modalContent = document.getElementById("profileModalContent");

    if (
        !profileCard ||
        !profileModal ||
        !closeBtn ||
        !profileSection ||
        !modalContent
    ) {
        return;
    }

    // Move the existing profile into the modal
    modalContent.appendChild(profileSection);

    profileCard.onclick = () => {

        profileModal.style.display = "flex";

    };

    closeBtn.onclick = () => {

        profileModal.style.display = "none";

    };

    window.onclick = (event) => {

        if (event.target === profileModal) {

            profileModal.style.display = "none";

        }

    };


    // Schedule Modal

const scheduleCard = document.getElementById("scheduleQuickCard");

const scheduleModal = document.getElementById("scheduleModal");

const closeScheduleBtn = document.getElementById("closeScheduleModal");

const scheduleSection = document.getElementById("upcomingSchedule");

const scheduleModalContent = document.getElementById("scheduleModalContent");

if (
    scheduleCard &&
    scheduleModal &&
    closeScheduleBtn &&
    scheduleSection &&
    scheduleModalContent
) {

    scheduleModalContent.appendChild(scheduleSection);

    scheduleCard.onclick = () => {

        scheduleModal.style.display = "flex";

    };

    closeScheduleBtn.onclick = () => {

        scheduleModal.style.display = "none";

    };

    window.addEventListener("click", (event) => {

        if (event.target === scheduleModal) {

            scheduleModal.style.display = "none";

        }

    });

}


// Stats Modal

const statsCard = document.getElementById("statsQuickCard");

const statsModal = document.getElementById("statsModal");

const closeStatsModal = document.getElementById("closeStatsModal");

const statsSection = document.getElementById("statsSection");

const statsModalContent = document.getElementById("statsModalContent");

if (
    !statsCard ||
    !statsModal ||
    !closeStatsModal ||
    !statsSection ||
    !statsModalContent
) {
    return;
}

statsModalContent.appendChild(statsSection);

statsCard.onclick = () => {

    statsModal.style.display = "flex";

};

closeStatsModal.onclick = () => {

    statsModal.style.display = "none";

};

window.addEventListener("click", (event) => {

    if (event.target === statsModal) {

        statsModal.style.display = "none";

    }

});



// Swap Requests Modal
const swapCard = document.getElementById("swapQuickCard");

const swapModal = document.getElementById("swapModal");

const closeSwapModal = document.getElementById("closeSwapModal");

const swapSection = document.getElementById("swapSection");

const swapModalContent = document.getElementById("swapModalContent");

if (
    !swapCard ||
    !swapModal ||
    !closeSwapModal ||
    !swapSection ||
    !swapModalContent
) {
    return;
}

swapModalContent.appendChild(swapSection);

swapCard.onclick = () => {

    swapModal.style.display = "flex";

};

closeSwapModal.onclick = () => {

    swapModal.style.display = "none";

};

window.addEventListener("click", (event) => {

    if (event.target === swapModal) {

        swapModal.style.display = "none";

    }

});

// ======================
// History Modal
// ======================

const historyCard = document.getElementById("historyQuickCard");

const historyModal = document.getElementById("historyModal");

const closeHistoryModal = document.getElementById("closeHistoryModal");

const historySection = document.getElementById("historySection");

const historyModalContent = document.getElementById("historyModalContent");

if (
    !historyCard ||
    !historyModal ||
    !closeHistoryModal ||
    !historySection ||
    !historyModalContent
) {
    return;
}

historyModalContent.appendChild(historySection);

historyCard.onclick = () => {

    historyModal.style.display = "flex";

};

closeHistoryModal.onclick = () => {

    historyModal.style.display = "none";

};

window.addEventListener("click", (event) => {

    if (event.target === historyModal) {

        historyModal.style.display = "none";

    }

});


}

}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing app...');
    const app = new SweepingRotaApp();
    window.app = app;
});