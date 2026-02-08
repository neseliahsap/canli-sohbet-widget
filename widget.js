// ============================================
// WIDGET - İSİM SORMA + DOSYA GÖNDERİMİ
// ============================================

let currentChatId = null;
let botMode = true;
let agentConnected = false;
let visitorName = '';
let askingForName = false;

// Hoş geldin mesajı
document.addEventListener('DOMContentLoaded', function() {
    console.log('✅ Widget loaded');
    
    // Bot adı
    if (typeof chatbotConfig !== 'undefined') {
        document.getElementById('botName').textContent = chatbotConfig.botName;
    }
    
    // Hoş geldin
    setTimeout(() => {
        addBotMessage('👋 Merhaba! Size nasıl yardımcı olabilirim?');
    }, 500);
});

// Bot mesajı ekle
function addBotMessage(text) {
    const messagesArea = document.getElementById('messagesArea');
    
    showTyping();
    
    setTimeout(() => {
        hideTyping();
        
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message bot';
        messageDiv.innerHTML = `
            <div class="message-bubble">
                ${text.replace(/\n/g, '<br>')}
            </div>
        `;
        
        messagesArea.appendChild(messageDiv);
        scrollToBottom();
        playNotificationSound();
    }, 1000);
}

// Kullanıcı mesajı ekle
function addUserMessage(text) {
    const messagesArea = document.getElementById('messagesArea');
    
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message user';
    messageDiv.innerHTML = `
        <div class="message-bubble">
            ${escapeHtml(text)}
        </div>
    `;
    
    messagesArea.appendChild(messageDiv);
    scrollToBottom();
}

// Typing indicator
function showTyping() {
    const messagesArea = document.getElementById('messagesArea');
    const existing = messagesArea.querySelector('.typing');
    if (existing) existing.remove();
    
    const typingDiv = document.createElement('div');
    typingDiv.className = 'typing';
    typingDiv.innerHTML = '<span></span><span></span><span></span>';
    
    messagesArea.appendChild(typingDiv);
    scrollToBottom();
}

function hideTyping() {
    const typing = document.querySelector('.typing');
    if (typing) typing.remove();
}

// Mesaj gönder
function sendMessage() {
    const input = document.getElementById('messageInput');
    const message = input.value.trim();
    const fileInput = document.getElementById('fileInput');
    const file = fileInput ? fileInput.files[0] : null;
    
    if (!message && !file) return;
    
    // İsim sorma modundaysa
    if (askingForName && message) {
        visitorName = message;
        askingForName = false;
        addUserMessage(message);
        input.value = '';
        
        addBotMessage(`Memnun oldum ${visitorName}! Bir temsilcimizi bağlıyorum...`);
        
        setTimeout(() => {
            createChatSession();
        }, 2000);
        
        return;
    }
    
    // Kullanıcı mesajını göster
    if (message) {
        addUserMessage(message);
    }
    
    input.value = '';
    
    // Dosya varsa gönder
    if (file) {
        if (file.size > 5 * 1024 * 1024) {
            addBotMessage('❌ Dosya çok büyük! Maksimum 5MB yükleyebilirsiniz.');
            fileInput.value = '';
            return;
        }
        
        if (agentConnected) {
            sendFileToAgent(file, message || '📎 Dosya');
        } else {
            addBotMessage('Dosya göndermek için önce bir temsilciye bağlanmalısınız.');
        }
        fileInput.value = '';
        return;
    }
    
    // Bot modundaysa
    if (botMode && !agentConnected && typeof getBotResponse !== 'undefined') {
        const botResponse = getBotResponse(message);
        
        if (botResponse) {
            addBotMessage(botResponse.response);
            
            if (botResponse.transferToAgent) {
                setTimeout(() => {
                    askNameAndTransfer();
                }, 2000);
            }
        } else {
            addBotMessage('Size nasıl yardımcı olabilirim?');
        }
    } else if (agentConnected) {
        sendToAgent(message);
    }
}

// İsim sor ve transfer et
function askNameAndTransfer() {
    askingForName = true;
    addBotMessage('Önce adınızı öğrenebilir miyim? 😊');
}

