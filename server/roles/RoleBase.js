class RoleBase {
    constructor(name, alignment, isUnique = false) {
        this.name = name;
        this.alignment = alignment; // 'Good' or 'Evil'
        this.isUnique = isUnique;
    }

    /**
     * Determines what this player sees during the night phase.
     * @param {Object} gameState - The current state of the game.
     * @param {Object} selfPlayer - The player object assigned this role.
     * @returns {Object} Knowledge object to send to the client.
     */
    getKnowledge(gameState, selfPlayer) {
        return {
            role: this.name,
            alignment: this.alignment,
            info: [] // Array of strings or objects describing what they see
        };
    }
}

module.exports = RoleBase;
