// ============================================
// ADMIN PANEL JAVASCRIPT - ŞİFRE KORUMASLI
// ============================================

// ⚠️ ŞİFRE AYARI - SHA-256 HASH (GÜVENLİ)
// Şifrenizi değiştirmek için: https://emn178.github.io/online-tools/sha256.html
// Örnek: "admin123" → hash → buraya yapıştır
const ADMIN_PASSWORD_HASH = 'ac9689e2272427085e35b9d3e3e8bed88cb3434828b43b86fc0596cad4c6e270';  // admin123

let currentChatId = null;
let agentName = 'Temsilci';
let chatsListener = null;
let messagesListener = null;
let isAuthenticated = false;
let lastMessageCount = 0;
let selectedAdminFile = null;

// Bildirim gönderilen chatler (spam önleme)
let notifiedChats = new Set();

// SHA-256 hash fonksiyonu
async function hashPassword(password) {
    const msgBuffer = new TextEncoder().encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
}

// Login kontrolü
function checkAuth() {
    const savedAuth = sessionStorage.getItem('adminAuth');
    if (savedAuth === 'true') {
        isAuthenticated = true;
        showMainPanel();
    }
}

// Login fonksiyonu
async function login() {
    console.log('Login fonksiyonu çağrıldı');
    const passwordInput = document.getElementById('passwordInput');
    const password = passwordInput.value;
    const errorDiv = document.getElementById('loginError');
    
    if (!password) {
        alert('Lütfen şifrenizi girin');
        return;
    }
    
    console.log('Şifre hash\'leniyor...');
    
    try {
        // Şifreyi hash'le ve karşılaştır
        const hashedPassword = await hashPassword(password);
        console.log('Hash oluşturuldu:', hashedPassword.substring(0, 10) + '...');
        
        if (hashedPassword === ADMIN_PASSWORD_HASH) {
            console.log('Şifre doğru! Giriş yapılıyor...');
            isAuthenticated = true;
            sessionStorage.setItem('adminAuth', 'true');
            errorDiv.classList.remove('show');
            showMainPanel();
        } else {
            console.log('Şifre yanlış!');
            errorDiv.classList.add('show');
            passwordInput.value = '';
            passwordInput.focus();
            playErrorSound();
        }
    } catch (error) {
        console.error('Login hatası:', error);
        alert('Giriş sırasında bir hata oluştu. Lütfen tekrar deneyin.');
    }
}

// Logout fonksiyonu
function logout() {
    if (confirm('Çıkış yapmak istediğinizden emin misiniz?')) {
        isAuthenticated = false;
        sessionStorage.removeItem('adminAuth');
        updateAgentStatus(false);
        document.getElementById('loginScreen').style.display = 'flex';
        document.getElementById('mainContainer').classList.remove('authenticated');
        document.getElementById('passwordInput').value = '';
    }
}

// Hata sesi
function playErrorSound() {
    const errorSound = new Audio('data:audio/wav;base64,UklGRhQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=');
    errorSound.play().catch(e => console.log('Ses çalınamadı'));
}

// Ana paneli göster
function showMainPanel() {
    console.log('Ana panel gösteriliyor...');
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('mainContainer').classList.add('authenticated');
    initializePanel();
}

// Panel'i başlat
function initializePanel() {
    console.log('Panel başlatılıyor...');
    
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
    
    // Textarea otomatik boyutlandırma ve yazıyor göstergesi
    document.getElementById('messageInput').addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight) + 'px';
        
        // Yazıyor göstergesi
        if (currentChatId && this.value.trim().length > 0) {
            updateTyping(true);
        } else if (currentChatId) {
            updateTyping(false);
        }
    });
    
    // Dosya upload
    const adminFileInput = document.getElementById('adminFileInput');
    if (adminFileInput) {
        adminFileInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (!file) return;
            
            if (file.size > 5 * 1024 * 1024) {
                alert('Dosya boyutu çok büyük! Maksimum 5MB yükleyebilirsiniz.');
                return;
            }
            
            selectedAdminFile = file;
            document.getElementById('adminFilePreview').style.display = 'block';
            document.getElementById('adminFileName').textContent = `📄 ${file.name} (${formatFileSize(file.size)})`;
        });
    }
    
    // Agent'ı çevrimiçi olarak işaretle
    updateAgentStatus(true);
    
    // Sayfa kapanırken agent'ı çevrimdışı yap
    window.addEventListener('beforeunload', function() {
        updateAgentStatus(false);
    });
    
    // Sohbetleri dinlemeye başla
    listenToChats();
    
    console.log('Admin panel hazır');
}

