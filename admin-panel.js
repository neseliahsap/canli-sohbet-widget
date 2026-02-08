// ADMIN PANEL - BASİT ŞİFRE (HASH YOK)
let currentChatId = null;
let agentName = 'Admin';

// Kullanıcılar
const users = {
    'admin': 'admin123',
    'destek': 'destek123'
};

// Login
function login() {
    const username = document.getElementById('usernameInput').value.trim();
    const password = document.getElementById('passwordInput').value.trim();
    const errorDiv = document.getElementById('loginError');
    
    console.log('🔑 Login - User:', username, 'Pass:', password);
    console.log('📋 Kayıtlı kullanıcılar:', Object.keys(users));
    
    if (users[username] && users[username] === password) {
        console.log('✅ GİRİŞ BAŞARILI!');
        sessionStorage.setItem('loggedIn', 'true');
        sessionStorage.setItem('username', username);
        agentName = username;
        
        errorDiv.classList.remove('show');
        document.getElementById('loginScreen').style.display = 'none';
        document.getElementById('mainContainer').classList.add('active');
        
        loadChats();
    } else {
        console.log('❌ GİRİŞ BAŞARISIZ!');
        console.log('Girilen şifre:', password);
        console.log('Beklenen şifre:', users[username]);
        errorDiv.classList.add('show');
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
            html += `
                <div class="chat-item ${currentChatId === chat.id ? 'active' : ''}" onclick="selectChat('${chat.id}')">
                    <strong>${chat.visitorName || 'Ziyaretçi'}</strong><br>
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
        lastMessageTime: Date.now()
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
            lastMessageTime: Date.now()
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
