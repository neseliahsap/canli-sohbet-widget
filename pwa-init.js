// ============================================
// PWA + PUSH NOTIFICATION INIT
// ============================================

// Service Worker kaydet
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('service-worker.js')
            .then(reg => {
                console.log('✅ Service Worker registered');
                setupPushNotifications(reg);
            })
            .catch(err => console.log('❌ SW registration failed:', err));
    });
}

// Push notifications kurulumu (basitleştirilmiş - VAPID gerektirmez)
function setupPushNotifications(registration) {
    // Basit notification permission
    if ('Notification' in window && Notification.permission === 'default') {
        // İzin otomatik istenecek (admin-panel.js'den)
    }
}

// PWA install prompt
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
});

// Install prompt göster
function showInstallPrompt() {
    if (deferredPrompt) {
        const ask = confirm(
            '📱 Admin panelini telefona uygulama olarak yüklemek ister misiniz?\n\n' +
            '✅ Ana ekrandan hızlı erişim\n' +
            '✅ Bildirim desteği\n' +
            '✅ Offline çalışma'
        );
        
        if (ask) {
            deferredPrompt.prompt();
            deferredPrompt.userChoice.then(choice => {
                if (choice.outcome === 'accepted') {
                    console.log('✅ PWA yüklendi');
                }
                deferredPrompt = null;
            });
        }
    }
}

// Notification izni iste
function requestNotificationPermission() {
    if (!('Notification' in window)) {
        alert('⚠️ Tarayıcınız bildirimleri desteklemiyor');
        return Promise.reject();
    }
    
    if (Notification.permission === 'granted') {
        return Promise.resolve();
    }
    
    return Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
            // Test notification
            new Notification('Bildirimler Aktif! 🔔', {
                body: 'Artık yeni mesajlar için bildirim alacaksınız',
                icon: '/canli-sohbet-widget/icon-192x192.png',
                vibrate: [200, 100, 200]
            });
        }
        return permission;
    });
}

// Standalone mode check
if (window.matchMedia('(display-mode: standalone)').matches) {
    console.log('✅ PWA standalone mode');
}

// Export
window.requestNotificationPermission = requestNotificationPermission;
window.showInstallPrompt = showInstallPrompt;
