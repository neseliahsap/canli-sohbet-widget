// ============================================
// WIDGET JAVASCRIPT - CHATBOT ENTEGRASYONLU
// ============================================

let currentChatId = null;
let selectedFile = null;
let lastVisitorMessageCount = 0;
let botMode = true;  // Bot aktif mi?
let agentConnected = false;  // Canlı temsilci bağlandı mı?
let messagesListener = null;

// Hoş geldin mesajı göster
function showWelcomeMessage() {
    const status = shouldBotRespond();
    
    // Mesai dışı mesajı varsa göster
    if (status.message) {
        addBotMessage(status.message);
    }
    
    // Hoş geldin mesajı
    addBotMessage(chatbotConfig.welcomeMessage);
    
    // Quick replies göster
    showQuickReplies([
        "Mesai saatleriniz",
        "Teslimat bilgisi",
        "İade nasıl yapılır?",
        "Fiyat bilgisi"
    ]);
}

// Bot mesajı ekle
function addBotMessage(text, delay = 0) {
    setTimeout(() => {
        showTypingIndicator();
        
        setTimeout(() => {
            hideTypingIndicator();
            
            const messagesArea = document.getElementById('messagesArea');
            const messageDiv = document.createElement('div');
            messageDiv.className = 'message bot';
            
            // Linkler tıklanabilir yap
            const formattedText = text.replace(
                /(https?:\/\/[^\s]+)/g, 
                '<a href="$1" target="_blank">$1</a>'
            );
            
            messageDiv.innerHTML = `
                <div class="message-content">
                    <div class="bot-name-label">${chatbotConfig.botName}</div>
                    ${formattedText.replace(/\n/g, '<br>')}
                    <div class="message-time">${formatTime(Date.now())}</div>
                </div>
            `;
            
            messagesArea.appendChild(messageDiv);
            scrollToBottom();
            
            // Sesi çal
            playVisitorNotificationSound();
        }, 1000 + delay);
    }, delay);
}

// Kullanıcı mesajı ekle
function addUserMessage(text) {
    const messagesArea = document.getElementById('messagesArea');
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message user';
    
    messageDiv.innerHTML = `
        <div class="message-content">
            ${escapeHtml(text)}
            <div class="message-time">${formatTime(Date.now())}</div>
        </div>
    `;
    
    messagesArea.appendChild(messageDiv);
    scrollToBottom();
}

// Typing indicator
function showTypingIndicator() {
    const messagesArea = document.getElementById('messagesArea');
    
    // Varolan typing indicator'ı kaldır
    const existing = messagesArea.querySelector('.typing-indicator');
    if (existing) existing.remove();
    
    const typingDiv = document.createElement('div');
    typingDiv.className = 'typing-indicator active';
    typingDiv.innerHTML = `
        <span class="typing-dot"></span>
        <span class="typing-dot"></span>
        <span class="typing-dot"></span>
    `;
    
    messagesArea.appendChild(typingDiv);
    scrollToBottom();
}

function hideTypingIndicator() {
    const indicator = document.querySelector('.typing-indicator');
    if (indicator) indicator.remove();
}

// Quick replies göster
function showQuickReplies(replies) {
    const container = document.getElementById('quickReplies');
    container.innerHTML = '';
    
    replies.forEach(reply => {
        const btn = document.createElement('button');
        btn.className = 'quick-reply-btn';
        btn.textContent = reply;
        btn.onclick = () => {
            sendQuickReply(reply);
        };
        container.appendChild(btn);
    });
}

function sendQuickReply(text) {
    // Quick replies'ı gizle
    document.getElementById('quickReplies').innerHTML = '';
    
    // Mesajı gönder
    document.getElementById('messageInput').value = text;
    sendMessage();
}

