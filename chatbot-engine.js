// ============================================
// CHATBOT ENGINE - Anahtar Kelime Tabanlı
// ============================================

const chatbotConfig = {
    botName: "Neseliahşap Asistan",
    companyName: "Neseliahşap",
    
    // Hoş geldin mesajı
    welcomeMessage: "👋 Merhaba! Ben Neseliahşap asistanıyım. Size nasıl yardımcı olabilirim?",
    
    // Canlı desteğe yönlendirme mesajı
    transferMessage: "Size daha iyi yardımcı olabilmem için bir temsilcimizi bağlıyorum. Lütfen bekleyin...",
    
    // Anlamadım mesajları
    noMatchMessages: [
        "Bu konuda size daha iyi yardımcı olabilmem için bir temsilcimizi bağlayayım mı?",
        "Üzgünüm, tam olarak anlayamadım. Bir temsilcimize bağlanmak ister misiniz?",
        "Bu sorunuzla ilgili detaylı bilgi için temsilcimize bağlanabilirsiniz."
    ],
    
    // FAQ Database - Anahtar kelimeler | Cevap
    faqs: [
        {
            keywords: ["mesai", "çalışma saati", "açık", "kapalı", "saat kaç", "ne zaman açık"],
            response: "Mesai saatlerimiz:\n📅 Pazartesi - Cuma: 08:30 - 20:00\n🚫 Hafta sonu kapalıyız.",
            category: "hours"
        },
        {
            keywords: ["fiyat", "ücret", "ne kadar", "para", "maliyet", "tutar"],
            response: "Fiyat bilgilerimiz için web sitemizi ziyaret edebilir veya temsilcimizle görüşebilirsiniz:\n🔗 https://neseliahsap.com/fiyatlar",
            category: "pricing",
            requiresAgent: true  // Temsilciye yönlendir
        },
        {
            keywords: ["teslimat", "kargo", "gönderim", "gönderi", "ne zaman gelir", "teslim"],
            response: "🚚 Teslimat bilgilerimiz:\n• Türkiye geneline 2-3 iş günü\n• Ücretsiz kargo (150₺ üzeri)\n• Kapıda ödeme mevcut",
            category: "shipping"
        },
        {
            keywords: ["iade", "değişim", "iptal", "geri gönder", "iade etmek"],
            response: "🔄 İade ve Değişim:\n• 14 gün içinde ücretsiz iade\n• Kutusunda ve hasarsız olmalı\n• İade kargo ücretsiz\n\nDetaylı bilgi: https://neseliahsap.com/iade-kosullari",
            category: "returns"
        },
        {
            keywords: ["iletişim", "telefon", "email", "adres", "ulaş", "ara"],
            response: "📞 Bize Ulaşın:\n• Tel: 0850 XXX XX XX\n• Email: info@neseliahsap.com\n• Adres: [Adresiniz]\n\n🔗 https://neseliahsap.com/iletisim",
            category: "contact"
        },
        {
            keywords: ["ürün", "katalog", "ne satıyor", "neler var", "ürünler"],
            response: "🪵 Ürünlerimiz:\n• Ahşap mobilyalar\n• Dekorasyon ürünleri\n• Özel tasarım hizmetleri\n\nKatalog: https://neseliahsap.com/urunler",
            category: "products"
        },
        {
            keywords: ["özel", "tasarım", "sipariş", "özelleştirme", "kişiselleştir"],
            response: "✨ Özel Tasarım Hizmeti:\nDilediğiniz ölçü ve modelde üretim yapıyoruz!\n\nBir temsilcimizle görüşmek ister misiniz?",
            category: "custom",
            requiresAgent: true
        },
        {
            keywords: ["garanti", "garantili", "garanti süresi"],
            response: "✅ Garanti:\n• Tüm ürünlerimiz 2 yıl garantili\n• Üretim hatalarını kapsıyor\n• Garanti belgesi ile teslim",
            category: "warranty"
        },
        {
            keywords: ["ödeme", "kredi kartı", "havale", "nakit", "taksit"],
            response: "💳 Ödeme Seçenekleri:\n• Kredi kartı (Taksit imkanı)\n• Havale/EFT (%5 indirim)\n• Kapıda ödeme\n• 9 taksit",
            category: "payment"
        },
        {
            keywords: ["merhaba", "selam", "günaydın", "iyi günler", "hey", "hi", "hello"],
            response: "Merhaba! Size nasıl yardımcı olabilirim? 😊",
            category: "greeting"
        },
        {
            keywords: ["teşekkür", "sağol", "thanks", "teşekkürler"],
            response: "Rica ederim! Başka bir sorunuz varsa yardımcı olmaktan mutluluk duyarım. 😊",
            category: "thanks"
        }
    ],
    
    // Temsilciye yönlendirme kelimeleri
    agentTriggers: [
        "temsilci", "insan", "canlı destek", "birisi", "yetkili", 
        "müdür", "sorumlu", "yönetici", "danışman"
    ]
};

