const roleRegistry = require('./roles/RoleRegistry');

class GameManager {
    constructor() {
        this.lobbies = {}; // code -> lobby object

        // Cleanup interval: check every hour
        setInterval(() => this.cleanupLobbies(), 60 * 60 * 1000);
    }

    cleanupLobbies() {
        const now = Date.now();
        const EXPIRATION_TIME = 6 * 60 * 60 * 1000; // 6 hours

        for (const code in this.lobbies) {
            const lobby = this.lobbies[code];
            if (now - lobby.createdAt > EXPIRATION_TIME) {
                console.log(`Lobby ${code} expired and deleted.`);
                delete this.lobbies[code];
            }
        }
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
            state: 'waiting', // waiting, night_phase, ready_check (or just part of night_phase)
            readyPlayers: new Set(),
            createdAt: Date.now()
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

            // Fix: If this player is the host, update the lobby's hostId
            if (existingPlayer.isHost) {
                lobby.hostId = socketId;
            }

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

            // Host Transfer Logic
            if (removedPlayer.isHost && lobby.players.length > 0) {
                const newHost = lobby.players[0];
                newHost.isHost = true;
                lobby.hostId = newHost.socketId;
                console.log(`Host transferred to ${newHost.name} (${newHost.socketId})`);
            }

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
    startGame(code, rolesList, genericCountsOverride) {
        const lobby = this.lobbies[code];
        if (!lobby) throw new Error('Lobby not found');
        if (rolesList.length !== lobby.players.length) {
            // Note: This check is premature because rolesList doesn't include generics yet.
            // But if ONLY generics are used, rolesList is empty. 
            // We should rely on the final check after adding generics.
        }

        // 1. Shuffle players and/or roles
        // We randomize the assignment of roles to players.

        // Create full list including generics
        let allRoles = [...rolesList];

        // Add generics based on override or config
        const finalGenericCounts = genericCountsOverride || (lobby.config && lobby.config.genericCounts) || {};

        console.log(`[startGame] Using Generic Counts:`, finalGenericCounts);

        const minionCount = finalGenericCounts['Minion'] || 0;
        const servantCount = finalGenericCounts['Servant'] || 0;

        if (minionCount > 0 || servantCount > 0) {
            console.log(`[startGame] Adding ${minionCount} Minions and ${servantCount} Servants`);
            for (let i = 0; i < minionCount; i++) allRoles.push('Minion');
            for (let i = 0; i < servantCount; i++) allRoles.push('Servant');
        }

        console.log(`[startGame] Final Roles List (${allRoles.length}):`, allRoles);

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

        const knowledge = player.role.getKnowledge(lobby, player);
        if (knowledge && knowledge.info && Array.isArray(knowledge.info)) {
            // Shuffle the info array to prevent pattern recognition
            this.shuffleArray(knowledge.info);
        }
        return knowledge;
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
