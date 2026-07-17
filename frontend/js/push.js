class PushManager {
    constructor() {
        this.publicKey = document.querySelector('meta[name="vapid-public-key"]')?.content || '';
        this.swRegistration = null;
        this.isSubscribed = false;
        this.init();
    }

    async init() {
        console.log('🔔 Initializing Push Manager...');
        console.log('VAPID Public Key:', this.publicKey ? '✅ Set' : '❌ Not Set');
        
        if (!('serviceWorker' in navigator)) {
            console.error('❌ Service Worker not supported');
            return;
        }

        if (!('PushManager' in window)) {
            console.error('❌ Push Manager not supported');
            return;
        }

        try {
            // Register service worker
            console.log('📦 Registering service worker...');
            this.swRegistration = await navigator.serviceWorker.register('/sw.js');
            console.log('✅ Service Worker registered:', this.swRegistration);

            // Check subscription
            await this.checkSubscription();
            
            // Handle permission changes
            if (navigator.permissions) {
                navigator.permissions.query({ name: 'notifications' })
                    .then((permissionStatus) => {
                        permissionStatus.onchange = () => {
                            console.log('Permission changed:', permissionStatus.state);
                            this.handlePermissionChange(permissionStatus.state);
                        };
                    });
            }
            
            console.log('✅ Push Manager initialized');
            return true;
        } catch (error) {
            console.error('❌ Push init error:', error);
            return false;
        }
    }

    async checkSubscription() {
        if (!this.swRegistration) return false;

        try {
            const subscription = await this.swRegistration.pushManager.getSubscription();
            this.isSubscribed = subscription !== null;
            console.log('Subscription status:', this.isSubscribed ? '✅ Subscribed' : '❌ Not subscribed');
            this.updateUI();
            return this.isSubscribed;
        } catch (error) {
            console.error('❌ Check subscription error:', error);
            return false;
        }
    }

    async subscribe() {
        console.log('🔔 Attempting to subscribe...');
        
        if (!this.swRegistration) {
            console.error('❌ Service Worker not registered');
            return { success: false, error: 'Service Worker not ready' };
        }

        // Check permission
        if (Notification.permission === 'denied') {
            console.error('❌ Notifications blocked');
            return { success: false, error: 'Notifications blocked in browser' };
        }

        // Request permission if needed
        if (Notification.permission === 'default') {
            console.log('⏳ Requesting notification permission...');
            const permission = await Notification.requestPermission();
            console.log('Permission result:', permission);
            if (permission !== 'granted') {
                return { success: false, error: 'Permission denied' };
            }
        }

        try {
            // Check if VAPID key is set
            if (!this.publicKey) {
                console.error('❌ VAPID public key not set');
                return { success: false, error: 'VAPID key not configured' };
            }

            console.log('📡 Creating push subscription...');
            const subscription = await this.swRegistration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: this.urlBase64ToUint8Array(this.publicKey)
            });

            console.log('✅ Subscription created:', subscription);

            // Save to server
            console.log('💾 Saving subscription to server...');
            const response = await fetch('/api/push/subscribe', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({ subscription })
            });

            const data = await response.json();
            console.log('Server response:', data);

            if (data.success) {
                this.isSubscribed = true;
                this.updateUI();
                console.log('✅ Push subscription saved');
                return { success: true };
            } else {
                console.error('❌ Server save failed:', data.error);
                await subscription.unsubscribe();
                return { success: false, error: data.error || 'Server error' };
            }
        } catch (error) {
            console.error('❌ Subscribe error:', error);
            return { success: false, error: error.message };
        }
    }

    async unsubscribe() {
        console.log('🔕 Attempting to unsubscribe...');
        
        if (!this.swRegistration) {
            return { success: false };
        }

        try {
            const subscription = await this.swRegistration.pushManager.getSubscription();
            
            if (!subscription) {
                this.isSubscribed = false;
                this.updateUI();
                return { success: true };
            }

            const endpoint = subscription.endpoint;

            // Unsubscribe locally
            await subscription.unsubscribe();

            // Notify server
            await fetch('/api/push/unsubscribe', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({ endpoint })
            });

            this.isSubscribed = false;
            this.updateUI();
            console.log('✅ Push subscription removed');
            return { success: true };
        } catch (error) {
            console.error('❌ Unsubscribe error:', error);
            return { success: false, error: error.message };
        }
    }

    async testNotification() {
        console.log('🧪 Testing notification...');
        try {
            const response = await fetch('/api/push/test', {
                method: 'POST',
                credentials: 'include'
            });
            const data = await response.json();
            console.log('Test response:', data);
            return data;
        } catch (error) {
            console.error('❌ Test notification error:', error);
            return { success: false, error: error.message };
        }
    }

    updateUI() {
        const toggle = document.getElementById('pushToggle');
        const status = document.getElementById('pushStatus');
        const testBtn = document.getElementById('pushTestBtn');

        if (toggle) {
            toggle.checked = this.isSubscribed;
        }

        if (status) {
            if (this.isSubscribed) {
                status.textContent = '✅ Push notifications enabled';
                status.className = 'success';
            } else {
                status.textContent = '🔕 Push notifications disabled. Toggle to enable.';
                status.className = 'info';
            }
        }

        if (testBtn) {
            testBtn.style.display = this.isSubscribed ? 'inline-block' : 'none';
        }
    }

    handlePermissionChange(state) {
        console.log('Permission changed to:', state);
        if (state === 'denied') {
            this.unsubscribe();
            const status = document.getElementById('pushStatus');
            if (status) {
                status.textContent = '❌ Notifications blocked by browser';
                status.className = 'error';
            }
        }
    }

    urlBase64ToUint8Array(base64String) {
        const padding = '='.repeat((4 - base64String.length % 4) % 4);
        const base64 = (base64String + padding)
            .replace(/\-/g, '+')
            .replace(/_/g, '/');

        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);

        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
    }
}

// Initialize when DOM is ready
let pushManager;

document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 DOM loaded, initializing push...');
    
    // Check if VAPID key is set
    const vapidKey = document.querySelector('meta[name="vapid-public-key"]')?.content;
    console.log('VAPID Key present:', vapidKey ? '✅ Yes' : '❌ No');
    
    pushManager = new PushManager();
    window.pushManager = pushManager;
    
    // Update UI after a moment
    setTimeout(() => {
        if (pushManager) {
            pushManager.updateUI();
        }
    }, 1000);
});