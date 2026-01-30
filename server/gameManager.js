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

        // Check if player exists (Rejoin logic)
        const existingPlayer = lobby.players.find(p => p.name === playerName);
        if (existingPlayer) {
            existingPlayer.socketId = socketId;
            existingPlayer.connected = true;
            return lobby;
        }

        if (lobby.state !== 'waiting') throw new Error('Game already started');

        // Prevent duplicate names check is handled by reuse logic above
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

    disconnectPlayer(socketId) {
        // Find lobby
        for (const code in this.lobbies) {
            const lobby = this.lobbies[code];
            const player = lobby.players.find(p => p.socketId === socketId);
            if (player) {
                player.connected = false;
                // We DO NOT remove the player from the array, keeping them in the game
                return { code, lobby };
            }
        }
        return null;
    }

    // New explicit remove for manual leaving if needed, or cleanup
    kickPlayer(code, playerId) {
        const lobby = this.lobbies[code];
        if (!lobby) return null;

        const pIdx = lobby.players.findIndex(p => p.socketId === playerId);
        if (pIdx !== -1) {
            const removedPlayer = lobby.players[pIdx];
            lobby.players.splice(pIdx, 1);
            // Re-index
            lobby.players.forEach((p, i) => p.idx = i);
            return { lobby, removedPlayer };
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

        // 1. Shuffle players and/or roles
        // We randomize the assignment of roles to players.

        // Create full list including generics
        let allRoles = [...rolesList];

        // Add generics based on counts
        const config = lobby.config;
        if (config && config.genericCounts) {
            for (let i = 0; i < (config.genericCounts['Minion'] || 0); i++) allRoles.push('Minion');
            for (let i = 0; i < (config.genericCounts['Servant'] || 0); i++) allRoles.push('Servant');
        }

        if (allRoles.length !== lobby.players.length) {
            throw new Error(`Player count (${lobby.players.length}) does not match role count (${allRoles.length})`);
        }

        // Shuffle roles
        const shuffledRoles = this.shuffleArray([...allRoles]);

        // Assign roles
        let clericExists = false;
        lobby.players.forEach((p, i) => {
            const roleName = shuffledRoles[i];
            const roleInstance = roleRegistry.getRole(roleName);
            p.role = roleInstance;
            p.confirmed = false; // Reset confirmed status
            if (roleName === 'Cleric') clericExists = true;
        });

        // Use new Leader Selection phase if Cleric exists
        if (clericExists) {
            lobby.state = 'leader_selection';

            // Randomly pick Leader 1
            const randomIdx = Math.floor(Math.random() * lobby.players.length);
            lobby.leader1 = lobby.players[randomIdx].socketId; // Store socketId
            lobby.leader2 = null;
        } else {
            lobby.state = 'night_phase';
        }

        lobby.readyPlayers.clear();

        return lobby;
    }

    setSecondLeader(code, leader2Id) {
        const lobby = this.lobbies[code];
        if (!lobby) throw new Error('Lobby not found');

        // Validation: ensures leader2 != leader1 handled by frontend/logic?
        if (lobby.leader1 === leader2Id) {
            throw new Error("Leader 2 cannot be the same as Leader 1");
        }

        lobby.leader2 = leader2Id;
        lobby.state = 'night_phase';
        return lobby;
    }

    getPlayerKnowledge(code, socketId) {
        const lobby = this.lobbies[code];
        if (!lobby) return null;
        const player = lobby.players.find(p => p.socketId === socketId);
        if (!player || !player.role) return null;

        return player.role.getKnowledge(lobby, player);
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
