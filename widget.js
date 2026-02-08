// ============================================
// WIDGET - BASİT ÇALIŞAN VERSİYON
// ============================================

let currentChatId = null;
let botMode = true;
let agentConnected = false;

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
    
    // Typing göster
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
    
    if (!message) return;
    
    // Kullanıcı mesajını göster
    addUserMessage(message);
    input.value = '';
    
    // Bot modunda mı?
    if (botMode && !agentConnected && typeof getBotResponse !== 'undefined') {
        const botResponse = getBotResponse(message);
        
        if (botResponse) {
            addBotMessage(botResponse.response);
            
            // Temsilciye yönlendir mi?
            if (botResponse.transferToAgent) {
                setTimeout(() => {
                    transferToAgent();
                }, 2000);
            }
        } else {
            addBotMessage('Size nasıl yardımcı olabilirim?');
        }
    } else {
        // Canlı desteğe gönder
        sendToAgent(message);
    }
}

// Temsilciye aktar
function transferToAgent() {
    botMode = false;
    addBotMessage('Bir temsilcimiz size yardımcı olacak. Lütfen bekleyin...');
    
    // Firebase'de sohbet oluştur
    if (!currentChatId) {
        createChatSession();
    }
}

// Firebase'de sohbet oluştur
function createChatSession() {
    const chatData = {
        visitorName: 'Web Ziyaretçisi',
        startTime: Date.now(),
        status: 'active',
        lastMessage: 'Bot\'tan temsilciye yönlendirildi',
        lastMessageTime: Date.now()
    };
    
    const newChatRef = database.ref('chats').push();
    currentChatId = newChatRef.key;
    newChatRef.set(chatData);
    
    localStorage.setItem('chatId', currentChatId);
    
    // Agent mesajlarını dinle
    listenToAgentMessages();
    
    console.log('Chat created:', currentChatId);
}

// Agent mesajlarını dinle
function listenToAgentMessages() {
    if (!currentChatId) return;
    
    database.ref(`chats/${currentChatId}/messages`).on('child_added', (snapshot) => {
        const message = snapshot.val();
        
        if (message.sender === 'agent') {
            agentConnected = true;
            addBotMessage(`👤 ${message.senderName}: ${message.text}`);
        }
    });
}

// Agent'a mesaj gönder
function sendToAgent(text) {
    if (!currentChatId) {
        createChatSession();
    }
    
    const messageData = {
        text: text,
        sender: 'visitor',
        senderName: 'Ziyaretçi',
        timestamp: Date.now(),
        type: 'text'
    };
    
    database.ref(`chats/${currentChatId}/messages`).push().set(messageData);
    
    database.ref(`chats/${currentChatId}`).update({
        lastMessage: text,
        lastMessageTime: Date.now()
    });
}

// Enter ile gönder
document.getElementById('messageInput').addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});

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

console.log('✅ Widget JS loaded');
