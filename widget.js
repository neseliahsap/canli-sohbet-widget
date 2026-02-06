// ============================================
// WIDGET JAVASCRIPT
// ============================================

let currentChatId = null;
let visitorName = '';
let messagesListener = null;
let unreadCount = 0;

// Sayfa yüklendiğinde
document.addEventListener('DOMContentLoaded', function() {
    console.log('Widget yüklendi');
    
    // Önceki sohbeti kontrol et
    const savedChatId = localStorage.getItem('chatId');
    const savedVisitorName = localStorage.getItem('visitorName');
    
    if (savedChatId && savedVisitorName) {
        // Önceki sohbet var mı kontrol et
        database.ref(`chats/${savedChatId}`).once('value', (snapshot) => {
            const chat = snapshot.val();
            if (chat && chat.status !== 'ended') {
                // Önceki sohbete devam et
                currentChatId = savedChatId;
                visitorName = savedVisitorName;
                showChatArea();
                listenToMessages();
            }
        });
    }
    
    // Enter tuşu ile mesaj gönderme
    const messageInput = document.getElementById('messageInput');
    if (messageInput) {
        messageInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });
        
        // Textarea otomatik boyutlandırma
        messageInput.addEventListener('input', function() {
            this.style.height = 'auto';
            this.style.height = (this.scrollHeight) + 'px';
            
            // Yazıyor göstergesi
            if (currentChatId && this.value.trim().length > 0) {
                updateTyping(true);
            } else if (currentChatId) {
                updateTyping(false);
            }
        });
    }
    
    // İsim input'unda Enter
    const nameInput = document.getElementById('visitorNameInput');
    if (nameInput) {
        nameInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                startChat();
            }
        });
    }
    
    console.log('Widget hazır');
});

// Widget'ı aç/kapat
function toggleWidget() {
    const widget = document.getElementById('chatWidget');
    const button = document.getElementById('chatButton');
    
    if (widget.classList.contains('open')) {
        widget.classList.remove('open');
        
        // Okunmamış mesajları sıfırla
        if (currentChatId) {
            database.ref(`chats/${currentChatId}/unreadByVisitor`).set(0);
            unreadCount = 0;
            button.classList.remove('has-unread');
        }
    } else {
        widget.classList.add('open');
        
        // Focus
        if (currentChatId) {
            document.getElementById('messageInput')?.focus();
        } else {
            document.getElementById('visitorNameInput')?.focus();
        }
    }
}

// Sohbeti başlat
function startChat() {
    const nameInput = document.getElementById('visitorNameInput');
    const name = nameInput.value.trim();
    
    if (!name) {
        alert('Lütfen adınızı girin');
        nameInput.focus();
        return;
    }
    
    visitorName = name;
    
    // Yeni sohbet oluştur
    const chatRef = database.ref('chats').push();
    currentChatId = chatRef.key;
    
    const chatData = {
        visitorName: visitorName,
        startTime: Date.now(),
        status: 'active',
        lastMessage: 'Yeni sohbet başladı',
        lastMessageTime: Date.now(),
        unreadByAgent: 0,
        unreadByVisitor: 0
    };
    
    chatRef.set(chatData);
    
    // localStorage'a kaydet
    localStorage.setItem('chatId', currentChatId);
    localStorage.setItem('visitorName', visitorName);
    
    // Chat alanını göster
    showChatArea();
    
    // Mesajları dinlemeye başla
    listenToMessages();
    
    // İlk mesajı otomatik gönder
    setTimeout(() => {
        const welcomeMsg = {
            text: `Merhaba, ben ${visitorName}. Size ulaşmak istedim.`,
            sender: 'visitor',
            senderName: visitorName,
            timestamp: Date.now()
        };
        
        database.ref(`chats/${currentChatId}/messages`).push().set(welcomeMsg);
        
        database.ref(`chats/${currentChatId}`).update({
            lastMessage: welcomeMsg.text,
            lastMessageTime: Date.now(),
            unreadByAgent: firebase.database.ServerValue.increment(1)
        });
    }, 500);
    
    console.log('Sohbet başlatıldı:', currentChatId);
}

// Chat alanını göster
function showChatArea() {
    document.getElementById('nameForm').style.display = 'none';
    document.getElementById('messagesArea').classList.add('active');
    document.getElementById('messageInputArea').classList.add('active');
    
    // Focus
    setTimeout(() => {
        document.getElementById('messageInput')?.focus();
    }, 300);
}

// Mesajları dinle
function listenToMessages() {
    if (!currentChatId) return;
    
    // Önceki listener'ı kaldır
    if (messagesListener) {
        messagesListener.off();
    }
    
    const messagesRef = database.ref(`chats/${currentChatId}/messages`);
    
    messagesRef.on('value', (snapshot) => {
        const messages = snapshot.val();
        displayMessages(messages);
        
        // Widget kapalıysa ve yeni mesaj varsa bildir
        const widget = document.getElementById('chatWidget');
        if (!widget.classList.contains('open')) {
            checkUnreadMessages();
        }
    });
    
    messagesListener = messagesRef;
    
    // Sohbet durumunu dinle
    database.ref(`chats/${currentChatId}/status`).on('value', (snapshot) => {
        const status = snapshot.val();
        if (status === 'ended') {
            handleChatEnded();
        }
    });
    
    // Agent yazıyor mu dinle
    database.ref(`chats/${currentChatId}/typing`).on('value', (snapshot) => {
        const typing = snapshot.val();
        const indicator = document.getElementById('typingIndicator');
        
        if (typing && typing.who === 'agent' && typing.isTyping) {
            // En son 5 saniye içinde mi?
            if (Date.now() - typing.timestamp < 5000) {
                indicator?.classList.add('active');
            } else {
                indicator?.classList.remove('active');
            }
        } else {
            indicator?.classList.remove('active');
        }
    });
}

