const RoleBase = require('../RoleBase');

class Servant extends RoleBase {
    constructor() { super('Servant', 'Good'); }
    getKnowledge(gameState, selfPlayer) {
        return { role: this.name, alignment: this.alignment, info: [] };
    }
}

class UntrustworthyServant extends Servant {
    constructor() { super('Untrustworthy Servant', 'Good'); this.name = 'Untrustworthy Servant'; }
    // Behaves like Servant (sees nothing).
    // Special logic: Appears as Evil to Merlin (handled in Merlin's logic).
}

class Merlin extends RoleBase {
    constructor() { super('Merlin', 'Good', true); }
    getKnowledge(gameState, selfPlayer) {
        const seen = Object.values(gameState.players)
            .filter(p => {
                if (p.socketId === selfPlayer.socketId) return false;
                if (!p.role) return false;

                // Merlin sees Evil, EXCEPT Mordred
                if (p.role.name === 'Mordred') return false;

                // Merlin sees Untrustworthy Servant as Evil (if that rule applies) or just sees them?
                // Usually "Untrustworthy Servant" implies they appear Evil to Merlin.
                if (p.role.name === 'Untrustworthy Servant') return true;

                // Standard Evil visibility
                return p.role.alignment === 'Evil';
            })
            .map(p => ({ idx: p.idx, name: p.name, role: 'Evil' }));
        return { role: this.name, alignment: this.alignment, info: seen };
    }
}

class Percival extends RoleBase {
    constructor() { super('Percival', 'Good', true); }
    getKnowledge(gameState, selfPlayer) {
        const seen = Object.values(gameState.players)
            .filter(p => {
                if (p.socketId === selfPlayer.socketId) return false;
                if (!p.role) return false;
                // Percival sees Merlin and Morgana as "Merlin"
                return p.role.name === 'Merlin' || p.role.name === 'Morgana';
            })
            .map(p => ({ idx: p.idx, name: p.name, role: 'Merlin / Morgana' }));
        return { role: this.name, alignment: this.alignment, info: seen };
    }
}

module.exports = { Servant, UntrustworthyServant, Merlin, Percival };
