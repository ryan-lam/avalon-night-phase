const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
const cors = require('cors');
const gameManager = require('./gameManager');
const roleRegistry = require('./roles/RoleRegistry');

const app = express();
app.use(cors());

// Serve static files from the React app
app.use(express.static(path.join(__dirname, '../client/build')));

// Handle React routing, return all requests to React app
app.get(/.*/, (req, res) => {
    res.sendFile(path.join(__dirname, '../client/build', 'index.html'));
});

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*", // Allow all for dev/prod
        methods: ["GET", "POST"]
    }
});

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // --- Role List Request ---
    socket.on('get-roles', (callback) => {
        callback(roleRegistry.getAllRoles());
    });

    // --- Lobby Actions ---
    socket.on('create-lobby', ({ playerName }, callback) => {
        console.log(`Received create-lobby request from ${socket.id} (${playerName})`);
        try {
            const code = gameManager.createLobby(socket.id, playerName);
            console.log(`Lobby created: ${code}`);
            socket.join(code);

            // Fix: Emit lobby update so client switches view
            const lobby = gameManager.lobbies[code];
            io.to(code).emit('lobby-update', sanitizeLobby(lobby));

            callback({ success: true, code });
        } catch (e) {
            console.error('Error creating lobby:', e);
            callback({ success: false, error: e.message });
        }
    });

    socket.on('join-lobby', ({ code, playerName }, callback) => {
        try {
            const lobby = gameManager.joinLobby(code.toUpperCase(), socket.id, playerName);
            socket.join(lobby.code);
            io.to(lobby.code).emit('lobby-update', sanitizeLobby(lobby));

            // If game is in progress, send private knowledge to the rejoining player
            if (lobby.state === 'night_phase') {
                const knowledge = gameManager.getPlayerKnowledge(lobby.code, socket.id);
                socket.emit('game-started', knowledge);
            }

            callback({ success: true, lobby: sanitizeLobby(lobby) });
        } catch (e) {
            callback({ success: false, error: e.message });
        }
    });

    socket.on('update-lobby-settings', ({ code, config }) => {
        const lobby = gameManager.updateLobbyConfig(code, config);
        if (lobby) {
            io.to(code).emit('lobby-update', sanitizeLobby(lobby));
        }
    });

    socket.on('set-second-leader', ({ code, leader2Id }) => {
        try {
            const lobby = gameManager.setSecondLeader(code, leader2Id);

            // Now start the actual night phase - send private knowledge
            lobby.players.forEach(p => {
                const knowledge = gameManager.getPlayerKnowledge(code, p.socketId);
                io.to(p.socketId).emit('game-started', knowledge);
            });

            io.to(code).emit('lobby-update', sanitizeLobby(lobby));
        } catch (e) {
            console.error("Error setting second leader", e);
        }
    });

    socket.on('start-game', ({ code, roles }, callback) => {
        try {
            const lobby = gameManager.startGame(code, roles);

            // Send individual knowledge to each player
            lobby.players.forEach(p => {
                const knowledge = gameManager.getPlayerKnowledge(code, p.socketId);
                io.to(p.socketId).emit('game-started', knowledge);
            });

            io.to(code).emit('lobby-update', sanitizeLobby(lobby));
        } catch (e) {
            if (callback) callback({ success: false, error: e.message });
        }
    });

    socket.on('confirm-role', ({ code }) => {
        const lobby = gameManager.confirmPlayer(code, socket.id);
        if (lobby) {
            io.to(code).emit('lobby-update', sanitizeLobby(lobby));
        }
    });

    socket.on('reset-game', ({ code }) => {
        const lobby = gameManager.resetGame(code);
        if (lobby) {
            io.to(code).emit('game-reset');
            io.to(code).emit('lobby-update', sanitizeLobby(lobby));
        }
    });

    socket.on('kick-player', ({ code, targetId }) => {
        // Validation: verify requester is host? 
        // Ideally we check if socket.id is the host of the lobby 'code'
        const lobby = gameManager.lobbies[code];
        if (lobby && lobby.hostId === socket.id) {
            const result = gameManager.kickPlayer(code, targetId);
            if (result) {
                // Notify the kicked player
                io.to(targetId).emit('kicked');
                // Make sure they leave the socket room
                io.in(targetId).socketsLeave(code);

                // Update everyone else
                io.to(code).emit('lobby-update', sanitizeLobby(result.lobby));
            }
        }
    });

    socket.on('disconnect', () => {
        const result = gameManager.disconnectPlayer(socket.id);
        if (result) {
            io.to(result.code).emit('lobby-update', sanitizeLobby(result.lobby));
        }
    });
});

function sanitizeLobby(lobby) {
    // Remove secret info from public lobby state
    return {
        code: lobby.code,
        hostId: lobby.hostId,
        state: lobby.state,
        players: lobby.players.map(p => ({
            name: p.name,
            socketId: p.socketId,
            isHost: p.isHost,
            confirmed: p.confirmed,
            // DO NOT SEND ROLE HERE
        })),
        config: lobby.config, // Send config to everyone
        leader1: lobby.leader1 // Send leader1 ID so clients know who it is
    };
}

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
