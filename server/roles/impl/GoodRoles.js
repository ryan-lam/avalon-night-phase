const RoleBase = require('../RoleBase');

class Servant extends RoleBase {
    constructor() { super('Servant', 'Good'); }
    getKnowledge(gameState, selfPlayer) {
        return { role: this.name, alignment: this.alignment, info: [] };
    }
}

class UntrustworthyServant extends Servant {
    constructor() { super('Untrustworthy Servant', 'Good'); this.name = 'Untrustworthy Servant'; }

    getKnowledge(gameState, selfPlayer) {
        // Reveal 1 specific Evil player as configured by Host
        const targetRoleName = gameState.config && gameState.config.untrustworthySeeRole;
        if (!targetRoleName) return { role: this.name, alignment: this.alignment, info: [] };

        const seen = Object.values(gameState.players)
            .filter(p => p.role && p.role.name === targetRoleName)
            .map(p => ({ idx: p.idx, name: p.name, role: 'Evil' }));

        return { role: this.name, alignment: this.alignment, info: seen };
    }
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

        // Check for Untrustworthy Servant and add a warning message
        const hasUntrustworthy = Object.values(gameState.players).some(p => p.role && p.role.name === 'Untrustworthy Servant');

        // We'll append a special info item that the frontend handles (or just displays in list)
        // Alternatively, we can pass it as a separate property, but `info` is what's displayed.
        // Let's force it as a special item.
        if (hasUntrustworthy) {
            seen.push({ idx: -1, name: "WARNING", role: "One of the Evils is Untrustworthy Servant!" });
        }

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