// Dosya boyutu formatla
function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

// Dosya seçimini temizle
function clearAdminFileSelection() {
    selectedAdminFile = null;
    document.getElementById('adminFileInput').value = '';
    document.getElementById('adminFilePreview').style.display = 'none';
}

// Agent durumunu güncelle
function updateAgentStatus(isOnline) {
    const agentId = getAgentId();
    database.ref('agents/' + agentId).set({
        name: agentName,
        online: isOnline,
        lastSeen: Date.now()
    });
}

// Unique agent ID al
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
    
    // Bildirim spam önleme - bu chat'i temizle
    notifiedChats.delete(chatId);
    
    // Mesajları dinlemeye başla
    listenToMessages(chatId);
    
    // UI'ı güncelle
    document.getElementById('emptyChatArea').style.display = 'none';
    document.getElementById('activeChatArea').style.display = 'flex';
    
    // Mobil görünüm: Chat listesini gizle, mesaj alanını göster
    if (window.innerWidth <= 768) {
        document.getElementById('chatList').classList.add('hide-on-mobile');
        document.getElementById('chatArea').classList.remove('hide-on-mobile');
    }
    
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

// Mobil geri butonu
function goBackToList() {
    if (window.innerWidth <= 768) {
        document.getElementById('chatList').classList.remove('hide-on-mobile');
        document.getElementById('chatArea').classList.add('hide-on-mobile');
        currentChatId = null;
        lastMessageCount = 0;
    }
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
    
    // Yeni mesaj var mı kontrol et
    if (messageArray.length > lastMessageCount) {
        const lastMsg = messageArray[messageArray.length - 1];
        if (lastMsg.sender === 'visitor') {
            playNotificationSound();
        }
    }
    lastMessageCount = messageArray.length;
    
    // HTML oluştur
    let html = '';
    messageArray.forEach(msg => {
        const isAgent = msg.sender === 'agent';
        const time = formatTime(msg.timestamp);
        
        let messageContent = escapeHtml(msg.text);
        
        // Dosya mesajı mı?
        if (msg.type === 'file' && msg.file) {
            const isImage = msg.file.type && msg.file.type.startsWith('image/');
            
            if (isImage) {
                messageContent = `
                    ${escapeHtml(msg.text)}<br>
                    <img src="${msg.file.data}" alt="${msg.file.name}" style="max-width:250px; border-radius:8px; margin-top:8px; cursor:pointer;" onclick="window.open('${msg.file.data}', '_blank')">
                    <div style="font-size:11px; opacity:0.7; margin-top:4px;">${msg.file.name}</div>
                `;
            } else {
                messageContent = `
                    ${escapeHtml(msg.text)}<br>
                    <a href="${msg.file.data}" download="${msg.file.name}" style="display:inline-block; margin-top:8px; padding:8px 12px; background:rgba(255,255,255,0.2); border-radius:6px; text-decoration:none; color:inherit;">
                        📄 ${msg.file.name} (${formatFileSize(msg.file.size)})
                    </a>
                `;
            }
        }
        
        html += `
            <div class="message ${isAgent ? 'agent' : 'visitor'}">
                <div class="message-content">
                    ${messageContent}
                    <div class="message-time">${time}</div>
                </div>
            </div>
        `;
    });
    
    // Yazıyor göstergesi ekle
    html += `
        <div id="visitorTypingIndicator" style="display: none; padding: 12px 16px; background: white; border-radius: 18px; width: fit-content; margin-bottom: 15px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);">
            <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: #999; margin: 0 2px; animation: typing 1.4s infinite;"></span>
            <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: #999; margin: 0 2px; animation: typing 1.4s infinite; animation-delay: 0.2s;"></span>
            <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: #999; margin: 0 2px; animation: typing 1.4s infinite; animation-delay: 0.4s;"></span>
        </div>
    `;
    
    container.innerHTML = html;
    
    // En alta scroll
    container.scrollTop = container.scrollHeight;
    
    // Visitor yazıyor mu dinle
    if (currentChatId) {
        database.ref(`chats/${currentChatId}/typing`).on('value', (snapshot) => {
            const typing = snapshot.val();
            const indicator = document.getElementById('visitorTypingIndicator');
            
            if (typing && typing.who === 'visitor' && typing.isTyping) {
                if (Date.now() - typing.timestamp < 5000) {
                    if (indicator) indicator.style.display = 'block';
                    container.scrollTop = container.scrollHeight;
                } else {
                    if (indicator) indicator.style.display = 'none';
                }
            } else {
                if (indicator) indicator.style.display = 'none';
            }
        });
    }
}

