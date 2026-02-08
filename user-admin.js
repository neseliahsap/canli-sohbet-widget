// ============================================
// KULLANICI YÖNETİMİ
// ============================================

let editingUserId = null;

// Sayfa yüklendiğinde
document.addEventListener('DOMContentLoaded', function() {
    // Admin kontrolü
    const loggedInUser = sessionStorage.getItem('username');
    if (!loggedInUser) {
        window.location.href = 'index.html';
        return;
    }
    
    // Sadece admin erişebilir
    checkIfAdmin(loggedInUser);
    
    // Kullanıcıları yükle
    loadUsers();
});

// Admin kontrolü
function checkIfAdmin(username) {
    database.ref(`users/${username}/role`).once('value', (snapshot) => {
        if (snapshot.val() !== 'admin') {
            alert('Bu sayfaya erişim yetkiniz yok!');
            window.location.href = 'index.html';
        }
    });
}

// Kullanıcıları yükle
function loadUsers() {
    database.ref('users').on('value', (snapshot) => {
        const users = snapshot.val();
        displayUsers(users);
    });
}

// Kullanıcıları göster
function displayUsers(users) {
    const tbody = document.getElementById('usersList');
    
    if (!users) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:#999;">Henüz kullanıcı yok</td></tr>';
        return;
    }
    
    let html = '';
    Object.keys(users).forEach(userId => {
        const user = users[userId];
        const lastLogin = user.lastLogin ? new Date(user.lastLogin).toLocaleString('tr-TR') : 'Hiç giriş yapmadı';
        
        html += `
            <tr>
                <td><strong>${user.username}</strong></td>
                <td>${user.fullName || '-'}</td>
                <td><span class="badge badge-${user.role}">${user.role === 'admin' ? 'Admin' : 'Temsilci'}</span></td>
                <td>${lastLogin}</td>
                <td>
                    <button class="btn btn-primary" onclick="editUser('${userId}')">Düzenle</button>
                    <button class="btn btn-danger" onclick="deleteUser('${userId}', '${user.username}')">Sil</button>
                </td>
            </tr>
        `;
    });
    
    tbody.innerHTML = html;
}

// Yeni kullanıcı modal aç
function openAddUserModal() {
    editingUserId = null;
    document.getElementById('modalTitle').textContent = 'Yeni Kullanıcı Ekle';
    document.getElementById('userForm').reset();
    document.getElementById('userModal').classList.add('show');
}

// Kullanıcı düzenle
function editUser(userId) {
    editingUserId = userId;
    document.getElementById('modalTitle').textContent = 'Kullanıcıyı Düzenle';
    
    database.ref(`users/${userId}`).once('value', (snapshot) => {
        const user = snapshot.val();
        
        document.getElementById('username').value = user.username;
        document.getElementById('fullName').value = user.fullName || '';
        document.getElementById('password').value = user.password;
        document.getElementById('role').value = user.role;
        
        document.getElementById('userModal').classList.add('show');
    });
}

// Kullanıcı kaydet
function saveUser(event) {
    event.preventDefault();
    
    const username = document.getElementById('username').value.trim();
    const fullName = document.getElementById('fullName').value.trim();
    const password = document.getElementById('password').value.trim();
    const role = document.getElementById('role').value;
    
    const userData = {
        username: username,
        fullName: fullName,
        password: password,
        role: role,
        createdAt: Date.now()
    };
    
    // Yeni kullanıcı mı düzenleme mi?
    if (editingUserId) {
        // Güncelle
        database.ref(`users/${editingUserId}`).update(userData)
            .then(() => {
                alert('Kullanıcı güncellendi!');
                closeModal();
            });
    } else {
        // Yeni ekle
        const newUserRef = database.ref('users').push();
        newUserRef.set(userData)
            .then(() => {
                alert('Kullanıcı eklendi!');
                closeModal();
            });
    }
}

// Kullanıcı sil
function deleteUser(userId, username) {
    if (confirm(`${username} kullanıcısını silmek istediğinizden emin misiniz?`)) {
        database.ref(`users/${userId}`).remove()
            .then(() => {
                alert('Kullanıcı silindi!');
            });
    }
}

// Modal kapat
function closeModal() {
    document.getElementById('userModal').classList.remove('show');
    document.getElementById('userForm').reset();
    editingUserId = null;
}

// ESC ile kapat
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closeModal();
    }
});

console.log('✅ Kullanıcı yönetimi yüklendi');
