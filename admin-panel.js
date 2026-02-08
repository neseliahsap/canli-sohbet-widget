// ============================================
// ADMIN PANEL - SHA-256 + BİLDİRİMLER
// ============================================

let currentChatId = null;
let agentName = 'Admin';
let notifiedChats = new Set();

// SHA-256 hash fonksiyonu
async function hashPassword(password) {
    const msgBuffer = new TextEncoder().encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Login
async function login() {
    const username = document.getElementById('usernameInput').value.trim();
    const password = document.getElementById('passwordInput').value.trim();
    const errorDiv = document.getElementById('loginError');
    
    console.log('🔑 Login attempt:', username);
    
    try {
        // Firebase'den kullanıcıyı çek
        const snapshot = await database.ref('users').orderByChild('username').equalTo(username).once('value');
        const users = snapshot.val();
        
        if (!users) {
            console.log('❌ Kullanıcı bulunamadı');
            errorDiv.classList.add('show');
            return;
        }
        
        const userId = Object.keys(users)[0];
        const user = users[userId];
        
        // Şifreyi hash'le ve karşılaştır
        const hashedPassword = await hashPassword(password);
        
        if (hashedPassword === user.password) {
            console.log('✅ Giriş başarılı!');
            
            sessionStorage.setItem('loggedIn', 'true');
            sessionStorage.setItem('username', username);
            sessionStorage.setItem('userId', userId);
            agentName = user.fullName || username;
            
            // Son giriş zamanını güncelle
            database.ref(`users/${userId}`).update({
                lastLogin: Date.now()
            });
            
            errorDiv.classList.remove('show');
            document.getElementById('loginScreen').style.display = 'none';
            document.getElementById('mainContainer').classList.add('active');
            
            loadChats();
            requestNotificationPermission();
        } else {
            console.log('❌ Şifre yanlış');
            errorDiv.classList.add('show');
        }
    } catch (error) {
        console.error('Login error:', error);
        errorDiv.classList.add('show');
    }
}

// Bildirim izni iste
function requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
    }
}

// Bildirim sesi çal
function playNotificationSound() {
    const audio = document.getElementById('notificationSound');
    if (audio) {
        audio.play().catch(e => console.log('Ses çalınamadı'));
    }
}

// Browser bildirimi göster
function showBrowserNotification(title, message) {
    if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(title, {
            body: message,
            icon: 'icon-192x192.png',
            badge: 'icon-192x192.png'
        });
    }
}

// Logout
function logout() {
    sessionStorage.clear();
    location.reload();
}

// Enter tuşu
document.addEventListener('DOMContentLoaded', function() {
    console.log('✅ Admin panel yüklendi');
    
    if (sessionStorage.getItem('loggedIn') === 'true') {
        agentName = sessionStorage.getItem('username') || 'Admin';
        document.getElementById('loginScreen').style.display = 'none';
        document.getElementById('mainContainer').classList.add('active');
        loadChats();
    }
    
    const passwordInput = document.getElementById('passwordInput');
    if (passwordInput) {
        passwordInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                login();
            }
        });
    }
});

// Sohbetleri yükle
function loadChats() {
    console.log('📥 Sohbetler yükleniyor...');
    
    database.ref('chats').on('value', (snapshot) => {
        const chats = snapshot.val();
        displayChats(chats);
    });
    
    // Yeni mesaj dinleyicisi
    database.ref('chats').on('child_changed', (snapshot) => {
        const chat = snapshot.val();
        const chatId = snapshot.key;
        
        // Yeni mesaj var mı?
        if (chatId !== currentChatId && chat.unreadByAgent > 0) {
            
            // Bu chat için bildirim gönderildi mi?
            if (!notifiedChats.has(chatId)) {
                notifiedChats.add(chatId);
                
                // Ses çal
                playNotificationSound();
                
                // Browser bildirimi
                showBrowserNotification(
                    'Yeni Mesaj',
                    `${chat.visitorName || 'Ziyaretçi'} mesaj gönderdi`
                );
                
                // 30 saniye sonra tekrar bildirim gönderilebilir
                setTimeout(() => {
                    notifiedChats.delete(chatId);
                }, 30000);
            }
        }
    });
}

// Sohbetleri göster
function displayChats(chats) {
    const container = document.getElementById('chatsList');
    
    if (!chats) {
        container.innerHTML = '<p style="text-align:center;color:#999;padding:40px;">Henüz sohbet yok</p>';
        return;
    }
    
    const chatArray = Object.keys(chats).map(id => ({id, ...chats[id]}));
    chatArray.sort((a, b) => (b.lastMessageTime || 0) - (a.lastMessageTime || 0));
    
    let html = '';
    chatArray.forEach(chat => {
        if (chat.status !== 'ended') {
            const unreadBadge = chat.unreadByAgent > 0 ? `<span style="background:#f44336;color:white;border-radius:50%;padding:2px 6px;font-size:11px;margin-left:5px;">${chat.unreadByAgent}</span>` : '';
            
            html += `
                <div class="chat-item ${currentChatId === chat.id ? 'active' : ''}" onclick="selectChat('${chat.id}')">
                    <strong>${chat.visitorName || 'Ziyaretçi'} ${unreadBadge}</strong><br>
                    <small style="color:#666;">${chat.lastMessage || 'Yeni sohbet'}</small>
                </div>
            `;
        }
    });
    
    container.innerHTML = html || '<p style="text-align:center;color:#999;">Aktif sohbet yok</p>';
}

