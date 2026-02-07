// ============================================
// WIDGET JAVASCRIPT
// ============================================

let currentChatId = null;
let visitorName = '';
let messagesListener = null;
let unreadCount = 0;
let selectedFile = null;  // Seçilen dosya
let lastVisitorMessageCount = 0;  // Bildirim sesi için

// Bildirim sesi çal (visitor için)
function playVisitorNotificationSound() {
    const audio = document.getElementById('widgetNotificationSound');
    if (audio) {
        audio.play().catch(e => console.log('Ses çalınamadı:', e));
    }
}

// Dosya seç
function handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    // Dosya boyutu kontrolü (5MB max)
    if (file.size > 5 * 1024 * 1024) {
        alert('Dosya boyutu çok büyük! Maksimum 5MB yükleyebilirsiniz.');
        return;
    }
    
    selectedFile = file;
    
    // Önizleme göster
    document.getElementById('filePreview').style.display = 'block';
    document.getElementById('fileName').textContent = `📄 ${file.name} (${formatFileSize(file.size)})`;
}

// Dosya seçimini temizle
function clearFileSelection() {
    selectedFile = null;
    document.getElementById('fileInput').value = '';
    document.getElementById('filePreview').style.display = 'none';
}

// Dosya boyutunu formatla
function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

// Sayfa yüklendiğinde
document.addEventListener('DOMContentLoaded', function() {
    console.log('Widget yüklendi');
    
    // Mesai saati kontrolü - ekranı ayarla
    setupWidgetScreen();
    
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

// Mesai saati kontrolü
function isBusinessHours() {
    const now = new Date();
    const hour = now.getHours();
    const day = now.getDay(); // 0 = Pazar, 6 = Cumartesi
    
    // Hafta sonu kontrolü (sadece müşteri tarafı için)
    if (day === 0 || day === 6) {
        return false; // Hafta sonu kapalı
    }
    
    // Mesai saati: 08:30 - 20:00
    const isAfterStart = hour > 8 || (hour === 8 && now.getMinutes() >= 30);
    const isBeforeEnd = hour < 20;
    
    return isAfterStart && isBeforeEnd;
}

// Mesai saati mesajı
function getBusinessHoursMessage() {
    return 'Mesai saatlerimiz: Pazartesi - Cuma, 08:30 - 20:00';
}

// Widget başlangıç ekranını ayarla
function setupWidgetScreen() {
    const nameForm = document.getElementById('nameForm');
    
    if (!isBusinessHours()) {
        // Mesai dışı - farklı ekran göster
        nameForm.innerHTML = `
            <div class="name-form-content">
                <div class="name-form-icon">🕐</div>
                <h3>Mesai Saatleri Dışındayız</h3>
                <p style="margin-bottom: 20px;">Çalışma saatlerimiz:<br><strong>Pazartesi - Cuma, 08:30 - 20:00</strong></p>
                <p style="font-size: 13px; color: #666; margin-bottom: 25px;">Bize ulaşmak için iletişim formumuzu kullanabilirsiniz.</p>
                <a href="https://neseliahsap.com/iletisim" target="_blank" style="
                    display: block;
                    width: 100%;
                    padding: 14px;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    border: none;
                    border-radius: 12px;
                    font-size: 15px;
                    font-weight: 600;
                    text-decoration: none;
                    text-align: center;
                    transition: all 0.3s;
                " onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 12px rgba(102, 126, 234, 0.4)';" onmouseout="this.style.transform='none'; this.style.boxShadow='none';">
                    İletişim Formu
                </a>
            </div>
        `;
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
        lastMessage: 'Sohbet başladı',
        lastMessageTime: Date.now(),
        unreadByAgent: 1,
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
    
    // Yeni mesaj var mı ve agent'tan mı geliyor?
    if (messageArray.length > lastVisitorMessageCount) {
        const lastMsg = messageArray[messageArray.length - 1];
        if (lastMsg.sender === 'agent') {
            playVisitorNotificationSound();
        }
    }
    lastVisitorMessageCount = messageArray.length;
    
    // HTML oluştur
    let html = '';
    messageArray.forEach(msg => {
        const isVisitor = msg.sender === 'visitor';
        const time = formatTime(msg.timestamp);
        const senderName = msg.senderName || (isVisitor ? 'Siz' : 'Destek');
        
        let messageContent = escapeHtml(msg.text);
        
        // Dosya mesajı mı?
        if (msg.type === 'file' && msg.file) {
            const isImage = msg.file.type && msg.file.type.startsWith('image/');
            
            if (isImage) {
                messageContent = `
                    <div>${escapeHtml(msg.text)}</div>
                    <img src="${msg.file.data}" alt="${msg.file.name}" style="max-width:200px; border-radius:8px; margin-top:8px; cursor:pointer;" onclick="window.open('${msg.file.data}', '_blank')">
                    <div style="font-size:11px; opacity:0.7; margin-top:4px;">${msg.file.name}</div>
                `;
            } else {
                messageContent = `
                    <div>${escapeHtml(msg.text)}</div>
                    <a href="${msg.file.data}" download="${msg.file.name}" style="display:block; margin-top:8px; padding:8px; background:rgba(0,0,0,0.05); border-radius:6px; text-decoration:none; color:inherit;">
                        📄 ${msg.file.name}
                        <div style="font-size:11px; opacity:0.7;">${formatFileSize(msg.file.size)}</div>
                    </a>
                `;
            }
        }
        
        html += `
            <div class="message ${isVisitor ? 'visitor' : 'agent'}">
                <div class="message-content">
                    ${!isVisitor ? `<div class="message-sender">${escapeHtml(senderName)}</div>` : ''}
                    ${messageContent}
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
    
    if (!message && !selectedFile) {
        return;
    }
    
    if (!currentChatId) {
        return;
    }
    
    // Yazıyor göstergesini kapat
    updateTyping(false);
    
    // Eğer dosya seçiliyse
    if (selectedFile) {
        sendFileMessage(message || '📎 Dosya gönderildi');
        return;
    }
    
    // Normal metin mesajı
    const messageData = {
        text: message,
        sender: 'visitor',
        senderName: visitorName,
        timestamp: Date.now(),
        type: 'text'
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

// Dosya mesajı gönder
function sendFileMessage(caption) {
    if (!selectedFile || !currentChatId) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const fileData = {
            text: caption,
            sender: 'visitor',
            senderName: visitorName,
            timestamp: Date.now(),
            type: 'file',
            file: {
                name: selectedFile.name,
                size: selectedFile.size,
                type: selectedFile.type,
                data: e.target.result  // Base64
            }
        };
        
        // Mesajı kaydet
        database.ref(`chats/${currentChatId}/messages`).push().set(fileData);
        
        // Sohbet bilgilerini güncelle
        database.ref(`chats/${currentChatId}`).update({
            lastMessage: `📎 ${selectedFile.name}`,
            lastMessageTime: Date.now(),
            unreadByAgent: firebase.database.ServerValue.increment(1)
        });
        
        // Dosya seçimini temizle
        clearFileSelection();
        document.getElementById('messageInput').value = '';
        document.getElementById('messageInput').focus();
        
        console.log('Dosya gönderildi:', selectedFile.name);
    };
    
    reader.readAsDataURL(selectedFile);
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
