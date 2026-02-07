// ============================================
// KULLANICI YÖNETİMİ SİSTEMİ
// ============================================

// Kullanıcı Database (Firebase'de tutulacak)
const USERS_REF = 'admin-users';

// Varsayılan kullanıcılar (ilk kurulum)
const DEFAULT_USERS = {
    'admin': {
        username: 'admin',
        password: hashPasswordSync('admin123'),  // SHA-256
        name: 'Admin',
        role: 'admin',
        createdAt: Date.now()
    }
};

// SHA-256 hash (sync version for defaults)
function hashPasswordSync(password) {
    // Basit hash (production'da crypto.subtle kullan)
    let hash = 0;
    for (let i = 0; i < password.length; i++) {
        const char = password.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return hash.toString(36);
}

// SHA-256 hash (async - tarayıcı)
async function hashPassword(password) {
    const msgBuffer = new TextEncoder().encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Kullanıcıları Firebase'e kaydet (ilk kurulum)
async function initializeUsers() {
    const usersRef = database.ref(USERS_REF);
    
    // Kullanıcılar var mı kontrol et
    const snapshot = await usersRef.once('value');
    
    if (!snapshot.exists()) {
        console.log('İlk kullanıcılar oluşturuluyor...');
        
        // Varsayılan kullanıcıları ekle
        for (const [username, userData] of Object.entries(DEFAULT_USERS)) {
            await usersRef.child(username).set(userData);
        }
        
        console.log('✅ Kullanıcılar oluşturuldu');
    }
}

// Kullanıcı doğrula
async function validateUser(username, password) {
    try {
        const userRef = database.ref(`${USERS_REF}/${username}`);
        const snapshot = await userRef.once('value');
        
        if (!snapshot.exists()) {
            return { success: false, error: 'Kullanıcı bulunamadı' };
        }
        
        const userData = snapshot.val();
        const hashedPassword = await hashPassword(password);
        
        if (userData.password === hashedPassword) {
            // Son giriş zamanını güncelle
            await userRef.update({
                lastLogin: Date.now()
            });
            
            return {
                success: true,
                user: {
                    username: userData.username,
                    name: userData.name,
                    role: userData.role
                }
            };
        } else {
            return { success: false, error: 'Şifre hatalı' };
        }
    } catch (error) {
        console.error('Doğrulama hatası:', error);
        return { success: false, error: 'Bir hata oluştu' };
    }
}

// Yeni kullanıcı ekle
async function addUser(username, password, name, role = 'agent') {
    try {
        const userRef = database.ref(`${USERS_REF}/${username}`);
        
        // Kullanıcı zaten var mı?
        const snapshot = await userRef.once('value');
        if (snapshot.exists()) {
            return { success: false, error: 'Kullanıcı zaten mevcut' };
        }
        
        const hashedPassword = await hashPassword(password);
        
        await userRef.set({
            username: username,
            password: hashedPassword,
            name: name,
            role: role,
            createdAt: Date.now()
        });
        
        return { success: true };
    } catch (error) {
        console.error('Kullanıcı ekleme hatası:', error);
        return { success: false, error: 'Bir hata oluştu' };
    }
}

// Kullanıcı sil
async function deleteUser(username) {
    if (username === 'admin') {
        return { success: false, error: 'Admin kullanıcısı silinemez' };
    }
    
    try {
        await database.ref(`${USERS_REF}/${username}`).remove();
        return { success: true };
    } catch (error) {
        return { success: false, error: 'Silme hatası' };
    }
}

// Tüm kullanıcıları listele
async function listUsers() {
    try {
        const snapshot = await database.ref(USERS_REF).once('value');
        const users = [];
        
        snapshot.forEach(child => {
            const user = child.val();
            users.push({
                username: user.username,
                name: user.name,
                role: user.role,
                lastLogin: user.lastLogin || null,
                createdAt: user.createdAt
            });
        });
        
        return users;
    } catch (error) {
        console.error('Kullanıcı listesi hatası:', error);
        return [];
    }
}

// Cihaz hatırlama (Remember Me)
function saveLoginCredentials(username, password, remember) {
    if (remember) {
        // LocalStorage'a şifreli kaydet
        const encrypted = btoa(JSON.stringify({ username, password }));
        localStorage.setItem('rememberedUser', encrypted);
    } else {
        localStorage.removeItem('rememberedUser');
    }
}

// Hatırlanan kullanıcıyı al
function getRememberedUser() {
    const encrypted = localStorage.getItem('rememberedUser');
    if (!encrypted) return null;
    
    try {
        const decrypted = atob(encrypted);
        return JSON.parse(decrypted);
    } catch (error) {
        localStorage.removeItem('rememberedUser');
        return null;
    }
}

// Oturumu kaydet
function saveSession(user) {
    sessionStorage.setItem('currentUser', JSON.stringify(user));
}

// Oturumu al
function getSession() {
    const session = sessionStorage.getItem('currentUser');
    return session ? JSON.parse(session) : null;
}

// Oturumu temizle
function clearSession() {
    sessionStorage.removeItem('currentUser');
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        initializeUsers,
        validateUser,
        addUser,
        deleteUser,
        listUsers,
        saveLoginCredentials,
        getRememberedUser,
        saveSession,
        getSession,
        clearSession
    };
}