// Firebase'de sohbet oluştur
function createChatSession() {
    botMode = false;
    
    const chatData = {
        visitorName: visitorName || 'Web Ziyaretçisi',
        startTime: Date.now(),
        status: 'active',
        lastMessage: 'Yeni sohbet başlatıldı',
        lastMessageTime: Date.now(),
        unreadByAgent: 1,
        unreadByVisitor: 0
    };
    
    const newChatRef = database.ref('chats').push();
    currentChatId = newChatRef.key;
    newChatRef.set(chatData);
    
    localStorage.setItem('chatId', currentChatId);
    localStorage.setItem('visitorName', visitorName);
    
    addBotMessage('✅ Bir temsilcimiz size yardımcı olacak. Lütfen bekleyin...');
    
    listenToAgentMessages();
    
    console.log('Sohbet oluşturuldu:', currentChatId);
}

// Agent mesajlarını dinle
function listenToAgentMessages() {
    if (!currentChatId) return;
    
    database.ref(`chats/${currentChatId}/messages`).on('child_added', (snapshot) => {
        const message = snapshot.val();
        
        if (message.sender === 'agent') {
            agentConnected = true;
            displayAgentMessage(message);
        }
    });
}

// Agent mesajını göster
function displayAgentMessage(message) {
    const messagesArea = document.getElementById('messagesArea');
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message bot';
    
    let content = `<strong>${escapeHtml(message.senderName || 'Temsilci')}:</strong><br>${escapeHtml(message.text)}`;
    
    // Dosya varsa
    if (message.type === 'file' && message.file) {
        const isImage = message.file.type && message.file.type.startsWith('image/');
        
        if (isImage) {
            content += `<br><img src="${message.file.data}" style="max-width:200px; border-radius:8px; margin-top:8px; cursor:pointer;" onclick="window.open('${message.file.data}', '_blank')">`;
        } else {
            content += `<br><a href="${message.file.data}" download="${message.file.name}" style="display:inline-block; margin-top:8px; padding:6px 12px; background:rgba(0,0,0,0.05); border-radius:6px; text-decoration:none; color:#333;">📄 ${message.file.name}</a>`;
        }
    }
    
    messageDiv.innerHTML = `<div class="message-bubble">${content}</div>`;
    
    messagesArea.appendChild(messageDiv);
    scrollToBottom();
    playNotificationSound();
    
    // Okundu işaretle
    database.ref(`chats/${currentChatId}/unreadByVisitor`).set(0);
}

// Agent'a mesaj gönder
function sendToAgent(text) {
    if (!currentChatId) {
        createChatSession();
        setTimeout(() => sendToAgent(text), 1000);
        return;
    }
    
    const messageData = {
        text: text,
        sender: 'visitor',
        senderName: visitorName || 'Ziyaretçi',
        timestamp: Date.now(),
        type: 'text'
    };
    
    database.ref(`chats/${currentChatId}/messages`).push().set(messageData);
    database.ref(`chats/${currentChatId}`).update({
        lastMessage: text,
        lastMessageTime: Date.now(),
        unreadByAgent: firebase.database.ServerValue.increment(1)
    });
}

// Dosya gönder
function sendFileToAgent(file, caption) {
    if (!currentChatId) {
        addBotMessage('Önce bir temsilciye bağlanmalısınız.');
        return;
    }
    
    addUserMessage(caption || `📎 ${file.name}`);
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const messageData = {
            text: caption || '📎 Dosya',
            sender: 'visitor',
            senderName: visitorName || 'Ziyaretçi',
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
            unreadByAgent: firebase.database.ServerValue.increment(1)
        });
    };
    
    reader.readAsDataURL(file);
}

// Enter ile gönder
document.getElementById('messageInput').addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});

// Dosya seçimi
const fileInputElement = document.getElementById('fileInput');
if (fileInputElement) {
    fileInputElement.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            // Dosya seçildi, gönder butonuna tıklanması bekleniyor
            console.log('Dosya seçildi:', file.name);
        }
    });
}

// Yardımcı fonksiyonlar
function scrollToBottom() {
    const messagesArea = document.getElementById('messagesArea');
    messagesArea.scrollTop = messagesArea.scrollHeight;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function playNotificationSound() {
    const audio = document.getElementById('widgetNotificationSound');
    if (audio) {
        audio.play().catch(e => console.log('Ses çalınamadı'));
    }
}

console.log('✅ Widget JS yüklendi');