// Mesaj analiz et ve cevap ver
function getBotResponse(userMessage) {
    const lowerMessage = userMessage.toLowerCase().trim();
    
    // Boş mesaj
    if (!lowerMessage) {
        return null;
    }
    
    // Temsilci talebi var mı?
    const wantsAgent = chatbotConfig.agentTriggers.some(trigger => 
        lowerMessage.includes(trigger)
    );
    
    if (wantsAgent) {
        return {
            response: chatbotConfig.transferMessage,
            transferToAgent: true,
            category: "agent_request"
        };
    }
    
    // FAQ'lerde ara
    for (const faq of chatbotConfig.faqs) {
        const hasMatch = faq.keywords.some(keyword => 
            lowerMessage.includes(keyword.toLowerCase())
        );
        
        if (hasMatch) {
            return {
                response: faq.response,
                transferToAgent: faq.requiresAgent || false,
                category: faq.category
            };
        }
    }
    
    // Hiçbir şey eşleşmedi
    const randomNoMatch = chatbotConfig.noMatchMessages[
        Math.floor(Math.random() * chatbotConfig.noMatchMessages.length)
    ];
    
    return {
        response: randomNoMatch,
        transferToAgent: false,
        category: "no_match",
        suggestAgent: true  // Agent öner ama zorla bağlama
    };
}

// Mesai saati kontrolü
function shouldBotRespond() {
    const now = new Date();
    const hour = now.getHours();
    const day = now.getDay();
    
    // Hafta sonu - bot her zaman cevaplasın
    if (day === 0 || day === 6) {
        return {
            shouldRespond: true,
            reason: "weekend"
        };
    }
    
    // Mesai dışı - bot her zaman cevaplasın
    const isBusinessHours = (hour > 8 || (hour === 8 && now.getMinutes() >= 30)) && hour < 20;
    
    if (!isBusinessHours) {
        return {
            shouldRespond: true,
            reason: "after_hours",
            message: "⏰ Mesai saatleri dışındayız.\n\nMesai saatlerimiz: Pazartesi-Cuma, 08:30-20:00\n\nSize yardımcı olmaya çalışacağım, ancak acil durumlar için iletişim formumuzdan ulaşabilirsiniz:\n🔗 https://neseliahsap.com/iletisim"
        };
    }
    
    // Mesai saati içinde - bot + agent
    return {
        shouldRespond: true,
        reason: "business_hours"
    };
}

// Test fonksiyonu
function testBot() {
    console.log("🤖 Chatbot Test Başladı\n");
    
    const testMessages = [
        "Merhaba",
        "Mesai saatleriniz nedir?",
        "Fiyat bilgisi alabilir miyim?",
        "Kargo ücreti ne kadar?",
        "İade yapabilir miyim?",
        "Telefon numaranız nedir?",
        "Temsilci ile görüşmek istiyorum",
        "Ahşap masa var mı?"
    ];
    
    testMessages.forEach(msg => {
        const result = getBotResponse(msg);
        console.log(`Kullanıcı: ${msg}`);
        console.log(`Bot: ${result.response}`);
        console.log(`Agent Transfer: ${result.transferToAgent}`);
        console.log("---");
    });
}

// Export (eğer module kullanıyorsanız)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getBotResponse, shouldBotRespond, chatbotConfig };
}
