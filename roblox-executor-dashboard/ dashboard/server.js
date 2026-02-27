const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// Store connected players
let players = new Map();

io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);

    // Handle Roblox client connection
    socket.on('registerPlayer', (playerData) => {
        players.set(socket.id, {
            ...playerData,
            socketId: socket.id,
            joinTime: Date.now(),
            stats: {
                fps: 60,
                ping: 0,
                memory: 0
            }
        });
        
        io.emit('playerJoined', players.get(socket.id));
        io.emit('playerList', Array.from(players.values()));
    });

    // Update player stats
    socket.on('updateStats', (stats) => {
        if (players.has(socket.id)) {
            const player = players.get(socket.id);
            player.stats = stats;
            players.set(socket.id, player);
            
            io.emit('liveStats', {
                userId: player.userId,
                stats: stats
            });
        }
    });

    // Handle chat messages from Roblox
    socket.on('chatFromRoblox', (data) => {
        io.emit('chatMessage', {
            userId: data.userId,
            message: data.message,
            sender: 'Player'
        });
    });

    // Execute command from dashboard
    socket.on('executeCommand', (data) => {
        // Find the target player's socket
        let targetSocket = null;
        for (let [sid, player] of players.entries()) {
            if (player.userId === data.userId) {
                targetSocket = sid;
                break;
            }
        }
        
        if (targetSocket) {
            io.to(targetSocket).emit('executeCommand', {
                command: data.command,
                args: data.args
            });
        }
    });

    // Send announcement
    socket.on('announcement', (data) => {
        let targetSocket = null;
        for (let [sid, player] of players.entries()) {
            if (player.userId === data.userId) {
                targetSocket = sid;
                break;
            }
        }
        
        if (targetSocket) {
            io.to(targetSocket).emit('announcement', {
                message: data.message
            });
        }
    });

    // Join player
    socket.on('joinPlayer', (userId) => {
        let targetSocket = null;
        for (let [sid, player] of players.entries()) {
            if (player.userId === userId) {
                targetSocket = sid;
                break;
            }
        }
        
        if (targetSocket) {
            io.to(targetSocket).emit('joinRequest', {
                fromSocket: socket.id
            });
        }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
        if (players.has(socket.id)) {
            const player = players.get(socket.id);
            players.delete(socket.id);
            io.emit('playerLeft', player.userId);
            io.emit('playerList', Array.from(players.values()));
        }
        console.log('Client disconnected:', socket.id);
    });
});

const PORT = 3000;
server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
