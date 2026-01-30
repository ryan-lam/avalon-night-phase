const RoleBase = require('../RoleBase');

class Cleric extends RoleBase {
    constructor() { super('Cleric', 'Good', true); }
    getKnowledge(gameState, selfPlayer) {
        // Logic: 
        // Default: See alignment of First Leader (Player at index 0).
        // Custom: If Cleric is First Leader (index 0), see alignment of Player at index 1.

        const players = Object.values(gameState.players).sort((a, b) => a.idx - b.idx);
        if (players.length < 2) return { role: this.name, alignment: this.alignment, info: [] };

        let targetIdx = 0;
        if (selfPlayer.idx === 0) {
            targetIdx = 1;
        }

        const target = players[targetIdx];
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
