const RoleBase = require('../RoleBase');

class Cleric extends RoleBase {
    constructor() { super('Cleric', 'Good', true); }
    getKnowledge(gameState, selfPlayer) {
        // Logic: 
        // 1. Identify Leader 1 and Leader 2 from gameState (lobby)
        // 2. If Cleric is Leader 1, check Leader 2's alignment.
        // 3. If Cleric is NOT Leader 1, check Leader 1's alignment.

        // Note: gameState has 'players' array. Leader IDs are in gameState (the lobby object passed in)
        // Wait, the caller is `gameManager.getPlayerKnowledge(code, socketId)`.
        // It passes `lobby.players` wrapped in object: `{ players: lobby.players }`.
        // I need to change the caller to pass the whole lobby or pass leaders.
        // Let's assume I fix the caller to pass the full lobby as gameState.

        const leader1Id = gameState.leader1;
        const leader2Id = gameState.leader2;

        if (!leader1Id || !leader2Id) return { role: this.name, alignment: this.alignment, info: [] };

        let targetId = leader1Id;
        if (selfPlayer.socketId === leader1Id) {
            targetId = leader2Id;
        }

        const target = Object.values(gameState.players).find(p => p.socketId === targetId);

        if (!target) return { role: this.name, alignment: this.alignment, info: [] };

        const info = [{ idx: target.idx, name: target.name, role: target.role.alignment }];

        return { role: this.name, alignment: this.alignment, info: info };
    }
}

class JrMessenger extends RoleBase {
    constructor() { super('Jr Messenger', 'Good', true); }
    getKnowledge(gameState, selfPlayer) {
        // Sees Sr Messenger
        const seen = Object.values(gameState.players)
            .filter(p => p.role && p.role.name === 'Sr Messenger')
            .map(p => ({ idx: p.idx, name: p.name, role: 'Sr Messenger' }));
        return { role: this.name, alignment: this.alignment, info: seen };
    }
}

class SrMessenger extends RoleBase {
    constructor() { super('Sr Messenger', 'Good', true); }
    getKnowledge(gameState, selfPlayer) {
        // Sees Jr Messenger
        const seen = Object.values(gameState.players)
            .filter(p => p.role && p.role.name === 'Jr Messenger')
            .map(p => ({ idx: p.idx, name: p.name, role: 'Jr Messenger' }));
        return { role: this.name, alignment: this.alignment, info: seen };
    }
}

module.exports = { Cleric, JrMessenger, SrMessenger };