// Sohbet seç
function selectChat(chatId) {
    console.log('💬 Sohbet seçildi:', chatId);
    currentChatId = chatId;
    
    // Okunmadı işaretini temizle
    database.ref(`chats/${chatId}/unreadByAgent`).set(0);
    
    // Bildirim spam önleme
    notifiedChats.delete(chatId);
    
    displayChats(null);
    database.ref('chats').once('value', (snapshot) => {
        displayChats(snapshot.val());
    });
    
    loadMessages(chatId);
}

// Mesajları yükle
function loadMessages(chatId) {
    database.ref(`chats/${chatId}/messages`).on('value', (snapshot) => {
        const messages = snapshot.val();
        displayMessages(messages);
    });
}

// Mesajları göster
function displayMessages(messages) {
    const container = document.getElementById('messagesArea');
    
    if (!messages) {
        container.innerHTML = '<p style="text-align:center;color:#999;">Henüz mesaj yok</p>';
        return;
    }
    
    const messageArray = Object.keys(messages).map(id => ({id, ...messages[id]}));
    messageArray.sort((a, b) => a.timestamp - b.timestamp);
    
    let html = '';
    messageArray.forEach(msg => {
        const isAgent = msg.sender === 'agent';
        const time = new Date(msg.timestamp).toLocaleTimeString('tr-TR', {hour: '2-digit', minute: '2-digit'});
        
        let content = escapeHtml(msg.text);
        
        // Dosya varsa göster
        if (msg.type === 'file' && msg.file) {
            const isImage = msg.file.type && msg.file.type.startsWith('image/');
            
            if (isImage) {
                content += `<br><img src="${msg.file.data}" style="max-width:200px; border-radius:8px; margin-top:8px; cursor:pointer;" onclick="window.open('${msg.file.data}')">`;
            } else {
                content += `<br><a href="${msg.file.data}" download="${msg.file.name}" style="display:inline-block; margin-top:8px; padding:6px 12px; background:#f0f0f0; border-radius:6px; text-decoration:none; color:#333;">📄 ${msg.file.name}</a>`;
            }
        }
        
        html += `
            <div class="message ${isAgent ? 'agent' : 'visitor'}">
                <div class="message-bubble">
                    ${content}<br>
                    <small style="opacity:0.7;">${time}</small>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
    container.scrollTop = container.scrollHeight;
}

// Mesaj gönder
function sendMessage() {
    const input = document.getElementById('messageInput');
    const message = input.value.trim();
    const fileInput = document.getElementById('fileInput');
    const file = fileInput ? fileInput.files[0] : null;
    
    if (!message && !file) return;
    if (!currentChatId) return;
    
    // Dosya varsa dosya gönder
    if (file) {
        sendFileMessage(file, message);
        return;
    }
    
    // Normal metin mesajı
    const messageData = {
        text: message,
        sender: 'agent',
        senderName: agentName,
        timestamp: Date.now(),
        type: 'text'
    };
    
    database.ref(`chats/${currentChatId}/messages`).push().set(messageData);
    database.ref(`chats/${currentChatId}`).update({
        lastMessage: message,
        lastMessageTime: Date.now(),
        unreadByVisitor: firebase.database.ServerValue.increment(1)
    });
    
    input.value = '';
}

// Dosya mesajı gönder
function sendFileMessage(file, caption) {
    if (file.size > 5 * 1024 * 1024) {
        alert('Dosya çok büyük! Maksimum 5MB');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const messageData = {
            text: caption || '📎 Dosya',
            sender: 'agent',
            senderName: agentName,
            timestamp: Date.now(),
            type: 'file',
            file: {
                name: file.name,
                size: file.size,
                type: file.type,
                data: e.target.result
            }
        };
        
        database.ref(`chats/${currentChatId}/messages`).push().set(messageData);
        database.ref(`chats/${currentChatId}`).update({
            lastMessage: `📎 ${file.name}`,
            lastMessageTime: Date.now(),
            unreadByVisitor: firebase.database.ServerValue.increment(1)
        });
        
        document.getElementById('messageInput').value = '';
        document.getElementById('fileInput').value = '';
    };
    
    reader.readAsDataURL(file);
}

// Sohbeti sonlandır
function endChat() {
    if (!currentChatId) return;
    
    if (confirm('Bu sohbeti sonlandırmak istediğinizden emin misiniz?\n\nMüşteri puanlama formu görecek.')) {
        database.ref(`chats/${currentChatId}`).update({
            status: 'ended',
            endTime: Date.now()
        });
        
        alert('Sohbet sonlandırıldı. Müşteri puanlama yapabilir.');
        currentChatId = null;
    }
}

// Enter ile mesaj
document.addEventListener('DOMContentLoaded', function() {
    const messageInput = document.getElementById('messageInput');
    if (messageInput) {
        messageInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });
    }
});

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

console.log('✅ Admin panel JS yüklendi');
