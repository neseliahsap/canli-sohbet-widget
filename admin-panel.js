// ============================================
// ADMIN PANEL JAVASCRIPT
// ============================================

let currentChatId = null;
let agentName = 'Temsilci';
let chatsListener = null;
let messagesListener = null;

// Sayfa yüklendiğinde
document.addEventListener('DOMContentLoaded', function() {
    console.log('Admin Panel yüklendi');
    
    // Agent adını localStorage'dan al
    const savedAgentName = localStorage.getItem('agentName');
    if (savedAgentName) {
        agentName = savedAgentName;
        document.getElementById('agentNameInput').value = savedAgentName;
    }
    
    // Agent adı değiştiğinde kaydet
    document.getElementById('agentNameInput').addEventListener('change', function(e) {
        agentName = e.target.value || 'Temsilci';
        localStorage.setItem('agentName', agentName);
        updateAgentStatus(true);
    });
    
    // Enter tuşu ile mesaj gönderme
    document.getElementById('messageInput').addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
    
    // Textarea otomatik boyutlandırma
    document.getElementById('messageInput').addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight) + 'px';
    });
    
    // Agent'ı çevrimiçi olarak işaretle
    updateAgentStatus(true);
    
    // Sayfa kapanırken agent'ı çevrimdışı yap
    window.addEventListener('beforeunload', function() {
        updateAgentStatus(false);
    });
    
    // Sohbetleri dinlemeye başla
    listenToChats();
    
    console.log('Kurulum tamamlandı, sohbetler bekleniyor...');
});

// Agent durumunu güncelle
function updateAgentStatus(isOnline) {
    const agentId = getAgentId();
    database.ref('agents/' + agentId).set({
        name: agentName,
        online: isOnline,
        lastSeen: Date.now()
    });
}

// Unique agent ID al (localStorage'da sakla)
function getAgentId() {
    let agentId = localStorage.getItem('agentId');
    if (!agentId) {
        agentId = 'agent_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('agentId', agentId);
    }
    return agentId;
}

// Sohbetleri dinle
function listenToChats() {
    const chatsRef = database.ref('chats');
    
    chatsRef.on('value', (snapshot) => {
        const chats = snapshot.val();
        displayChats(chats);
    });
}

// Sohbetleri göster
function displayChats(chats) {
    const container = document.getElementById('chatsContainer');
    
    if (!chats) {
        container.innerHTML = `
            <div style="padding: 20px; text-align: center; color: #999;">
                <p>Henüz aktif sohbet yok</p>
                <p style="font-size: 12px; margin-top: 10px;">Müşteriler web sitenizden mesaj gönderdiğinde burada görünecek</p>
            </div>
        `;
        return;
    }
    
    // Sohbetleri diziye çevir ve sırala
    const chatArray = Object.keys(chats).map(chatId => ({
        id: chatId,
        ...chats[chatId]
    }));
    
    // Son mesaja göre sırala
    chatArray.sort((a, b) => {
        const aLastMsg = a.lastMessageTime || 0;
        const bLastMsg = b.lastMessageTime || 0;
        return bLastMsg - aLastMsg;
    });
    
    // HTML oluştur
    let html = '';
    chatArray.forEach(chat => {
        if (chat.status !== 'ended') {
            const isActive = currentChatId === chat.id;
            const hasUnread = chat.unreadByAgent > 0;
            const lastMessage = chat.lastMessage || 'Yeni sohbet';
            const time = formatTime(chat.lastMessageTime || chat.startTime);
            
            html += `
                <div class="chat-item ${isActive ? 'active' : ''} ${hasUnread ? 'unread' : ''}" 
                     onclick="selectChat('${chat.id}')">
                    <div class="visitor-name">
                        <span class="online-dot"></span>
                        ${chat.visitorName || 'Ziyaretçi'}
                    </div>
                    <div class="last-message">${escapeHtml(lastMessage)}</div>
                    <div class="chat-time">${time}</div>
                </div>
            `;
        }
    });
    
    container.innerHTML = html || '<div style="padding: 20px; text-align: center; color: #999;">Henüz aktif sohbet yok</div>';
}

