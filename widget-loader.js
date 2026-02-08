// ============================================
// WIDGET LOADER - Sitenize Eklenecek Kod
// ============================================

(function() {
    console.log('🚀 Widget Loader başlatılıyor...');
    
    // Stil ekle
    const style = document.createElement('style');
    style.textContent = `
        /* Widget Butonu */
        #chat-widget-button {
            position: fixed;
            bottom: 20px;
            right: 20px;
            width: 60px;
            height: 60px;
            background: linear-gradient(135deg, #00a884 0%, #008069 100%);
            border-radius: 50%;
            box-shadow: 0 4px 12px rgba(0, 168, 132, 0.4);
            cursor: pointer;
            z-index: 999998;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 28px;
            transition: all 0.3s;
            animation: pulse 2s infinite;
        }
        
        #chat-widget-button:hover {
            transform: scale(1.1);
            box-shadow: 0 6px 20px rgba(0, 168, 132, 0.6);
        }
        
        @keyframes pulse {
            0%, 100% { box-shadow: 0 4px 12px rgba(0, 168, 132, 0.4); }
            50% { box-shadow: 0 4px 20px rgba(0, 168, 132, 0.8); }
        }
        
        /* Widget Container */
        #chat-widget-container {
            position: fixed;
            bottom: 90px;
            right: 20px;
            width: 380px;
            height: 600px;
            background: white;
            border-radius: 16px;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
            z-index: 999999;
            display: none;
            overflow: hidden;
            animation: slideUp 0.3s ease-out;
        }
        
        #chat-widget-container.open {
            display: block;
        }
        
        @keyframes slideUp {
            from {
                opacity: 0;
                transform: translateY(20px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
        
        #chat-widget-iframe {
            width: 100%;
            height: 100%;
            border: none;
        }
        
        /* Mobil */
        @media (max-width: 768px) {
            #chat-widget-container {
                width: 100%;
                height: 100%;
                bottom: 0;
                right: 0;
                border-radius: 0;
            }
            
            #chat-widget-button {
                bottom: 15px;
                right: 15px;
            }
        }
        
        /* Unread Badge */
        .unread-badge {
            position: absolute;
            top: -5px;
            right: -5px;
            background: #ff4444;
            color: white;
            border-radius: 50%;
            width: 24px;
            height: 24px;
            display: none;
            align-items: center;
            justify-content: center;
            font-size: 12px;
            font-weight: bold;
            animation: bounce 0.5s;
        }
        
        .unread-badge.show {
            display: flex;
        }
        
        @keyframes bounce {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.2); }
        }
    `;
    document.head.appendChild(style);
    
    // Widget butonu oluştur
    const button = document.createElement('div');
    button.id = 'chat-widget-button';
    button.innerHTML = '💬<span class="unread-badge" id="unread-badge">0</span>';
    button.onclick = toggleWidget;
    document.body.appendChild(button);
    
    // Widget container oluştur
    const container = document.createElement('div');
    container.id = 'chat-widget-container';
    
    const iframe = document.createElement('iframe');
    iframe.id = 'chat-widget-iframe';
    iframe.src = 'widget.html'; // GitHub Pages URL'inizi buraya yazın
    
    container.appendChild(iframe);
    document.body.appendChild(container);
    
    // Toggle fonksiyonu
    function toggleWidget() {
        const container = document.getElementById('chat-widget-container');
        const badge = document.getElementById('unread-badge');
        
        if (container.classList.contains('open')) {
            container.classList.remove('open');
        } else {
            container.classList.add('open');
            badge.classList.remove('show');
            badge.textContent = '0';
        }
    }
    
    // ESC ile kapat
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            const container = document.getElementById('chat-widget-container');
            container.classList.remove('open');
        }
    });
    
    // Yeni mesaj dinle (postMessage ile)
    window.addEventListener('message', function(event) {
        if (event.data.type === 'NEW_MESSAGE') {
            const badge = document.getElementById('unread-badge');
            const container = document.getElementById('chat-widget-container');
            
            if (!container.classList.contains('open')) {
                const count = parseInt(badge.textContent) + 1;
                badge.textContent = count;
                badge.classList.add('show');
            }
        }
    });
    
    console.log('✅ Widget yüklendi!');
})();