// Mesaj gönder
function sendMessage() {
    const input = document.getElementById('messageInput');
    const message = input.value.trim();
    
    if (!message && !selectedFile) {
        return;
    }
    
    // Kullanıcı mesajını göster
    if (message) {
        addUserMessage(message);
    }
    
    // Dosya varsa
    if (selectedFile) {
        sendFileToFirebase(message || '📎 Dosya');
        input.value = '';
        return;
    }
    
    // Input'u temizle
    input.value = '';
    input.style.height = 'auto';
    
    // Bot modundaysa bot cevaplasın
    if (botMode && !agentConnected) {
        handleBotResponse(message);
    } else {
        // Agent'a gönder
        sendToAgent(message);
    }
}

// Bot cevabı işle
function handleBotResponse(userMessage) {
    const botResponse = getBotResponse(userMessage);
    
    if (!botResponse) {
        addBotMessage("Üzgünüm, bir sorun oluştu. Lütfen tekrar deneyin.");
        return;
    }
    
    // Bot cevabını göster
    addBotMessage(botResponse.response, 0);
    
    // Temsilciye yönlendir mi?
    if (botResponse.transferToAgent) {
        setTimeout(() => {
            transferToAgent();
        }, 2000);
    } else if (botResponse.suggestAgent) {
        // Agent öner
        showQuickReplies([
            "Evet, temsilci ile konuşmak istiyorum",
            "Hayır, devam et"
        ]);
    }
    
    // Firebase'e kaydet (analytics için)
    saveBotInteraction(userMessage, botResponse);
}

// Temsilciye aktar
function transferToAgent() {
    botMode = false;
    agentConnected = false;  // Henüz bağlanmadı
    
    addSystemMessage("Bir temsilcimiz size yardımcı olacak...");
    
    // Firebase'de sohbet oluştur
    if (!currentChatId) {
        createChatSession();
    }
    
    // Hoş geldin mesajı ekle
    setTimeout(() => {
        addBotMessage("Merhaba! Size nasıl yardımcı olabilirim?");
    }, 1500);
}

// Sistem mesajı
function addSystemMessage(text) {
    const messagesArea = document.getElementById('messagesArea');
    const messageDiv = document.createElement('div');
    messageDiv.className = 'system-message';
    messageDiv.innerHTML = `<div class="system-badge">${text}</div>`;
    messagesArea.appendChild(messageDiv);
    scrollToBottom();
}

// Firebase'de sohbet oluştur
function createChatSession() {
    const chatData = {
        visitorName: 'Web Ziyaretçisi',
        startTime: Date.now(),
        status: 'active',
        lastMessage: 'Bot\'tan temsilciye yönlendirildi',
        lastMessageTime: Date.now(),
        unreadByAgent: 1,
        unreadByVisitor: 0,
        source: 'chatbot_transfer'
    };
    
    const newChatRef = database.ref('chats').push();
    currentChatId = newChatRef.key;
    newChatRef.set(chatData);
    
    // localStorage'a kaydet
    localStorage.setItem('chatId', currentChatId);
    
    // Mesajları dinle
    listenToAgentMessages();
    
    console.log('Sohbet oluşturuldu:', currentChatId);
}

// Agent mesajlarını dinle
function listenToAgentMessages() {
    if (!currentChatId) return;
    
    const messagesRef = database.ref(`chats/${currentChatId}/messages`);
    
    messagesRef.on('child_added', (snapshot) => {
        const message = snapshot.val();
        
        // Agent mesajı mı?
        if (message.sender === 'agent') {
            agentConnected = true;
            
            // İlk agent mesajıysa
            if (!agentConnected) {
                addSystemMessage("✅ Temsilci bağlandı");
            }
            
            // Mesajı göster
            displayAgentMessage(message);
        }
    });
}

