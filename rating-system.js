// ============================================
// SOHBET PUANLAMA SİSTEMİ
// ============================================

// Sohbeti sonlandır ve puanlama göster
function endChatWithRating(chatId) {
    // Admin panelde sonlandırma
    if (confirm('Bu sohbeti sonlandırmak istediğinizden emin misiniz?')) {
        database.ref(`chats/${chatId}`).update({
            status: 'ended',
            endTime: Date.now()
        });
        
        // Widget'a bildir - puanlama formu göster
        notifyWidgetChatEnded(chatId);
    }
}

// Widget'a sohbet bitti mesajı gönder
function notifyWidgetChatEnded(chatId) {
    // Widget iframe'ine mesaj gönder
    const iframe = document.getElementById('chat-widget-iframe');
    if (iframe && iframe.contentWindow) {
        iframe.contentWindow.postMessage({
            type: 'CHAT_ENDED',
            chatId: chatId
        }, '*');
    }
}

// Widget tarafında - puanlama formu HTML
function createRatingForm() {
    return `
        <div class="rating-container" style="padding: 20px; text-align: center; background: white; border-radius: 12px; margin: 20px;">
            <h3 style="margin-bottom: 15px; color: #333;">Sohbeti Değerlendirin</h3>
            <p style="color: #666; margin-bottom: 20px;">Destek ekibimiz size nasıl yardımcı oldu?</p>
            
            <!-- Yıldızlar -->
            <div class="stars" style="margin-bottom: 20px;">
                <span class="star" data-rating="1" onclick="selectRating(1)">⭐</span>
                <span class="star" data-rating="2" onclick="selectRating(2)">⭐</span>
                <span class="star" data-rating="3" onclick="selectRating(3)">⭐</span>
                <span class="star" data-rating="4" onclick="selectRating(4)">⭐</span>
                <span class="star" data-rating="5" onclick="selectRating(5)">⭐</span>
            </div>
            
            <!-- Yorum -->
            <textarea id="ratingComment" placeholder="Görüşlerinizi paylaşın (opsiyonel)" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 8px; margin-bottom: 15px; resize: none;" rows="3"></textarea>
            
            <!-- Butonlar -->
            <button onclick="submitRating()" style="background: #00a884; color: white; border: none; padding: 12px 30px; border-radius: 8px; cursor: pointer; margin-right: 10px;">Gönder</button>
            <button onclick="skipRating()" style="background: #999; color: white; border: none; padding: 12px 30px; border-radius: 8px; cursor: pointer;">Atla</button>
        </div>
        
        <style>
        .star {
            font-size: 40px;
            cursor: pointer;
            margin: 0 5px;
            transition: all 0.2s;
            filter: grayscale(100%);
        }
        
        .star:hover,
        .star.selected {
            filter: grayscale(0%);
            transform: scale(1.2);
        }
        </style>
    `;
}

// Yıldız seçimi
let selectedRating = 0;
function selectRating(rating) {
    selectedRating = rating;
    
    // Tüm yıldızları güncelle
    document.querySelectorAll('.star').forEach((star, index) => {
        if (index < rating) {
            star.classList.add('selected');
        } else {
            star.classList.remove('selected');
        }
    });
}

// Puanlama gönder
function submitRating() {
    if (selectedRating === 0) {
        alert('Lütfen bir yıldız seçin');
        return;
    }
    
    const comment = document.getElementById('ratingComment').value;
    
    const ratingData = {
        rating: selectedRating,
        comment: comment,
        timestamp: Date.now(),
        chatId: currentChatId
    };
    
    // Firebase'e kaydet
    database.ref(`ratings/${currentChatId}`).set(ratingData);
    
    // Teşekkür mesajı göster
    showThankYouMessage();
}

// Puanlama atla
function skipRating() {
    showThankYouMessage();
}

// Teşekkür mesajı
function showThankYouMessage() {
    const messagesArea = document.getElementById('messagesArea');
    messagesArea.innerHTML = `
        <div style="text-align: center; padding: 40px;">
            <div style="font-size: 60px; margin-bottom: 20px;">✅</div>
            <h2 style="color: #00a884; margin-bottom: 10px;">Teşekkürler!</h2>
            <p style="color: #666;">Görüşleriniz bizim için çok değerli.</p>
            <button onclick="closeWidget()" style="margin-top: 20px; background: #00a884; color: white; border: none; padding: 12px 30px; border-radius: 8px; cursor: pointer;">Kapat</button>
        </div>
    `;
}

// Widget'ı kapat
function closeWidget() {
    // Parent window'a mesaj gönder
    if (window.parent) {
        window.parent.postMessage({
            type: 'CLOSE_WIDGET'
        }, '*');
    }
}