// Sohbet seç
function selectChat(chatId) {
    console.log('Sohbet seçildi:', chatId);
    currentChatId = chatId;
    
    // Okunmadı işaretini temizle
    database.ref(`chats/${chatId}/unreadByAgent`).set(0);
    
    // Mesajları dinlemeye başla
    listenToMessages(chatId);
    
    // UI'ı güncelle
    document.getElementById('emptyChatArea').style.display = 'none';
    document.getElementById('activeChatArea').style.display = 'flex';
    
    // Visitor bilgilerini göster
    database.ref(`chats/${chatId}`).once('value', (snapshot) => {
        const chat = snapshot.val();
        if (chat) {
            document.getElementById('activeVisitorName').textContent = chat.visitorName || 'Ziyaretçi';
            document.getElementById('activeVisitorStatus').textContent = 'Çevrimiçi';
        }
    });
    
    // Sohbet listesini güncelle
    displayChats(null);
    database.ref('chats').once('value', (snapshot) => {
        displayChats(snapshot.val());
    });
}

// Mesajları dinle
function listenToMessages(chatId) {
    // Önceki listener'ı kaldır
    if (messagesListener) {
        messagesListener.off();
    }
    
    const messagesRef = database.ref(`chats/${chatId}/messages`);
    
    messagesRef.on('value', (snapshot) => {
        const messages = snapshot.val();
        displayMessages(messages);
    });
    
    messagesListener = messagesRef;
}

// Mesajları göster
function displayMessages(messages) {
    const container = document.getElementById('messagesContainer');
    
    if (!messages) {
        container.innerHTML = '<div style="padding: 20px; text-align: center; color: #999;">Henüz mesaj yok</div>';
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
        const isAgent = msg.sender === 'agent';
        const time = formatTime(msg.timestamp);
        
        html += `
            <div class="message ${isAgent ? 'agent' : 'visitor'}">
                <div class="message-content">
                    ${escapeHtml(msg.text)}
                    <div class="message-time">${time}</div>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
    
    // En alta scroll
    container.scrollTop = container.scrollHeight;
}

// Mesaj gönder
function sendMessage() {
    const input = document.getElementById('messageInput');
    const message = input.value.trim();
    
    if (!message || !currentChatId) {
        return;
    }
    
    const messageData = {
        text: message,
        sender: 'agent',
        senderName: agentName,
        timestamp: Date.now()
    };
    
    // Mesajı kaydet
    const newMessageRef = database.ref(`chats/${currentChatId}/messages`).push();
    newMessageRef.set(messageData);
    
    // Sohbet bilgilerini güncelle
    database.ref(`chats/${currentChatId}`).update({
        lastMessage: message,
        lastMessageTime: Date.now(),
        unreadByVisitor: firebase.database.ServerValue.increment(1)
    });
    
    // Input'u temizle
    input.value = '';
    input.style.height = 'auto';
    input.focus();
    
    console.log('Mesaj gönderildi:', message);
}

// Sohbeti sonlandır
function endChat() {
    if (!currentChatId) {
        return;
    }
    
    if (confirm('Bu sohbeti sonlandırmak istediğinizden emin misiniz?')) {
        database.ref(`chats/${currentChatId}`).update({
            status: 'ended',
            endTime: Date.now()
        });
        
        // UI'ı sıfırla
        currentChatId = null;
        document.getElementById('emptyChatArea').style.display = 'flex';
        document.getElementById('activeChatArea').style.display = 'none';
        
        showNotification('Sohbet sonlandırıldı');
    }
}

// Zamanı formatla
function formatTime(timestamp) {
    if (!timestamp) return '';
    
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    // Bugün mü?
    if (diff < 86400000 && date.getDate() === now.getDate()) {
        return date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    }
    
    // Dün mü?
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.getDate() === yesterday.getDate()) {
        return 'Dün ' + date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    }
    
    // Daha eski
    return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
}

// HTML escape
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Bildirim göster
function showNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Yeni mesaj geldiğinde bildirim (sadece visitor'dan gelen için)
database.ref('chats').on('child_changed', (snapshot) => {
    const chat = snapshot.val();
    const chatId = snapshot.key;
    
    // Eğer mevcut sohbet değilse ve okunmamış mesaj varsa
    if (chatId !== currentChatId && chat.unreadByAgent > 0) {
        // Bildirim sesi çal
        const audio = document.getElementById('notificationSound');
        if (audio) {
            audio.play().catch(e => console.log('Ses çalınamadı:', e));
        }
        
        showNotification('Yeni mesaj: ' + (chat.visitorName || 'Ziyaretçi'));
    }
});

console.log('Admin Panel JavaScript yüklendi');
