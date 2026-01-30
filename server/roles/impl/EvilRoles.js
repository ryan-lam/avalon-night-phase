const RoleBase = require('../RoleBase');

// Helper to check if a role is visible to Evil
function isVisibleToEvil(role) {
    if (!role) return false;
    // Oberon is unseen by other evil
    if (role.name === 'Oberon') return false;
    // All other Evil roles provided they are not hidden for some reason
    // Default: Evil sees Evil
    return role.alignment === 'Evil';
}

class Minion extends RoleBase {
    constructor() { super('Minion', 'Evil'); }
    getKnowledge(gameState, selfPlayer) {
        const seen = Object.values(gameState.players)
            .filter(p => p.socketId !== selfPlayer.socketId && isVisibleToEvil(p.role))
            .map(p => ({ idx: p.idx, name: p.name, role: 'Evil' }));
        return { role: this.name, alignment: this.alignment, info: seen };
    }
}

class Assassin extends Minion {
    constructor() { super('Assassin', 'Evil'); this.name = 'Assassin'; }
}

class EvilMessenger extends Minion {
    constructor() { super('Evil Messenger', 'Evil'); this.name = 'Evil Messenger'; }
}

class Morgana extends Minion {
    constructor() { super('Morgana', 'Evil', true); this.name = 'Morgana'; }
}

class Mordred extends Minion {
    constructor() { super('Mordred', 'Evil', true); this.name = 'Mordred'; }
}

class Oberon extends RoleBase {
    constructor() { super('Oberon', 'Evil', true); }
    getKnowledge(gameState, selfPlayer) {
        // Oberon sees nobody
        return { role: this.name, alignment: this.alignment, info: [] };
    }
}

class Lunatic extends Minion {
    constructor() { super('Lunatic', 'Evil', true); this.name = 'Lunatic'; }
    // Assuming Lunatic sees other Evil players just like a Minion
}

module.exports = { Minion, Assassin, Morgana, Mordred, Oberon, EvilMessenger, Lunatic };