// Mesajları göster
function displayMessages(messages) {
    const container = document.getElementById('messagesContainer');
    
    if (!messages) {
        container.innerHTML = '';
        return;
    }
    
    // Mesajları diziye çevir ve sırala
    const messageArray = Object.keys(messages).map(msgId => ({
        id: msgId,
        ...messages[msgId]
    }));
    
    messageArray.sort((a, b) => a.timestamp - b.timestamp);
    
    // HTML oluştur
    let html = '';
    messageArray.forEach(msg => {
        const isVisitor = msg.sender === 'visitor';
        const time = formatTime(msg.timestamp);
        const senderName = msg.senderName || (isVisitor ? 'Siz' : 'Destek');
        
        html += `
            <div class="message ${isVisitor ? 'visitor' : 'agent'}">
                <div class="message-content">
                    ${!isVisitor ? `<div class="message-sender">${escapeHtml(senderName)}</div>` : ''}
                    ${escapeHtml(msg.text)}
                    <div class="message-time">${time}</div>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
    
    // En alta scroll
    const messagesArea = document.getElementById('messagesArea');
    messagesArea.scrollTop = messagesArea.scrollHeight;
    
    // Okundu olarak işaretle
    const widget = document.getElementById('chatWidget');
    if (widget.classList.contains('open')) {
        database.ref(`chats/${currentChatId}/unreadByVisitor`).set(0);
        unreadCount = 0;
        document.getElementById('chatButton').classList.remove('has-unread');
    }
}

// Yazıyor göstergesini güncelle
let typingTimeout;
function updateTyping(isTyping) {
    if (!currentChatId) return;
    
    database.ref(`chats/${currentChatId}/typing`).set({
        isTyping: isTyping,
        who: 'visitor',
        timestamp: Date.now()
    });
    
    // 3 saniye sonra otomatik sıfırla
    if (isTyping) {
        clearTimeout(typingTimeout);
        typingTimeout = setTimeout(() => {
            database.ref(`chats/${currentChatId}/typing`).set({
                isTyping: false,
                who: 'visitor',
                timestamp: Date.now()
            });
        }, 3000);
    }
}

// Mesaj gönder
function sendMessage() {
    const input = document.getElementById('messageInput');
    const message = input.value.trim();
    
    if (!message || !currentChatId) {
        return;
    }
    
    // Yazıyor göstergesini kapat
    updateTyping(false);
    
    const messageData = {
        text: message,
        sender: 'visitor',
        senderName: visitorName,
        timestamp: Date.now()
    };
    
    // Mesajı kaydet
    database.ref(`chats/${currentChatId}/messages`).push().set(messageData);
    
    // Sohbet bilgilerini güncelle
    database.ref(`chats/${currentChatId}`).update({
        lastMessage: message,
        lastMessageTime: Date.now(),
        unreadByAgent: firebase.database.ServerValue.increment(1)
    });
    
    // Input'u temizle
    input.value = '';
    input.style.height = 'auto';
    input.focus();
    
    console.log('Mesaj gönderildi:', message);
}

// Okunmamış mesajları kontrol et
function checkUnreadMessages() {
    if (!currentChatId) return;
    
    database.ref(`chats/${currentChatId}/unreadByVisitor`).once('value', (snapshot) => {
        const unread = snapshot.val() || 0;
        if (unread > 0) {
            unreadCount = unread;
            document.getElementById('chatButton').classList.add('has-unread');
        }
    });
}

// Sohbet sonlandığında
function handleChatEnded() {
    // localStorage'ı temizle
    localStorage.removeItem('chatId');
    localStorage.removeItem('visitorName');
    
    // Mesaj göster
    const container = document.getElementById('messagesContainer');
    container.innerHTML += `
        <div style="text-align: center; padding: 20px; color: #999;">
            <p style="margin-bottom: 10px;">🔚 Sohbet sonlandırıldı</p>
            <p style="font-size: 12px;">Teşekkür ederiz!</p>
        </div>
    `;
    
    // Input'u devre dışı bırak
    const input = document.getElementById('messageInput');
    input.disabled = true;
    input.placeholder = 'Sohbet sonlandırıldı';
    
    document.querySelector('#messageInputArea button').disabled = true;
    
    // Listener'ı kaldır
    if (messagesListener) {
        messagesListener.off();
    }
    
    currentChatId = null;
    
    console.log('Sohbet sonlandırıldı');
}

// Zamanı formatla
function formatTime(timestamp) {
    if (!timestamp) return '';
    
    const date = new Date(timestamp);
    return date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
}

// HTML escape
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Sayfa kapatılırken
window.addEventListener('beforeunload', function() {
    if (currentChatId) {
        // Son görülme zamanını güncelle
        database.ref(`chats/${currentChatId}`).update({
            visitorLastSeen: Date.now()
        });
    }
});

console.log('Widget JavaScript yüklendi');
