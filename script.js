const API_BASE = '/api';
let currentUser = null;
let currentChatWith = null;
let replyingToMessage = null;

const loginPage = document.getElementById('login-page');
const chatsPage = document.getElementById('chats-page');
const chatPage = document.getElementById('chat-page');
const profilePage = document.getElementById('profile-page');
const nameInput = document.getElementById('name-input');
const registerBtn = document.getElementById('register-btn');
const profileBtn = document.getElementById('profile-btn');
const logoutBtn = document.getElementById('logout-btn');
const headerUserId = document.getElementById('header-user-id');
const searchInput = document.getElementById('search-input');
const searchResults = document.getElementById('search-results');
const chatList = document.getElementById('chat-list');
const chatBackBtn = document.getElementById('chat-back-btn');
const chatWithName = document.getElementById('chat-with-name');
const chatWithAvatar = document.getElementById('chat-with-avatar');
const chatMessages = document.getElementById('chat-messages');
const messageInput = document.getElementById('message-input');
const sendBtn = document.getElementById('send-btn');
const profileAvatar = document.getElementById('profile-avatar');
const profileName = document.getElementById('profile-name');
const profileId = document.getElementById('profile-id');
const backFromProfileBtn = document.getElementById('back-from-profile-btn');
const notification = document.getElementById('notification');
const replyPreview = document.getElementById('reply-preview');
const replySenderName = document.getElementById('reply-sender-name');
const replyTextPreview = document.getElementById('reply-text-preview');
const cancelReplyBtn = document.getElementById('cancel-reply-btn');

function showNotification(message, duration = 3000) {
    notification.textContent = message;
    notification.style.display = 'block';
    setTimeout(() => {
        notification.style.display = 'none';
    }, duration);
}

function getInitials(name) {
    return name.split(' ').map(word => word[0]).join('').toUpperCase();
}

function formatTime(timestamp) {
    const date = new Date(timestamp);
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
}

function showPage(page) {
    loginPage.classList.remove('active');
    chatsPage.classList.remove('active');
    chatPage.classList.remove('active');
    profilePage.classList.remove('active');
    page.classList.add('active');
}

async function registerUser(name) {
    try {
        const response = await fetch(`${API_BASE}/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name })
        });
        
        const data = await response.json();
        
        if (data.success) {
            loginUser(data.user);
            showNotification('🎉 Registrasi berhasil!');
        } else {
            showNotification(data.error || 'Gagal mendaftar');
        }
    } catch (error) {
        showNotification('⚠️ Error koneksi ke server');
    }
}

function loginUser(user) {
    currentUser = user;
    localStorage.setItem('currentUser', JSON.stringify(user));
    
    headerUserId.textContent = `ID: ${user.userId}`;
    profileAvatar.textContent = getInitials(user.name);
    profileName.textContent = user.name;
    profileId.textContent = user.userId;
    
    showPage(chatsPage);
    loadChatList();
}

function logout() {
    currentUser = null;
    localStorage.removeItem('currentUser');
    showPage(loginPage);
    nameInput.value = '';
}

async function searchUsers(query) {
    if (!query.trim()) {
        searchResults.classList.remove('active');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/users/${query}`);
        
        if (response.ok) {
            const user = await response.json();
            
            searchResults.innerHTML = '';
            const resultItem = document.createElement('div');
            resultItem.className = 'search-result-item';
            resultItem.innerHTML = `
                <div class="search-avatar">${getInitials(user.name)}</div>
                <div>
                    <div style="font-weight: 600;">${user.name}</div>
                    <div style="font-size: 12px; color: var(--text-light);">ID: ${user.userId}</div>
                </div>
            `;
            resultItem.addEventListener('click', () => {
                startChat(user);
                searchInput.value = '';
                searchResults.classList.remove('active');
            });
            searchResults.appendChild(resultItem);
            searchResults.classList.add('active');
        } else {
            showNoResults();
        }
    } catch (error) {
        showNoResults();
    }
}

function showNoResults() {
    searchResults.innerHTML = '';
    const noResult = document.createElement('div');
    noResult.className = 'search-result-item';
    noResult.style.justifyContent = 'center';
    noResult.style.color = 'var(--text-light)';
    noResult.textContent = 'Tidak ada pengguna dengan ID tersebut';
    searchResults.appendChild(noResult);
    searchResults.classList.add('active');
}

function startChat(user) {
    currentChatWith = user;
    chatWithName.textContent = user.name;
    chatWithAvatar.textContent = getInitials(user.name);
    showPage(chatPage);
    loadChatMessages();
    
    setTimeout(() => {
        messageInput.focus();
    }, 100);
}

