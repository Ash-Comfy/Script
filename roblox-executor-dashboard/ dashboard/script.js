const socket = io('http://localhost:3000');
let currentPlayer = null;
let players = new Map();

// DOM Elements
const playersContainer = document.getElementById('playersContainer');
const noPlayersMessage = document.getElementById('noPlayersMessage');
const playerModal = document.getElementById('playerModal');
const liveChatWindow = document.getElementById('liveChatWindow');

// Socket.IO Events
socket.on('connect', () => {
    console.log('Connected to server');
    updateConnectionStatus(true);
});

socket.on('disconnect', () => {
    console.log('Disconnected from server');
    updateConnectionStatus(false);
});

socket.on('playerList', (playerList) => {
    players.clear();
    playerList.forEach(player => players.set(player.userId, player));
    updatePlayersGrid();
});

socket.on('playerJoined', (player) => {
    players.set(player.userId, player);
    updatePlayersGrid();
    showNotification(`${player.username} joined`, 'success');
});

socket.on('playerLeft', (userId) => {
    players.delete(userId);
    updatePlayersGrid();
    showNotification('Player left', 'info');
});

socket.on('liveStats', (data) => {
    if (currentPlayer && data.userId === currentPlayer.userId) {
        updateLiveStats(data.stats);
    }
});

socket.on('chatMessage', (data) => {
    if (currentPlayer && data.userId === currentPlayer.userId) {
        addChatMessage(data.message, data.sender);
    }
});

// Update Functions
function updateConnectionStatus(connected) {
    const statusDot = document.querySelector('.status-dot');
    const connectionText = document.getElementById('connectionText');
    
    if (connected) {
        statusDot.style.background = '#4caf50';
        connectionText.textContent = 'Connected';
    } else {
        statusDot.style.background = '#f44336';
        connectionText.textContent = 'Disconnected';
    }
}

function updatePlayersGrid() {
    if (players.size === 0) {
        playersContainer.style.display = 'none';
        noPlayersMessage.style.display = 'block';
    } else {
        playersContainer.style.display = 'grid';
        noPlayersMessage.style.display = 'none';
        
        playersContainer.innerHTML = '';
        players.forEach(player => {
            const playerCard = createPlayerCard(player);
            playersContainer.appendChild(playerCard);
        });
    }
}

function createPlayerCard(player) {
    const card = document.createElement('div');
    card.className = 'player-card';
    card.onclick = () => openPlayerModal(player);
    
    card.innerHTML = `
        <img src="${player.avatar}" alt="${player.username}" class="player-avatar">
        <div class="player-info">
            <h3>${player.username}</h3>
            <p>User ID: ${player.userId}</p>
            <p>Server: ${player.serverId || 'Unknown'}</p>
            <p>Joined: ${new Date(player.joinTime).toLocaleTimeString()}</p>
        </div>
        <div class="player-stats">
            <span><i class="fas fa-chart-line"></i> ${player.stats?.fps || 0} FPS</span>
            <span><i class="fas fa-clock"></i> ${player.stats?.ping || 0} ms</span>
        </div>
    `;
    
    return card;
}

// Modal Functions
function openPlayerModal(player) {
    currentPlayer = player;
    document.getElementById('modalPlayerName').textContent = player.username;
    document.getElementById('modalPlayerUserId').textContent = player.userId;
    document.getElementById('modalPlayerAvatar').src = player.avatar;
    
    loadCommands('admin');
    playerModal.style.display = 'block';
}

function closeModal() {
    playerModal.style.display = 'none';
    currentPlayer = null;
}

// Command Functions
const commands = {
    admin: [
        'kick', 'ban', 'warn', 'mute', 'unmute',
        'freeze', 'unfreeze', 'kill', 'respawn',
        'teleport', 'bring', 'goto'
    ],
    player: [
        'godmode', 'invisible', 'fly', 'noclip',
        'speed', 'jumppower', 'gravity', 'health',
        'walkspeed', 'hipheight'
    ],
    world: [
        'time', 'weather', 'lighting', 'clear',
        'night', 'day', 'rain', 'thunder'
    ],
    fun: [
        'explode', 'fire', 'smoke', 'sparkles',
        'confetti', 'rainbow', 'spin', 'dance'
    ]
};

function loadCommands(category) {
    const container = document.getElementById('commandsContainer');
    container.innerHTML = '';
    
    commands[category].forEach(cmd => {
        const btn = document.createElement('button');
        btn.className = 'command-btn';
        btn.textContent = cmd;
        btn.onclick = () => executeCommand(cmd);
        container.appendChild(btn);
    });
}

function showCategory(category) {
    document.querySelectorAll('.category-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    event.target.classList.add('active');
    loadCommands(category);
}

function executeCommand(command) {
    if (!currentPlayer) return;
    
    socket.emit('executeCommand', {
        userId: currentPlayer.userId,
        command: command,
        args: prompt(`Enter arguments for ${command}:`) || ''
    });
    
    showNotification(`Executed ${command}`, 'success');
}

// Live Chat Functions
function toggleLiveChat() {
    if (liveChatWindow.style.display === 'none') {
        liveChatWindow.style.display = 'flex';
        loadChatHistory();
    } else {
        liveChatWindow.style.display = 'none';
    }
}

function closeLiveChat() {
    liveChatWindow.style.display = 'none';
}

function sendChatMessage() {
    const input = document.getElementById('chatMessageInput');
    const message = input.value.trim();
    
    if (message && currentPlayer) {
        socket.emit('sendChat', {
            userId: currentPlayer.userId,
            message: message
        });
        
        addChatMessage(message, 'You');
        input.value = '';
    }
}

function addChatMessage(message, sender) {
    const chatMessages = document.getElementById('chatMessages');
    const msgElement = document.createElement('div');
    msgElement.className = 'chat-message';
    msgElement.innerHTML = `<strong>${sender}:</strong> ${message}`;
    chatMessages.appendChild(msgElement);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Join Player
function joinPlayer() {
    if (currentPlayer) {
        socket.emit('joinPlayer', currentPlayer.userId);
        showNotification('Attempting to join player...', 'info');
    }
}

// Announcement
function openAnnouncementModal() {
    const message = prompt('Enter announcement message:');
    if (message && currentPlayer) {
        socket.emit('announcement', {
            userId: currentPlayer.userId,
            message: message
        });
        showNotification('Announcement sent', 'success');
    }
}

// Notification System
function showNotification(message, type) {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : 'info-circle'}"></i>
        <span>${message}</span>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    updatePlayersGrid();
    
    // Close modal when clicking outside
    window.onclick = (event) => {
        if (event.target === playerModal) {
            closeModal();
        }
    };
});
