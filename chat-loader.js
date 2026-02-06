/**
 * Canlı Sohbet Widget Loader
 * Tawk.to benzeri tek satırlık yükleme scripti
 */

(function() {
    'use strict';
    
    // Widget zaten yüklü mü kontrol et
    if (document.getElementById('live-chat-widget')) {
        console.log('Live Chat Widget zaten yüklü');
        return;
    }
    
    // Base URL'i script src'den al
    var scripts = document.getElementsByTagName('script');
    var currentScript = scripts[scripts.length - 1];
    var scriptSrc = currentScript.src;
    var baseURL = scriptSrc.substring(0, scriptSrc.lastIndexOf('/'));
    var widgetURL = baseURL + '/widget.html';
    
    console.log('Live Chat Widget yükleniyor:', widgetURL);
    
    // CSS ekle
    var style = document.createElement('style');
    style.textContent = `
        /* Live Chat Widget Styles */
        #live-chat-container * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        #live-chat-button {
            position: fixed;
            bottom: 20px;
            right: 20px;
            width: 60px;
            height: 60px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            transition: all 0.3s;
            z-index: 999999;
            border: none;
        }

        #live-chat-button:hover {
            transform: scale(1.1);
            box-shadow: 0 6px 20px rgba(0, 0, 0, 0.4);
        }

        #live-chat-button svg {
            width: 30px;
            height: 30px;
            fill: white;
        }

        #live-chat-button.has-unread::after {
            content: '';
            position: absolute;
            top: 8px;
            right: 8px;
            width: 12px;
            height: 12px;
            background: #ff5722;
            border-radius: 50%;
            border: 2px solid white;
            animation: live-chat-pulse 2s infinite;
        }

        @keyframes live-chat-pulse {
            0%, 100% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.2); opacity: 0.8; }
        }

        #live-chat-widget {
            position: fixed;
            bottom: 90px;
            right: 20px;
            width: 380px;
            height: 600px;
            z-index: 999998;
            display: none;
            border-radius: 16px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
            overflow: hidden;
        }

        #live-chat-widget.open {
            display: block;
            animation: live-chat-slide-up 0.3s ease-out;
        }

        @keyframes live-chat-slide-up {
            from {
                opacity: 0;
                transform: translateY(20px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        #live-chat-widget iframe {
            width: 100%;
            height: 100%;
            border: none;
            border-radius: 16px;
        }

        @media (max-width: 480px) {
            #live-chat-widget {
                width: 100%;
                height: 100%;
                bottom: 0;
                right: 0;
                border-radius: 0;
            }
            
            #live-chat-button {
                bottom: 15px;
                right: 15px;
                width: 56px;
                height: 56px;
            }
        }
    `;
    document.head.appendChild(style);
    
    // HTML ekle
    var container = document.createElement('div');
    container.id = 'live-chat-container';
    container.innerHTML = `
        <button id="live-chat-button" onclick="window.toggleLiveChat()">
            <svg viewBox="0 0 24 24">
                <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
            </svg>
        </button>
        
        <div id="live-chat-widget">
            <iframe 
                id="live-chat-iframe"
                src="${widgetURL}"
                allow="microphone; camera"
                loading="lazy"
            ></iframe>
        </div>
    `;
    document.body.appendChild(container);
    
    // Toggle fonksiyonu
    window.toggleLiveChat = function() {
        var widget = document.getElementById('live-chat-widget');
        var button = document.getElementById('live-chat-button');
        
        if (widget.classList.contains('open')) {
            widget.classList.remove('open');
            // Parent window'a mesaj gönder
            var iframe = document.getElementById('live-chat-iframe');
            if (iframe && iframe.contentWindow) {
                iframe.contentWindow.postMessage({ type: 'widget-closed' }, '*');
            }
        } else {
            widget.classList.add('open');
            button.classList.remove('has-unread');
            
            // Parent window'a mesaj gönder
            var iframe = document.getElementById('live-chat-iframe');
            if (iframe && iframe.contentWindow) {
                iframe.contentWindow.postMessage({ type: 'widget-opened' }, '*');
            }
        }
    };
    
    // İframe'den mesaj dinle
    window.addEventListener('message', function(event) {
        // Güvenlik kontrolü - sadece kendi domain'inizden
        // if (event.origin !== widgetURL.substring(0, widgetURL.indexOf('/', 8))) return;
        
        if (event.data.type === 'unread-count') {
            var button = document.getElementById('live-chat-button');
            if (event.data.count > 0) {
                button.classList.add('has-unread');
            } else {
                button.classList.remove('has-unread');
            }
        }
    });
    
    console.log('Live Chat Widget yüklendi ✓');
    
    // API objesi oluştur (Tawk.to benzeri)
    window.LiveChat_API = window.LiveChat_API || {};
    window.LiveChat_API.minimize = function() {
        var widget = document.getElementById('live-chat-widget');
        if (widget) widget.classList.remove('open');
    };
    window.LiveChat_API.maximize = function() {
        var widget = document.getElementById('live-chat-widget');
        if (widget) widget.classList.add('open');
    };
    window.LiveChat_API.toggle = function() {
        window.toggleLiveChat();
    };
    window.LiveChat_API.hideWidget = function() {
        var container = document.getElementById('live-chat-container');
        if (container) container.style.display = 'none';
    };
    window.LiveChat_API.showWidget = function() {
        var container = document.getElementById('live-chat-container');
        if (container) container.style.display = 'block';
    };
    
})();