// Yazıyor göstergesini güncelle
let typingTimeout;
function updateTyping(isTyping) {
    if (!currentChatId) return;
    
    database.ref(`chats/${currentChatId}/typing`).set({
        isTyping: isTyping,
        who: 'agent',
        timestamp: Date.now()
    });
    
    if (isTyping) {
        clearTimeout(typingTimeout);
        typingTimeout = setTimeout(() => {
            database.ref(`chats/${currentChatId}/typing`).set({
                isTyping: false,
                who: 'agent',
                timestamp: Date.now()
            });
        }, 3000);
    }
}

// Mesaj gönder
function sendMessage() {
    const input = document.getElementById('messageInput');
    const message = input.value.trim();
    
    if (!message && !selectedAdminFile) {
        return;
    }
    
    if (!currentChatId) {
        return;
    }
    
    // Yazıyor göstergesini kapat
    updateTyping(false);
    
    // Eğer dosya seçiliyse
    if (selectedAdminFile) {
        sendAdminFileMessage(message || '📎 Dosya gönderildi');
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
    input.style.height = 'auto';
    input.focus();
}

// Dosya mesajı gönder (admin)
function sendAdminFileMessage(caption) {
    if (!selectedAdminFile || !currentChatId) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const fileData = {
            text: caption,
            sender: 'agent',
            senderName: agentName,
            timestamp: Date.now(),
            type: 'file',
            file: {
                name: selectedAdminFile.name,
                size: selectedAdminFile.size,
                type: selectedAdminFile.type,
                data: e.target.result
            }
        };
        
        database.ref(`chats/${currentChatId}/messages`).push().set(fileData);
        
        database.ref(`chats/${currentChatId}`).update({
            lastMessage: `📎 ${selectedAdminFile.name}`,
            lastMessageTime: Date.now(),
            unreadByVisitor: firebase.database.ServerValue.increment(1)
        });
        
        clearAdminFileSelection();
        document.getElementById('messageInput').value = '';
        document.getElementById('messageInput').focus();
    };
    
    reader.readAsDataURL(selectedAdminFile);
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
        
        currentChatId = null;
        lastMessageCount = 0;
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
    
    if (diff < 86400000 && date.getDate() === now.getDate()) {
        return date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    }
    
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.getDate() === yesterday.getDate()) {
        return 'Dün ' + date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    }
    
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

// Bildirim sesi çal
function playNotificationSound() {
    const audio = document.getElementById('notificationSound');
    if (audio) {
        audio.play().catch(e => console.log('Ses çalınamadı:', e));
    }
}

// Yeni mesaj geldiğinde bildirim (sadece visitor'dan gelen için)
database.ref('chats').on('child_changed', (snapshot) => {
    const chat = snapshot.val();
    const chatId = snapshot.key;
    
    // Eğer mevcut sohbet değilse ve okunmamış mesaj varsa
    if (chatId !== currentChatId && chat.unreadByAgent > 0) {
        
        // Bu chat için daha önce bildirim gönderildi mi?
        if (!notifiedChats.has(chatId)) {
            notifiedChats.add(chatId);
            
            // Bildirim sesi çal
            playNotificationSound();
            
            // Desktop notification (izin varsa)
            if ('Notification' in window && Notification.permission === 'granted') {
                new Notification('Yeni Mesaj', {
                    body: (chat.visitorName || 'Bir ziyaretçi') + ' mesaj gönderdi',
                    icon: 'https://cdn-icons-png.flaticon.com/512/1041/1041916.png',
                    badge: 'https://cdn-icons-png.flaticon.com/512/1041/1041916.png',
                    tag: chatId
                });
            }
            
            showNotification('Yeni mesaj: ' + (chat.visitorName || 'Ziyaretçi'));
            
            // 30 saniye sonra bu chat için tekrar bildirim gönderilebilir
            setTimeout(() => {
                notifiedChats.delete(chatId);
            }, 30000);
        }
    }
});

// Browser notification izni iste
if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
}

// Enter ile login - Sayfa yüklendiğinde
document.addEventListener('DOMContentLoaded', function() {
    console.log('✅ Admin Panel yüklendi');
    checkAuth();
    
    // Enter tuşu ile login
    const passwordInput = document.getElementById('passwordInput');
    if (passwordInput) {
        passwordInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                console.log('Enter tuşuna basıldı, login çağrılıyor...');
                login();
            }
        });
        passwordInput.focus();
    }
    
    console.log('✅ Event listener\'lar kuruldu');
});

console.log('✅ Admin Panel JavaScript yüklendi');