async function loadChatList() {
    try {
        const response = await fetch(`${API_BASE}/chats/${currentUser.userId}`);
        const chats = await response.json();
        
        chatList.innerHTML = '';
        
        if (chats.length === 0) {
            const noChats = document.createElement('div');
            noChats.className = 'empty-state';
            noChats.innerHTML = `
                <div class="empty-state-icon">💬</div>
                <h3 style="margin-bottom: 10px; color: var(--text-secondary);">Belum ada percakapan</h3>
                <p style="color: var(--text-light);">Cari pengguna lain untuk memulai chat pertama Anda</p>
            `;
            chatList.appendChild(noChats);
        } else {
            chats.forEach(chat => {
                const chatItem = document.createElement('div');
                chatItem.className = 'chat-item';
                chatItem.innerHTML = `
                    <div class="chat-avatar">${getInitials(chat.user.name)}</div>
                    <div class="chat-info">
                        <div class="chat-name">${chat.user.name}</div>
                        <div class="chat-last-message">${chat.lastMessage.text}</div>
                    </div>
                    <div class="chat-timestamp">${formatTime(chat.lastMessage.timestamp)}</div>
                `;
                chatItem.addEventListener('click', () => startChat(chat.user));
                chatList.appendChild(chatItem);
            });
        }
    } catch (error) {
        console.error('Error loading chats:', error);
    }
}

async function loadChatMessages() {
    try {
        const response = await fetch(`${API_BASE}/messages/${currentUser.userId}/${currentChatWith.userId}`);
        const messages = await response.json();
        
        chatMessages.innerHTML = '';
        
        if (messages.length === 0) {
            const emptyState = document.createElement('div');
            emptyState.className = 'empty-state';
            emptyState.innerHTML = `
                <div class="empty-state-icon">💭</div>
                <p style="color: var(--text-light);">Mulai percakapan dengan mengirim pesan pertama</p>
            `;
            chatMessages.appendChild(emptyState);
        } else {
            messages.forEach(message => {
                const messageEl = createMessageElement(message);
                chatMessages.appendChild(messageEl);
            });
        }
        
        chatMessages.scrollTop = chatMessages.scrollHeight;
    } catch (error) {
        console.error('Error loading messages:', error);
    }
}

function createMessageElement(message) {
    const messageEl = document.createElement('div');
    messageEl.className = `message ${message.senderId === currentUser.userId ? 'sent' : 'received'}`;
    
    let contentHTML = '';
    
    if (message.replyTo) {
        const replySender = message.replyTo.senderId === currentUser.userId ? 'Anda' : currentChatWith.name;
        contentHTML += `
            <div class="reply-indicator">
                <div class="reply-sender">Membalas ${replySender}</div>
                <div class="reply-text">${message.replyTo.text}</div>
            </div>
        `;
    }
    
    if (message.text) {
        contentHTML += `<div>${message.text}</div>`;
    }
    
    contentHTML += `<div class="message-time">${formatTime(message.timestamp)}</div>`;
    
    if (message.senderId !== currentUser.userId) {
        contentHTML += `
            <div class="message-actions">
                <button class="message-action-btn" onclick="replyToMessage('${message._id}', '${message.text}')" title="Balas">
                    ↩
                </button>
            </div>
        `;
    }
    
    messageEl.innerHTML = contentHTML;
    return messageEl;
}

function replyToMessage(messageId, messageText) {
    const senderName = currentChatWith.name;
    replyingToMessage = { messageId, messageText };
    replySenderName.textContent = senderName;
    replyTextPreview.textContent = messageText.length > 50 ? messageText.substring(0, 50) + '...' : messageText;
    replyPreview.style.display = 'flex';
    messageInput.focus();
}

function cancelReply() {
    replyingToMessage = null;
    replyPreview.style.display = 'none';
}

async function sendMessage() {
    const text = messageInput.value.trim();
    
    if (!text && !replyingToMessage) return;
    
    try {
        const messageData = {
            senderId: currentUser.userId,
            receiverId: currentChatWith.userId,
            text: text
        };
        
        if (replyingToMessage) {
            messageData.replyTo = replyingToMessage;
        }
        
        const response = await fetch(`${API_BASE}/messages`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(messageData)
        });
        
        if (response.ok) {
            messageInput.value = '';
            cancelReply();
            loadChatMessages();
            loadChatList();
            showNotification('✅ Pesan terkirim!');
        } else {
            showNotification('❌ Gagal mengirim pesan');
        }
    } catch (error) {
        showNotification('⚠️ Error mengirim pesan');
    }
}

registerBtn.addEventListener('click', () => {
    const name = nameInput.value.trim();
    if (name) {
        registerUser(name);
    } else {
        showNotification('⚠️ Silakan masukkan nama Anda');
    }
});

profileBtn.addEventListener('click', () => {
    showPage(profilePage);
});

logoutBtn.addEventListener('click', logout);

searchInput.addEventListener('input', (e) => {
    searchUsers(e.target.value);
});

document.addEventListener('click', (e) => {
    if (!searchInput.contains(e.target) && !searchResults.contains(e.target)) {
        searchResults.classList.remove('active');
    }
});

chatBackBtn.addEventListener('click', () => {
    showPage(chatsPage);
    currentChatWith = null;
    cancelReply();
});

sendBtn.addEventListener('click', sendMessage);

messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        sendMessage();
    }
});

backFromProfileBtn.addEventListener('click', () => {
    showPage(chatsPage);
});

cancelReplyBtn.addEventListener('click', cancelReply);

function initApp() {
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
        const user = JSON.parse(savedUser);
        loginUser(user);
    }
}

document.addEventListener('DOMContentLoaded', initApp);

window.replyToMessage = replyToMessage;