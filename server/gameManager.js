const roleRegistry = require('./roles/RoleRegistry');

class GameManager {
    constructor() {
        this.lobbies = {}; // code -> lobby object
    }

    createLobby(hostSocketId, hostName) {
        const code = this.generateCode();
        this.lobbies[code] = {
            code,
            hostId: hostSocketId,
            players: [], // { socketId, name, idx, role, isHost }
            config: {
                roles: [], // Array of role names
                genericCounts: {
                    'Minion': 0,
                    'Servant': 0
                }
            },
            state: 'waiting', // waiting, night_phase, ready_check (or just part of night_phase)
            readyPlayers: new Set()
        };
        this.addPlayer(code, hostSocketId, hostName, true);
        return code;
    }

    joinLobby(code, socketId, playerName) {
        const lobby = this.lobbies[code];
        if (!lobby) throw new Error('Lobby not found');
        if (lobby.state !== 'waiting') throw new Error('Game already started');

        // Prevent duplicate names? For now, allow it but maybe append #?
        this.addPlayer(code, socketId, playerName, false);
        return lobby;
    }

    addPlayer(code, socketId, name, isHost) {
        const lobby = this.lobbies[code];
        const player = {
            socketId,
            name,
            isHost,
            idx: lobby.players.length,
            role: null,
            confirmed: false
        };
        lobby.players.push(player);
    }

    removePlayer(socketId) {
        // Find lobby
        for (const code in this.lobbies) {
            const lobby = this.lobbies[code];
            const pIdx = lobby.players.findIndex(p => p.socketId === socketId);
            if (pIdx !== -1) {
                lobby.players.splice(pIdx, 1);
                // Re-index remaining players
                lobby.players.forEach((p, i) => p.idx = i);

                // If host left, assign new host or delete
                if (lobby.players.length === 0) {
                    delete this.lobbies[code];
                } else if (lobby.hostId === socketId) {
                    lobby.players[0].isHost = true;
                    lobby.hostId = lobby.players[0].socketId;
                }
                return { code, lobby };
            }
        }
        return null;
    }

    updateLobbyConfig(code, config) {
        const lobby = this.lobbies[code];
        if (!lobby) return null;
        lobby.config = config;
        return lobby;
    }

    // rolesList: array of role names strings e.g. ['Merlin', 'Assassin', 'Servant', ...]
    startGame(code, rolesList) {
        const lobby = this.lobbies[code];
        if (!lobby) throw new Error('Lobby not found');
        if (rolesList.length !== lobby.players.length) {
            throw new Error(`Player count (${lobby.players.length}) does not match role count (${rolesList.length})`);
        }

        // 1. Shuffle players (to randomize Leader order)
        // Wait, normally people sit in a circle. We should probably NOT shuffle indices if they joined in order?
        // Actually, usually online you randomize the seating order or you randomize the roles.
        // Let's randomize the ROLES assigned to the players.

        // Create full list including generics
        let allRoles = [...rolesList];

        // Add generics based on counts
        const config = lobby.config;
        if (config && config.genericCounts) {
            for (let i = 0; i < (config.genericCounts['Minion'] || 0); i++) allRoles.push('Minion');
            for (let i = 0; i < (config.genericCounts['Servant'] || 0); i++) allRoles.push('Servant');
        }

        // Validate count
        // Note: rolesList passed here might be just the unique roles if we change frontend logic. 
        // But let's assume valid total count check needs to happen.

        if (allRoles.length !== lobby.players.length) {
            throw new Error(`Player count (${lobby.players.length}) does not match role count (${allRoles.length})`);
        }

        // Shuffle roles
        const shuffledRoles = this.shuffleArray([...allRoles]);

        // Assign roles
        lobby.players.forEach((p, i) => {
            const roleName = shuffledRoles[i];
            const roleInstance = roleRegistry.getRole(roleName);
            p.role = roleInstance;
            p.confirmed = false; // Reset confirmed status
        });

        lobby.state = 'night_phase';
        lobby.readyPlayers.clear();

        return lobby;
    }

    getPlayerKnowledge(code, socketId) {
        const lobby = this.lobbies[code];
        if (!lobby) return null;
        const player = lobby.players.find(p => p.socketId === socketId);
        if (!player || !player.role) return null;

        return player.role.getKnowledge({ players: lobby.players }, player);
    }

    confirmPlayer(code, socketId) {
        const lobby = this.lobbies[code];
        if (!lobby) return;
        const player = lobby.players.find(p => p.socketId === socketId);
        if (player) {
            player.confirmed = true;
            lobby.readyPlayers.add(socketId);
        }
        return lobby;
    }

    resetGame(code) {
        const lobby = this.lobbies[code];
        if (lobby) {
            lobby.state = 'waiting';
            lobby.players.forEach(p => {
                p.role = null;
                p.confirmed = false;
            });
            lobby.readyPlayers.clear();
        }
        return lobby;
    }

    generateCode() {
        return Math.random().toString(36).substring(2, 6).toUpperCase();
    }

    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }
}

module.exports = new GameManager();