// Agent mesajını göster
function displayAgentMessage(message) {
    const messagesArea = document.getElementById('messagesArea');
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message bot';
    
    let content = escapeHtml(message.text);
    
    // Dosya varsa
    if (message.type === 'file' && message.file) {
        const isImage = message.file.type && message.file.type.startsWith('image/');
        
        if (isImage) {
            content += `<br><img src="${message.file.data}" class="message-image" onclick="window.open('${message.file.data}', '_blank')">`;
        } else {
            content += `
                <a href="${message.file.data}" download="${message.file.name}" class="message-file">
                    <span>📄</span>
                    <div>
                        <div>${message.file.name}</div>
                        <div style="font-size:11px;opacity:0.7">${formatFileSize(message.file.size)}</div>
                    </div>
                </a>
            `;
        }
    }
    
    messageDiv.innerHTML = `
        <div class="message-content">
            <div class="bot-name-label">${message.senderName || 'Temsilci'}</div>
            ${content}
            <div class="message-time">${formatTime(message.timestamp)}</div>
        </div>
    `;
    
    messagesArea.appendChild(messageDiv);
    scrollToBottom();
    playVisitorNotificationSound();
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
        lastMessageTime: Date.now(),
        unreadByAgent: firebase.database.ServerValue.increment(1)
    });
}

// Dosya gönder
function sendFileToFirebase(caption) {
    if (!selectedFile) return;
    
    if (!currentChatId) {
        createChatSession();
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const fileData = {
            text: caption,
            sender: 'visitor',
            senderName: 'Ziyaretçi',
            timestamp: Date.now(),
            type: 'file',
            file: {
                name: selectedFile.name,
                size: selectedFile.size,
                type: selectedFile.type,
                data: e.target.result
            }
        };
        
        database.ref(`chats/${currentChatId}/messages`).push().set(fileData);
        
        database.ref(`chats/${currentChatId}`).update({
            lastMessage: `📎 ${selectedFile.name}`,
            lastMessageTime: Date.now(),
            unreadByAgent: firebase.database.ServerValue.increment(1)
        });
        
        // Kullanıcı mesajı olarak göster
        addUserMessage(caption);
        
        clearFile();
    };
    
    reader.readAsDataURL(selectedFile);
}

// Bot etkileşimini kaydet (analytics)
function saveBotInteraction(userMessage, botResponse) {
    database.ref('bot-analytics').push({
        userMessage: userMessage,
        botResponse: botResponse.response,
        category: botResponse.category,
        transferredToAgent: botResponse.transferToAgent || false,
        timestamp: Date.now()
    });
}

// Dosya seç
document.getElementById('fileInput').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    if (file.size > 5 * 1024 * 1024) {
        alert('Dosya boyutu çok büyük! Maksimum 5MB.');
        return;
    }
    
    selectedFile = file;
    document.getElementById('filePreview').classList.add('active');
    document.getElementById('fileName').textContent = `${file.name} (${formatFileSize(file.size)})`;
});

function clearFile() {
    selectedFile = null;
    document.getElementById('fileInput').value = '';
    document.getElementById('filePreview').classList.remove('active');
}

// Enter ile gönder
document.getElementById('messageInput').addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});

// Auto-resize textarea
document.getElementById('messageInput').addEventListener('input', function() {
    this.style.height = 'auto';
    this.style.height = (this.scrollHeight) + 'px';
});

// Yardımcı fonksiyonlar
function scrollToBottom() {
    const messagesArea = document.getElementById('messagesArea');
    messagesArea.scrollTop = messagesArea.scrollHeight;
}

function formatTime(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function playVisitorNotificationSound() {
    const audio = document.getElementById('widgetNotificationSound');
    if (audio) {
        audio.play().catch(e => console.log('Ses çalınamadı'));
    }
}

// Sayfa yüklendiğinde
document.addEventListener('DOMContentLoaded', function() {
    console.log('Widget yüklendi');
    
    // Bot adını config'den al
    if (chatbotConfig && chatbotConfig.botName) {
        document.getElementById('botName').textContent = chatbotConfig.botName;
    }
    
    // Hoş geldin mesajı
    setTimeout(() => {
        showWelcomeMessage();
    }, 500);
    
    // Önceki sohbeti kontrol et
    const savedChatId = localStorage.getItem('chatId');
    if (savedChatId) {
        currentChatId = savedChatId;
        botMode = false;
        agentConnected = true;
        addSystemMessage("Önceki sohbetiniz devam ediyor");
        listenToAgentMessages();
    }
});

console.log('✅ Widget JavaScript yüklendi');
